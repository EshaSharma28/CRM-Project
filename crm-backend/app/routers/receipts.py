"""Receipt API — the async callback target the channel service POSTs to.

This is the heart of the system-design story. Properties enforced here:
  - Idempotent: event_id is the PK of communication_events, so replays are
    dropped by the database (we return 200 'duplicate', never double-count).
  - Order-tolerant: events can arrive in any order. We only ever advance the
    communication's status FORWARD (by rank) and stamp each timestamp once, so a
    late 'delivered' arriving after 'clicked' can't regress state.
  - Cheap: just updates one row + appends a log row. Aggregation happens at read
    time in /campaigns/{id}/stats.
  - Attribution: a 'clicked' may convert — we create an attributed Order to model
    the brief's "order came because of this communication" signal.
"""
import random
from datetime import datetime
import hmac
import hashlib

from fastapi import APIRouter, Depends, HTTPException, Request, Header
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Campaign, Communication, CommunicationEvent, Customer, Order
from app.schemas import ReceiptEvent

router = APIRouter(prefix="/receipts", tags=["receipts"])

# Monotonic rank — status only ever moves up this ladder.
STATUS_RANK = {
    "queued": 0,
    "sent": 1,
    "delivered": 2,
    "opened": 3,
    "read": 4,
    "clicked": 5,
}
TIMESTAMP_FIELD = {
    "sent": "sent_at",
    "delivered": "delivered_at",
    "opened": "opened_at",
    "read": "read_at",
    "clicked": "clicked_at",
    "failed": "failed_at",
}
# Attribution model — last-touch, within an attribution window, with a
# conversion probability that depends on engagement depth AND the customer's
# propensity (their RFM segment). Order amounts are drawn from the customer's
# OWN average order value, not a constant. This makes revenue/ROI realistic and
# customer-dependent rather than a flat coin-flip.
#
# Tradeoff that remains: this is single-channel last-touch. Real attribution
# needs multi-touch modelling + identity resolution + incrementality testing.
ATTRIBUTION_WINDOW_DAYS = 7
BASE_CONVERSION = {"clicked": 0.22, "opened": 0.05}  # engagement depth -> base P
RFM_PROPENSITY = {
    "Champions": 2.0, "Loyal": 1.6, "Potential Loyalist": 1.2, "New": 1.0,
    "Promising": 1.0, "Needs Attention": 0.85, "At Risk": 0.7,
    "Can't Lose Them": 1.1, "Hibernating": 0.45, "Lost": 0.25,
}
CONVERSION_PRODUCTS = [
    "Ethiopia Single-Origin 250g", "House Blend 1kg", "Cold Brew Kit",
    "Monthly Bean Subscription", "Oat Milk Latte Pods",
]


def _apply_forward_only(comm: Communication, event_type: str, occurred_at: datetime):
    field = TIMESTAMP_FIELD[event_type]
    if getattr(comm, field) is None:
        setattr(comm, field, occurred_at)
    if event_type == "failed":
        comm.status = "failed"
    elif comm.status != "failed":
        if STATUS_RANK[event_type] > STATUS_RANK.get(comm.status, 0):
            comm.status = event_type


def _maybe_attribute_order(
    comm: Communication, event_type: str, occurred_at: datetime, db: Session
):
    """Model a conversion (last-touch, within the attribution window).

    Probability = base(engagement depth) × propensity(RFM segment). Amount is
    sampled from the customer's historical average order value.
    """
    if comm.attributed_order_id is not None:
        return
    base = BASE_CONVERSION.get(event_type)
    if base is None:
        return

    customer = db.get(Customer, comm.customer_id)
    if customer is None:
        return

    propensity = RFM_PROPENSITY.get(customer.rfm_segment, 1.0)
    prob = min(0.9, base * propensity)

    rng = random.Random(f"attr-{comm.id}-{event_type}")
    if rng.random() >= prob:
        return

    # Order amount ~ the customer's own average order value, with variance.
    avg_value = (
        customer.total_spent / customer.order_count if customer.order_count else 850.0
    )
    amount = round(avg_value * rng.uniform(0.6, 1.5), 2)

    order = Order(
        customer_id=comm.customer_id,
        product=rng.choice(CONVERSION_PRODUCTS),
        amount=amount,
        is_subscription=False,
        used_discount=False,
        ordered_at=occurred_at,  # within ATTRIBUTION_WINDOW_DAYS of the touch
    )
    db.add(order)
    db.flush()
    comm.attributed_order_id = order.id

    # keep customer aggregates consistent with the new order
    customer.order_count += 1
    customer.total_spent = round(customer.total_spent + amount, 2)
    customer.last_order_date = occurred_at
    customer.lifecycle_stage = "active"


