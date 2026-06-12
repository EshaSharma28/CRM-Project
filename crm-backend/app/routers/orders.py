"""Order ingest & listing endpoints."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Order
from app.schemas import OrderOut

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("", response_model=list[OrderOut])
def list_orders(
    limit: int = Query(50, le=500),
    offset: int = 0,
    customer_id: int | None = None,
    db: Session = Depends(get_db),
):
    """List orders with optional per-customer filter and pagination."""
    q = db.query(Order)
    if customer_id is not None:
        q = q.filter(Order.customer_id == customer_id)
    return (
        q.order_by(Order.ordered_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
