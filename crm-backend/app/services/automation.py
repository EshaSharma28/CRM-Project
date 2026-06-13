"""Abandoned-cart recovery — a standing, event-triggered automation.

Unlike batch campaigns (send-now), this is a rule that runs CONTINUOUSLY on live
data: a background worker simulates a live storefront (shoppers add to cart; some
check out, most abandon), and for carts abandoned past a threshold it fires a
"your cart is waiting" message through the SAME channel loop as everything else.
Recovered purchases arrive via the normal attribution path (a clicked recovery
message converts), so recovery revenue/ROI is measured, not invented.

Time is COMPRESSED for the demo: "2 hours" -> ~45s so the loop is watchable.
"Live data" is simulated (no real storefront). At scale this is a durable
scheduler + event bus rather than an in-process loop — a conscious tradeoff.
"""
from __future__ import annotations

import random
import threading
import time
from datetime import datetime, timedelta, timezone

from app.database import SessionLocal
from app.models import Automation, Campaign, CartEvent, Communication, Customer, Order
from app.services.campaign_service import _recipient, render_message
from app.services.channel_client import dispatch_batch

# Compressed timings.
TICK_SECONDS = 8
ABANDON_AFTER = timedelta(seconds=45)   # open cart older than this = abandoned
NEW_CARTS_PER_TICK = (2, 5)
SELF_PURCHASE_PROB = 0.10               # per tick: open cart checks out on its own

CART_PRODUCTS = [
    ("Ethiopia Single-Origin 250g", 650), ("House Blend 1kg", 1500),
    ("Cold Brew Kit", 1200), ("Pour-Over Starter Set", 2200),
    ("Monthly Bean Subscription", 900), ("Oat Milk Latte Pods", 750),
    ("Ceramic Dripper", 1400),
]
DEFAULT_MESSAGE = (
    "Hi {first_name}, your {product} is still waiting in your cart ☕ "
    "Complete your order now and enjoy 10% off!"
)

_rng = random.Random()
_started = False
_lock = threading.Lock()


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ensure_automation(db) -> Automation:
    """Get-or-create the abandoned-cart automation + the campaign its recovery
    messages attach to (so they flow through normal stats/attribution)."""
    auto = db.get(Automation, "abandoned_cart")
    if auto is None:
        camp = Campaign(
            name="Abandoned Cart Recovery", channel="whatsapp",
            message_template="(automation)", status="sent",
        )
        db.add(camp)
        db.commit()
        db.refresh(camp)
        auto = Automation(
            key="abandoned_cart", name="Abandoned Cart Recovery", enabled=True,
            delay_label="2 hours", channel="whatsapp", message_template=DEFAULT_MESSAGE,
            campaign_id=camp.id,
        )
        db.add(auto)
        db.commit()
    return auto


def _record_order(db, customer: Customer, product: str, amount: float, when: datetime) -> Order:
    order = Order(customer_id=customer.id, product=product, amount=round(amount, 2),
                  is_subscription=False, used_discount=False, ordered_at=when)
    db.add(order)
    db.flush()
    customer.order_count += 1
    customer.total_spent = round(customer.total_spent + amount, 2)
    customer.last_order_date = when
    customer.lifecycle_stage = "active"
    return order


def tick(db) -> None:
    """One automation cycle: generate carts, self-purchase, recover, detect wins."""
    auto = ensure_automation(db)
    if not auto.enabled:
        return
    now = _now()

    # 1. Live storefront: new carts.
    customer_ids = [c for (c,) in db.query(Customer.id).all()]
    if customer_ids:
        for _ in range(_rng.randint(*NEW_CARTS_PER_TICK)):
            product, price = _rng.choice(CART_PRODUCTS)
            db.add(CartEvent(
                customer_id=_rng.choice(customer_ids), product=product,
                amount=round(price * _rng.uniform(0.9, 1.6), 2), created_at=now, status="open",
            ))
        db.commit()

    # 2. Some open carts self-checkout (no recovery needed).
    for cart in db.query(CartEvent).filter(CartEvent.status == "open").all():
        if _rng.random() < SELF_PURCHASE_PROB:
            customer = db.get(Customer, cart.customer_id)
            if customer:
                _record_order(db, customer, cart.product, cart.amount, now)
            cart.status = "purchased"
    db.commit()

    # 3. Fire recovery for abandoned carts (respect opt-out).
    cutoff = now - ABANDON_AFTER
    abandoned = (
        db.query(CartEvent).join(Customer, Customer.id == CartEvent.customer_id)
        .filter(CartEvent.status == "open", CartEvent.created_at < cutoff,
                Customer.opt_out.is_(False))
        .limit(50).all()
    )
    jobs = []
    for cart in abandoned:
        customer = db.get(Customer, cart.customer_id)
        if customer is None:
            continue
        msg = render_message(auto.message_template, customer).replace("{product}", cart.product)
        comm = Communication(
            campaign_id=auto.campaign_id, customer_id=customer.id, channel=auto.channel,
            rendered_message=msg, variant="A", status="queued",
        )
        db.add(comm)
        db.flush()
        cart.status = "recovery_sent"
        cart.recovery_communication_id = comm.id
        jobs.append({"communication_id": comm.id, "recipient": _recipient(customer, auto.channel),
                     "message": msg, "channel": auto.channel})
    db.commit()
    if jobs:
        dispatch_batch(jobs)

    # 4. Detect recoveries: a recovery message that converted (got an attributed
    #    order via the normal channel attribution path) means we won the cart back.
    for cart in db.query(CartEvent).filter(CartEvent.status == "recovery_sent").all():
        comm = db.get(Communication, cart.recovery_communication_id)
        if comm and comm.attributed_order_id:
            cart.status = "recovered"
            cart.recovered_order_id = comm.attributed_order_id
    db.commit()


def _run_loop() -> None:
    while True:
        db = SessionLocal()
        try:
            tick(db)
        except Exception as e:  # keep the worker alive on transient errors
            print(f"[automation] tick error: {e}")
        finally:
            db.close()
        time.sleep(TICK_SECONDS)


def start() -> None:
    """Start the automation worker once (idempotent)."""
    global _started
    with _lock:
        if _started:
            return
        _started = True
        threading.Thread(target=_run_loop, daemon=True, name="automation-worker").start()