def ingest_event(
    db: Session, event_id: str, communication_id: int, event_type: str, occurred_at: datetime
) -> str:
    """Apply one engagement event idempotently. Returns "ok" | "duplicate" | "unknown".

    Shared by the live callback endpoint AND the reconciliation sweep, so recovered
    events go through exactly the same dedupe + forward-only + attribution path.
    """
    if event_type not in TIMESTAMP_FIELD:
        return "unknown"
    if db.get(CommunicationEvent, event_id):  # idempotency by PK
        return "duplicate"
    comm = db.get(Communication, communication_id)
    if comm is None:
        return "unknown"

    db.add(
        CommunicationEvent(
            event_id=event_id,
            communication_id=communication_id,
            event_type=event_type,
            occurred_at=occurred_at,
        )
    )
    _apply_forward_only(comm, event_type, occurred_at)
    if event_type in ("clicked", "opened"):
        _maybe_attribute_order(comm, event_type, occurred_at, db)
    db.commit()
    return "ok"


@router.post("")
async def ingest_receipt(
    request: Request,
    x_hub_signature: str = Header(None),
    db: Session = Depends(get_db)
):
    """Ingest one engagement event from the channel service (async callback).

    The channel signs each callback with a shared-secret HMAC; we verify it over
    the RAW request bytes before trusting the event — so a forged receipt is
    rejected. (Reconciliation calls ingest_event() directly, bypassing HTTP.)
    """
    from app.config import settings

    payload_bytes = await request.body()
    if not x_hub_signature or not x_hub_signature.startswith("sha256="):
        raise HTTPException(401, "Missing or invalid signature header")
    expected = hmac.new(settings.webhook_secret.encode(), payload_bytes, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(x_hub_signature.removeprefix("sha256="), expected):
        raise HTTPException(401, "Invalid signature")

    event = ReceiptEvent.model_validate_json(payload_bytes)

    occurred_at = datetime.fromisoformat(event.occurred_at).replace(tzinfo=None)
    result = ingest_event(
        db, event.event_id, event.communication_id, event.event_type, occurred_at
    )
    if result == "unknown":
        raise HTTPException(404, "Communication not found or unknown event type")
    return {"status": result}


@router.get("/events")
def list_recent_events(limit: int = 50, db: Session = Depends(get_db)):
    """Fetch the real webhook event log, joined with campaign metadata."""
    rows = (
        db.query(CommunicationEvent, Communication, Campaign)
        .join(Communication, Communication.id == CommunicationEvent.communication_id)
        .join(Campaign, Campaign.id == Communication.campaign_id)
        .order_by(CommunicationEvent.occurred_at.desc())
        .limit(limit)
        .all()
    )
    
    return [
        {
            "id": event.event_id,
            "campaignName": campaign.name,
            "channel": communication.channel,
            "type": event.event_type,
            "timestamp": event.occurred_at.isoformat()
        }
        for event, communication, campaign in rows
    ]


@router.post("/reconcile")
def run_reconcile(db: Session = Depends(get_db)):
    """Sweep for communications with lost callbacks and recover them from the
    channel's source of truth. Safe to run repeatedly (idempotent)."""
    from app.services.reconcile import reconcile

    return reconcile(db)
