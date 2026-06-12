"""Derived customer fields, computed from raw orders.

Single source of truth for the behavioural fields the CRM segments on
(total_spent, order_count, recency, cadence, lifecycle_stage). Used by both the
seed generator and the ingestion endpoints so imported data behaves identically
to seeded data.
"""
from __future__ import annotations

from datetime import datetime, timezone


def now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def compute_lifecycle(signup, last_order, order_count, ref) -> str:
    if last_order is None:
        return "new"
    days = (ref - last_order).days
    tenure = (ref - signup).days if signup else days
    if order_count <= 2 and tenure <= 45:
        return "new"
    if days <= 35:
        return "active"
    if days <= 90:
        return "at_risk"
    if days <= 180:
        return "lapsed"
    return "churned"


def avg_gap(order_dates: list[datetime]) -> float | None:
    if len(order_dates) < 2:
        return None
    s = sorted(order_dates)
    gaps = [(s[i + 1] - s[i]).days for i in range(len(s) - 1)]
    return round(sum(gaps) / len(gaps), 1)


def recompute_customer(customer, ref: datetime | None = None) -> None:
    """Recompute a customer's derived fields from their current orders."""
    ref = ref or now()
    orders = list(customer.orders)
    dates = [o.ordered_at for o in orders]
    customer.total_spent = round(sum(o.amount for o in orders), 2)
    customer.order_count = len(orders)
    customer.last_order_date = max(dates) if dates else None
    customer.avg_days_between_orders = avg_gap(dates)
    customer.lifecycle_stage = compute_lifecycle(
        customer.signup_date, customer.last_order_date, len(orders), ref
    )
