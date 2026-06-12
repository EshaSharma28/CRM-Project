"""RFM analysis — Recency, Frequency, Monetary.

The canonical retail/marketing segmentation. Each shopper is scored 1-5 on each
axis (quintiles, relative to the whole base), then the (R, F, M) scores roll up
to a named, actionable segment marketers recognise (Champions, At Risk, ...).

Scores are RELATIVE, so they're recomputed across all customers whenever the
base changes (seed, ingest). We store them on the customer row so segmentation
and the AI can filter on `rfm_segment` directly.
"""
from __future__ import annotations

from datetime import datetime, timezone

from app.models import Customer

# Named segments, ordered for display (best -> needs-winning-back -> lost).
RFM_SEGMENTS = [
    "Champions",
    "Loyal",
    "Potential Loyalist",
    "New",
    "Promising",
    "Needs Attention",
    "At Risk",
    "Can't Lose Them",
    "Hibernating",
    "Lost",
]

SEGMENT_ACTION = {
    "Champions": "Reward them; ask for referrals & reviews.",
    "Loyal": "Upsell premium beans & subscriptions.",
    "Potential Loyalist": "Nudge a second purchase; offer a subscription.",
    "New": "Strong onboarding; set expectations.",
    "Promising": "Build the habit with a gentle follow-up.",
    "Needs Attention": "Re-engage before they drift.",
    "At Risk": "Win-back with a compelling offer.",
    "Can't Lose Them": "Urgent, high-touch win-back — they were valuable.",
    "Hibernating": "Low-cost reactivation or let go.",
    "Lost": "Suppress or one final reactivation attempt.",
}


def _days_since(c: Customer, ref: datetime) -> int:
    return (ref - c.last_order_date).days if c.last_order_date else 10**6


def _assign_quintiles(customers, key, attr) -> None:
    """Rank customers by `key` ascending and stamp a 1-5 score on `attr`
    (higher key -> higher score)."""
    ordered = sorted(customers, key=key)
    n = len(ordered)
    for i, c in enumerate(ordered):
        setattr(c, attr, min(5, int(i / n * 5) + 1) if n else 1)


def _segment_name(r: int, f: int, m: int) -> str:
    fm = (f + m + 1) // 2  # ceil average of F and M, 1-5
    if r >= 4 and fm >= 4:
        return "Champions"
    if r >= 3 and fm >= 4:
        return "Loyal"
    if r >= 4 and fm >= 2:
        return "Potential Loyalist"
    if r >= 4:
        return "New"
    if r == 3 and fm >= 3:
        return "Loyal"
    if r == 3 and fm >= 2:
        return "Needs Attention"
    if r == 3:
        return "Promising"
    if r <= 2 and fm >= 4:
        return "Can't Lose Them"
    if r <= 2 and fm >= 3:
        return "At Risk"
    if r <= 2 and fm >= 2:
        return "Hibernating"
    return "Lost"


def recompute_rfm(db) -> int:
    """Recompute R/F/M scores and segments for every customer. Returns count."""
    customers = db.query(Customer).all()
    if not customers:
        return 0
    ref = datetime.now(timezone.utc).replace(tzinfo=None)

    _assign_quintiles(customers, key=lambda c: -_days_since(c, ref), attr="r_score")
    _assign_quintiles(customers, key=lambda c: c.order_count, attr="f_score")
    _assign_quintiles(customers, key=lambda c: c.total_spent, attr="m_score")

    for c in customers:
        c.rfm_segment = _segment_name(c.r_score, c.f_score, c.m_score)
    db.commit()
    return len(customers)


def rfm_summary(db) -> dict:
    """Distribution by named segment + a 5x5 R×F grid (for a heatmap)."""
    customers = db.query(Customer).all()

    segments = {}
    for name in RFM_SEGMENTS:
        segments[name] = {"count": 0, "revenue": 0.0, "action": SEGMENT_ACTION[name]}
    grid = {(r, f): {"count": 0, "monetary": 0.0} for r in range(1, 6) for f in range(1, 6)}

    for c in customers:
        seg = c.rfm_segment or "Lost"
        if seg in segments:
            segments[seg]["count"] += 1
            segments[seg]["revenue"] += c.total_spent
        cell = grid.get((c.r_score, c.f_score))
        if cell:
            cell["count"] += 1
            cell["monetary"] += c.total_spent

    for s in segments.values():
        s["revenue"] = round(s["revenue"], 2)

    return {
        "total": len(customers),
        "segments": segments,
        "grid": [
            {"r": r, "f": f, "count": v["count"], "monetary": round(v["monetary"], 2)}
            for (r, f), v in grid.items()
        ],
    }
