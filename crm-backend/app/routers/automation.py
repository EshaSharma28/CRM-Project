"""Automations API — abandoned-cart recovery status, stats, toggle, cart feed."""
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func
from sqlalchemy.orm import Session

from datetime import datetime, timezone

from app.database import get_db
from app.models import CartEvent, Customer
from app.routers.campaigns import campaign_stats
from app.services.automation import ensure_automation, ensure_birthday

router = APIRouter(prefix="/automations", tags=["automations"])


class ToggleIn(BaseModel):
    enabled: bool


@router.get("/abandoned-cart")
def abandoned_cart(db: Session = Depends(get_db)):
    auto = ensure_automation(db)

    counts = dict(
        db.query(CartEvent.status, func.count()).group_by(CartEvent.status).all()
    )
    total = sum(counts.values())
    recovery_sent = counts.get("recovery_sent", 0) + counts.get("recovered", 0)
    recovered = counts.get("recovered", 0)

    stats = campaign_stats(auto.campaign_id, db) if auto.campaign_id else {}

    return {
        "key": auto.key,
        "name": auto.name,
        "enabled": auto.enabled,
        "delay_label": auto.delay_label,
        "channel": auto.channel,
        "message_template": auto.message_template,
        "carts": {
            "total": total,
            "open": counts.get("open", 0),
            "purchased": counts.get("purchased", 0),
            "recovery_sent": recovery_sent,
            "recovered": recovered,
        },
        "recovery_rate": round(recovered / recovery_sent * 100) if recovery_sent else 0,
        "recovery_stats": {
            "sent": stats.get("sent", 0),
            "delivered": stats.get("delivered", 0),
            "opened": stats.get("opened", 0),
            "clicked": stats.get("clicked", 0),
            "orders_attributed": stats.get("orders_attributed", 0),
            "attributed_revenue": stats.get("attributed_revenue", 0),
            "roi_pct": stats.get("roi_pct"),
        },
    }


@router.get("/birthday")
def birthday(db: Session = Depends(get_db)):
    auto = ensure_birthday(db)
    now = datetime.now(timezone.utc).replace(tzinfo=None)

    # Count today's birthdays (month/day match) — done in Python for db-portability.
    dobs = db.query(Customer.dob).filter(Customer.dob.isnot(None)).all()
    today = sum(1 for (d,) in dobs if d and (d.month, d.day) == (now.month, now.day))

    stats = campaign_stats(auto.campaign_id, db) if auto.campaign_id else {}
    return {
        "key": auto.key,
        "name": auto.name,
        "enabled": auto.enabled,
        "delay_label": auto.delay_label,
        "channel": auto.channel,
        "message_template": auto.message_template,
        "birthdays_today": today,
        "stats": {
            "sent": stats.get("sent", 0),
            "delivered": stats.get("delivered", 0),
            "opened": stats.get("opened", 0),
            "clicked": stats.get("clicked", 0),
            "orders_attributed": stats.get("orders_attributed", 0),
            "attributed_revenue": stats.get("attributed_revenue", 0),
        },
    }


@router.post("/birthday/toggle")
def toggle_birthday(payload: ToggleIn, db: Session = Depends(get_db)):
    auto = ensure_birthday(db)
    auto.enabled = payload.enabled
    db.commit()
    return {"enabled": auto.enabled}


@router.post("/abandoned-cart/toggle")
def toggle(payload: ToggleIn, db: Session = Depends(get_db)):
    auto = ensure_automation(db)
    auto.enabled = payload.enabled
    db.commit()
    return {"enabled": auto.enabled}


@router.get("/abandoned-cart/carts")
def recent_carts(limit: int = 25, db: Session = Depends(get_db)):
    rows = (
        db.query(CartEvent, Customer)
        .join(Customer, Customer.id == CartEvent.customer_id)
        .order_by(CartEvent.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": cart.id,
            "customer": cust.name,
            "product": cart.product,
            "amount": cart.amount,
            "status": cart.status,
            "created_at": cart.created_at.isoformat(),
        }
        for cart, cust in rows
    ]
