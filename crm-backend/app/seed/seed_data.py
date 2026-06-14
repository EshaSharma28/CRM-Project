"""Persona-driven synthetic data generator for Brewhaus.

NOT random rows — customers are sampled from behavioural archetypes so that
AI segmentation finds real, interesting clusters (win-back, VIPs, lapsed, etc.).
This is the engine behind an impressive demo.

Run:  python -m app.seed.seed_data            # default 500 customers
      python -m app.seed.seed_data 2000       # crank the volume

Personas (and the segment each one makes demoable):
  loyal_subscriber  -> VIPs / champions       (active, high spend)
  lapsing_regular   -> WIN-BACK   (the hero)   (was regular, went quiet 60-100d)
  one_time_tryer    -> reactivation            (single old order)
  discount_hunter   -> promo-sensitive         (only buys on discount)
  new_promising     -> nurture / onboarding    (just joined, trending up)
  seasonal_gifter   -> holiday campaign        (buys only around December)

Lifecycle stage is COMPUTED from the generated orders (recency + tenure), not
hard-coded per persona — so it's defensible as a real derived field. `persona`
is stored only so we can eyeball that clusters landed where we intended.
"""
from __future__ import annotations

import random
import sys
from datetime import datetime, timedelta, timezone

from faker import Faker

from app.database import Base, SessionLocal, engine
from app.models import Customer, Order
from app.services.derive import avg_gap as _avg_gap
from app.services.derive import compute_lifecycle as _compute_lifecycle

fake = Faker("en_IN")

# Reproducible runs — same seed => same dataset (good for demos & debugging).
SEED = 42

CITIES = ["Mumbai", "Bengaluru", "Delhi", "Pune", "Hyderabad", "Chennai", "Kolkata"]
CHANNELS = ["whatsapp", "email", "sms"]

PRODUCT_PRICES = {
    "Ethiopia Single-Origin 250g": 650,
    "Colombia Decaf 250g": 600,
    "House Blend 1kg": 1500,
    "Cold Brew Kit": 1200,
    "Pour-Over Starter Set": 2200,
    "Monthly Bean Subscription": 900,
    "Oat Milk Latte Pods": 750,
    "Ceramic Dripper": 1400,
}
BEANS = [p for p in PRODUCT_PRICES if "250g" in p or "1kg" in p or "Pods" in p]
GEAR = ["Cold Brew Kit", "Pour-Over Starter Set", "Ceramic Dripper"]
SUBSCRIPTION = "Monthly Bean Subscription"

# Relative mix of personas across the customer base.
PERSONA_WEIGHTS = {
    "loyal_subscriber": 0.15,
    "lapsing_regular": 0.20,
    "one_time_tryer": 0.20,
    "discount_hunter": 0.15,
    "new_promising": 0.15,
    "seasonal_gifter": 0.15,
}


def _price(product: str, used_discount: bool, rng: random.Random) -> float:
    base = PRODUCT_PRICES[product]
    jitter = rng.uniform(0.95, 1.10)
    amount = base * jitter
    if used_discount:
        amount *= 0.80  # 20% promo
    return round(amount, 2)


def _order(product, ordered_at, rng, *, sub=False, discount=False) -> dict:
    return {
        "product": product,
        "amount": _price(product, discount, rng),
        "is_subscription": sub,
        "used_discount": discount,
        "ordered_at": ordered_at,
    }


