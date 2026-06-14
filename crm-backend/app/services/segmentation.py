"""Turn a structured segment rule into a safe SQLAlchemy query.

The AI emits a validated rule (field/op/value over a whitelist); this module
translates it to query filters. No raw SQL from the model ever touches the DB —
unknown fields/ops are rejected, so a hallucinated filter fails loudly instead
of running something unexpected.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Query

from app.models import Customer

SUPPORTED_OPS = {"gt", "lt", "gte", "lte", "eq", "in"}

# Whitelisted fields the AI may segment on -> the column they map to.
DIRECT_FIELDS = {
    "total_spent": Customer.total_spent,
    "order_count": Customer.order_count,
    "avg_days_between_orders": Customer.avg_days_between_orders,
    "lifecycle_stage": Customer.lifecycle_stage,
    "city": Customer.city,
    "channel_pref": Customer.channel_pref,
    "gender": Customer.gender,
    "rfm_segment": Customer.rfm_segment,
    "r_score": Customer.r_score,
    "f_score": Customer.f_score,
    "m_score": Customer.m_score,
}
# Computed fields need special handling (not stored as a column).
COMPUTED_FIELDS = {"days_since_last_order"}


def _apply_op(column, op: str, value):
    if op == "gt":
        return column > value
    if op == "lt":
        return column < value
    if op == "gte":
        return column >= value
    if op == "lte":
        return column <= value
    if op == "eq":
        return column == value
    if op == "in":
        if not isinstance(value, (list, tuple)):
            raise ValueError("'in' requires a list value")
        return column.in_(list(value))
    raise ValueError(f"Unsupported op: {op}")


def _days_since_filter(op: str, days):
    """days_since_last_order compares against last_order_date inversely.

    'more than N days since last order' => last_order_date < now - N days.
    """
    ref = datetime.now(timezone.utc).replace(tzinfo=None)
    cutoff = ref - timedelta(days=float(days))
    col = Customer.last_order_date
    if op in ("gt", "gte"):
        return col < cutoff  # older than the cutoff = more days since
    if op in ("lt", "lte"):
        return col > cutoff  # more recent than the cutoff = fewer days since
    if op == "eq":
        # rarely useful; approximate as same calendar day
        return col >= cutoff - timedelta(days=1), col <= cutoff + timedelta(days=1)
    raise ValueError(f"Unsupported op for days_since_last_order: {op}")


def build_filters(rules: list[dict]):
    """Validate rules and return a list of SQLAlchemy filter expressions."""
    filters = []
    for rule in rules:
        field, op, value = rule["field"], rule["op"], rule["value"]
        if op not in SUPPORTED_OPS:
            raise ValueError(f"Unsupported op: {op}")
        if field in DIRECT_FIELDS:
            filters.append(_apply_op(DIRECT_FIELDS[field], op, value))
        elif field in COMPUTED_FIELDS:
            filters.append(_days_since_filter(op, value))
        else:
            raise ValueError(f"Field not segmentable: {field}")
    return filters


def apply_rules(query: Query, rules: list[dict]) -> Query:
    """Apply validated {field, op, value} rules to a Customer query."""
    for f in build_filters(rules):
        query = query.filter(f)
    return query


def _quantiles(values: list[float], ps=(0.5, 0.75, 0.9)) -> dict:
    if not values:
        return {f"p{int(p*100)}": None for p in ps}
    s = sorted(values)
    out = {}
    for p in ps:
        idx = min(len(s) - 1, int(p * (len(s) - 1)))
        out[f"p{int(p*100)}"] = round(s[idx], 1)
    return out


def compute_data_profile(db) -> str:
    """A compact, live profile of the customer base so the AI picks REAL
    thresholds (correct currency scale, actual lifecycle values, true cadence)
    instead of guessing. This grounding is what makes AI segments land.
    """
    from sqlalchemy import func

    from app.models import Customer

    lifecycle = dict(
        db.query(Customer.lifecycle_stage, func.count())
        .group_by(Customer.lifecycle_stage)
        .all()
    )
    rfm = dict(
        db.query(Customer.rfm_segment, func.count())
        .group_by(Customer.rfm_segment)
        .all()
    )
    spend = [v for (v,) in db.query(Customer.total_spent).all()]
    orders = [v for (v,) in db.query(Customer.order_count).all()]
    gaps = [v for (v,) in db.query(Customer.avg_days_between_orders).all() if v]

    sp, oc = _quantiles(spend), _quantiles(orders)
    gp = _quantiles(gaps)
    return (
        f"Total customers: {len(spend)}. Currency: INR (spend is in ₹, typically thousands).\n"
        f"lifecycle_stage values and counts: {lifecycle}\n"
        f"rfm_segment values and counts: {rfm}\n"
        f"total_spent percentiles: p50=₹{sp['p50']}, p75=₹{sp['p75']}, p90=₹{sp['p90']}\n"
        f"order_count percentiles: p50={oc['p50']}, p75={oc['p75']}, p90={oc['p90']}\n"
        f"avg_days_between_orders percentiles: p50={gp['p50']}, p75={gp['p75']}, p90={gp['p90']}\n"
    )
