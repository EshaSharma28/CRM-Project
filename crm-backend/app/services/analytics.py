"""Execute a validated analytics spec against the shopper / order data.

The AI turns a natural-language question into a structured spec
({entity, metric, rules, time_window_days, group_by}); this module runs it
safely. Filters go through the same whitelist-validated segmentation engine, and
only known columns can be grouped/aggregated. No model-authored SQL ever runs —
that constraint is a deliberate security boundary, not a limitation.

Supports two entities:
  - shoppers: count / sum_spend / avg_spend over customers
  - orders:   order_count / revenue / avg_order_value over orders (joined to
              customers so shopper attributes can still filter/group them)
Plus time windows (last N days) and month bucketing for time-series questions.
"""
from __future__ import annotations

from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func

from app.models import Customer, Order
from app.services.segmentation import build_filters

# Customer columns usable for grouping (shared by both entities via the join).
CUSTOMER_DIMS = {
    "city": Customer.city,
    "lifecycle_stage": Customer.lifecycle_stage,
    "rfm_segment": Customer.rfm_segment,
    "channel_pref": Customer.channel_pref,
}
ORDER_DIMS = {
    "product": Order.product,
    "is_subscription": Order.is_subscription,
    **CUSTOMER_DIMS,
}

SHOPPER_METRICS = {
    "count": lambda: func.count(Customer.id),
    "sum_spend": lambda: func.sum(Customer.total_spent),
    "avg_spend": lambda: func.avg(Customer.total_spent),
}
ORDER_METRICS = {
    "order_count": lambda: func.count(Order.id),
    "revenue": lambda: func.sum(Order.amount),
    "avg_order_value": lambda: func.avg(Order.amount),
}


def _cutoff(days: int) -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None) - timedelta(days=int(days))


def _rows(res) -> list[dict]:
    out = []
    for k, v in res:
        label = "Subscription" if k is True else "One-off" if k is False else str(k)
        out.append({"label": label, "value": round(float(v or 0), 2)})
    return out


def _month_bucket(rows, metric: str) -> list[dict]:
    buckets: dict[str, list[float]] = defaultdict(list)
    for dt, amount in rows:
        buckets[dt.strftime("%Y-%m")].append(amount)
    out = []
    for ym in sorted(buckets):  # chronological for a time series
        vals = buckets[ym]
        if metric == "revenue":
            v = round(sum(vals), 2)
        elif metric == "avg_order_value":
            v = round(sum(vals) / len(vals), 2)
        else:  # order_count
            v = len(vals)
        out.append({"label": ym, "value": v})
    return out


def run_analytics(db, spec: dict) -> dict:
    entity = spec.get("entity", "shoppers")
    group_by = spec.get("group_by")
    window = spec.get("time_window_days")
    cust_filters = build_filters(spec.get("rules", []))  # validates; may raise

    if entity == "orders":
        metric = spec.get("metric", "order_count")
        agg = ORDER_METRICS.get(metric, ORDER_METRICS["order_count"])()
        q = db.query(Order).join(Customer, Order.customer_id == Customer.id)
        for f in cust_filters:
            q = q.filter(f)
        if window:
            q = q.filter(Order.ordered_at >= _cutoff(window))

        if group_by == "month":
            rows = q.with_entities(Order.ordered_at, Order.amount).all()
            return {"entity": entity, "metric": metric, "group_by": "month",
                    "rows": _month_bucket(rows, metric)}
        col = ORDER_DIMS.get(group_by)
        if col is not None:
            res = q.with_entities(col, agg).group_by(col).order_by(agg.desc()).all()
            return {"entity": entity, "metric": metric, "group_by": group_by, "rows": _rows(res)}
        value = q.with_entities(agg).scalar() or 0
        return {"entity": entity, "metric": metric, "group_by": None, "value": round(float(value), 2)}

    # shoppers
    metric = spec.get("metric", "count")
    agg = SHOPPER_METRICS.get(metric, SHOPPER_METRICS["count"])()
    q = db.query(Customer)
    for f in cust_filters:
        q = q.filter(f)
    if window:
        q = q.filter(Customer.signup_date >= _cutoff(window))

    col = CUSTOMER_DIMS.get(group_by)
    if col is not None:
        res = q.with_entities(col, agg).group_by(col).order_by(agg.desc()).all()
        return {"entity": entity, "metric": metric, "group_by": group_by, "rows": _rows(res)}
    value = q.with_entities(agg).scalar() or 0
    return {"entity": entity, "metric": metric, "group_by": None, "value": round(float(value), 2)}