def _gen_profile(persona: str, ref: datetime, rng: random.Random):
    """Return (signup_date, [order dicts]) for one persona instance."""
    orders: list[dict] = []

    if persona == "loyal_subscriber":
        n = rng.randint(8, 24)
        signup = ref - timedelta(days=30 * n + rng.randint(10, 120))
        d = ref - timedelta(days=rng.randint(2, 22))  # last order recent
        for _ in range(n):
            product = SUBSCRIPTION if rng.random() < 0.7 else rng.choice(BEANS)
            orders.append(_order(product, d, rng, sub=(product == SUBSCRIPTION)))
            d -= timedelta(days=rng.randint(26, 34))  # ~monthly cadence

    elif persona == "lapsing_regular":
        n = rng.randint(5, 12)
        # Was a regular, but last order was 60-100 days ago -> at risk.
        d = ref - timedelta(days=rng.randint(60, 100))
        signup = d - timedelta(days=35 * n + rng.randint(0, 60))
        for _ in range(n):
            product = rng.choice(BEANS + [SUBSCRIPTION])
            orders.append(_order(product, d, rng, sub=(product == SUBSCRIPTION)))
            d -= timedelta(days=rng.randint(30, 42))

    elif persona == "one_time_tryer":
        d = ref - timedelta(days=rng.randint(90, 300))
        signup = d - timedelta(days=rng.randint(0, 10))
        orders.append(_order(rng.choice(BEANS + GEAR), d, rng))

    elif persona == "discount_hunter":
        n = rng.randint(3, 8)
        d = ref - timedelta(days=rng.randint(10, 80))
        signup = d - timedelta(days=50 * n + rng.randint(0, 90))
        for _ in range(n):
            discount = rng.random() < 0.85
            orders.append(_order(rng.choice(BEANS + GEAR), d, rng, discount=discount))
            d -= timedelta(days=rng.randint(20, 70))

    elif persona == "new_promising":
        signup = ref - timedelta(days=rng.randint(3, 45))
        n = rng.randint(1, 3)
        d = ref - timedelta(days=rng.randint(1, 15))
        for _ in range(n):
            orders.append(_order(rng.choice(BEANS), d, rng))
            d -= timedelta(days=rng.randint(8, 20))
            if d < signup:
                break

    elif persona == "seasonal_gifter":
        # Buys gifts around December; otherwise silent.
        signup = ref - timedelta(days=rng.randint(400, 900))
        for years_ago in (0, 1):
            dec_year = ref.year - 1 if ref.month < 12 else ref.year
            dec = datetime(dec_year - years_ago, 12, rng.randint(5, 22))
            if dec < signup or dec > ref:
                continue
            for _ in range(rng.randint(1, 2)):
                orders.append(_order(rng.choice(GEAR + BEANS), dec, rng, discount=True))
                dec -= timedelta(days=rng.randint(1, 5))

    else:  # pragma: no cover
        raise ValueError(persona)

    if not orders:  # safety: ensure at least one order
        d = ref - timedelta(days=rng.randint(30, 200))
        signup = d - timedelta(days=5)
        orders.append(_order(rng.choice(BEANS), d, rng))

    return signup, orders


def _weighted_personas(n: int, rng: random.Random) -> list[str]:
    keys = list(PERSONA_WEIGHTS)
    weights = [PERSONA_WEIGHTS[k] for k in keys]
    return rng.choices(keys, weights=weights, k=n)


def seed(num_customers: int = 500, reset: bool = True) -> None:
    """Generate num_customers persona-driven customers and their orders."""
    rng = random.Random(SEED)
    Faker.seed(SEED)
    ref = datetime.now(timezone.utc).replace(tzinfo=None)

    if reset:
        Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        personas = _weighted_personas(num_customers, rng)
        counts: dict[str, int] = {}

        for persona in personas:
            signup, raw_orders = _gen_profile(persona, ref, rng)
            order_dates = [o["ordered_at"] for o in raw_orders]
            total = round(sum(o["amount"] for o in raw_orders), 2)
            last = max(order_dates) if order_dates else None
            lifecycle = _compute_lifecycle(signup, last, len(raw_orders), ref)

            # ~3% of shoppers have a birthday TODAY (so the birthday automation
            # has someone to celebrate in a live demo); rest spread across the year.
            if rng.random() < 0.03:
                dob = ref.replace(year=rng.randint(1962, 2005))
            else:
                dob = datetime(rng.randint(1962, 2005), rng.randint(1, 12), rng.randint(1, 28))

            customer = Customer(
                name=fake.name(),
                email=fake.unique.email(),
                phone=fake.phone_number(),
                city=rng.choice(CITIES),
                channel_pref=rng.choices(CHANNELS, weights=[0.5, 0.35, 0.15])[0],
                signup_date=signup,
                dob=dob,
                gender=rng.choices(["female", "male", "other"], weights=[0.49, 0.48, 0.03])[0],
                persona=persona,
                total_spent=total,
                order_count=len(raw_orders),
                last_order_date=last,
                avg_days_between_orders=_avg_gap(order_dates),
                lifecycle_stage=lifecycle,
            )
            customer.orders = [Order(**o) for o in raw_orders]
            db.add(customer)
            counts[lifecycle] = counts.get(lifecycle, 0) + 1

        db.commit()

        # RFM scoring is relative to the whole base, so compute it once seeded.
        from app.services.rfm import recompute_rfm

        recompute_rfm(db)

        total_orders = db.query(Order).count()
        print(f"Seeded {num_customers} customers, {total_orders} orders.")
        print("Lifecycle distribution:", dict(sorted(counts.items())))
    finally:
        fake.unique.clear()
        db.close()


if __name__ == "__main__":
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 500
    seed(n)
