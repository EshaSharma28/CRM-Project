"""Customer & ingest endpoints + a summary used to verify clustering / demo."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer
from app.schemas import CustomerOut

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerOut])
def list_customers(
    limit: int = Query(5000, le=10000),
    offset: int = 0,
    lifecycle_stage: str | None = None,
    city: str | None = None,
    rfm_segment: str | None = None,
    channel_pref: str | None = None,
    gender: str | None = None,
    sort: str = "spend",  # spend | orders | recent
    db: Session = Depends(get_db),
):
    """List customers with light filtering, sorting and pagination."""
    q = db.query(Customer)
    if lifecycle_stage:
        q = q.filter(Customer.lifecycle_stage == lifecycle_stage)
    if city:
        q = q.filter(Customer.city.ilike(f"%{city}%"))
    if rfm_segment:
        q = q.filter(Customer.rfm_segment == rfm_segment)
    if channel_pref:
        q = q.filter(Customer.channel_pref == channel_pref)
    if gender:
        q = q.filter(Customer.gender == gender)

    order = {
        "orders": Customer.order_count.desc(),
        "recent": Customer.last_order_date.desc(),
    }.get(sort, Customer.total_spent.desc())
    return (
        q.order_by(order)
        .offset(offset)
        .limit(limit)
        .all()
    )


@router.get("/summary")
def customers_summary(db: Session = Depends(get_db)):
    """Counts by lifecycle stage and persona — handy for the demo & sanity checks."""
    by_lifecycle = dict(
        db.query(Customer.lifecycle_stage, func.count())
        .group_by(Customer.lifecycle_stage)
        .all()
    )
    by_persona = dict(
        db.query(Customer.persona, func.count())
        .group_by(Customer.persona)
        .all()
    )
    return {
        "total_customers": db.query(func.count(Customer.id)).scalar(),
        "by_lifecycle_stage": by_lifecycle,
        "by_persona": by_persona,
    }


@router.get("/{customer_id}", response_model=CustomerOut)
def get_customer(customer_id: int, db: Session = Depends(get_db)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    return customer
