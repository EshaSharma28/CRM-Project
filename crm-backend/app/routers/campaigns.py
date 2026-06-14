"""Campaign endpoints: create, send (fan-out to channel service), and stats."""
import math

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Campaign, Communication, Order
from app.schemas import CampaignCreateIn, CampaignSendIn
from app.services.campaign_service import dispatch_campaign

router = APIRouter(prefix="/campaigns", tags=["campaigns"])

# Indicative per-message cost by channel (₹) — used for a simple ROI estimate.
# Real rates vary by provider/geo; this is a defensible demo assumption.
CHANNEL_COST = {"whatsapp": 0.35, "sms": 0.15, "email": 0.02, "rcs": 0.30}
# Fixed per-campaign overhead (creative + platform), so cost is never ~0 and ROI
# stays believable. Owned-channel ROAS is genuinely high, so we report a multiple
# (e.g. "12× return"), not a percentage that reads like a vanity number.
CAMPAIGN_OVERHEAD = 250.0


def _cost_and_roas(channel: str, sent: int, revenue: float) -> tuple[float, float | None]:
    cost = round(CAMPAIGN_OVERHEAD + sent * CHANNEL_COST.get(channel, 0.1), 2)
    roas = round(revenue / cost, 1) if cost > 0 else None  # return on spend (×)
    return cost, roas


@router.post("")
def create_campaign(payload: CampaignCreateIn, db: Session = Depends(get_db)):
    campaign = Campaign(
        name=payload.name,
        segment_id=payload.segment_id,
        channel=payload.channel,
        message_template=payload.message_template,
        message_template_b=payload.message_template_b,
        channel_b=payload.channel_b,
        image_url=payload.image_url,
        status="draft",
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)
    return {"id": campaign.id, "name": campaign.name, "status": campaign.status}


@router.get("")
def list_campaigns(db: Session = Depends(get_db)):
    rows = db.query(Campaign).order_by(Campaign.created_at.desc()).all()
    return [
        {
            "id": c.id, 
            "name": c.name, 
            "channel": c.channel, 
            "status": c.status,
            "has_ab_test": bool(c.message_template_b or c.channel_b),
            "image_url": c.image_url,
        }
        for c in rows
    ]


@router.post("/{campaign_id}/send")
def send_campaign(
    campaign_id: int, background: BackgroundTasks, payload: CampaignSendIn | None = None, db: Session = Depends(get_db)
):
    """Kick off async fan-out or schedule. Returns immediately."""
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(404, "Campaign not found")
    if campaign.status in ("sending", "sent", "scheduled"):
        raise HTTPException(409, f"Campaign already {campaign.status}")

    if payload and payload.scheduled_at:
        campaign.scheduled_at = payload.scheduled_at
        campaign.status = "scheduled"
        db.commit()
        return {"status": "scheduled", "campaign_id": campaign_id}

    background.add_task(dispatch_campaign, campaign_id)
    return {"status": "accepted", "campaign_id": campaign_id}


@router.get("/{campaign_id}/stats")
def campaign_stats(campaign_id: int, db: Session = Depends(get_db)):
    """Engagement funnel + revenue/ROI, computed at read-time."""
    campaign = db.get(Campaign, campaign_id)
    if campaign is None:
        raise HTTPException(404, "Campaign not found")

    C = Communication

    def count(expr) -> int:
        return db.query(func.count(C.id)).filter(C.campaign_id == campaign_id, expr).scalar()

    total = db.query(func.count(C.id)).filter(C.campaign_id == campaign_id).scalar()
    sent = count(C.sent_at.isnot(None))

    # Attributed revenue: sum of the orders linked to this campaign's comms.
    revenue = (
        db.query(func.coalesce(func.sum(Order.amount), 0.0))
        .join(C, C.attributed_order_id == Order.id)
        .filter(C.campaign_id == campaign_id)
        .scalar()
    ) or 0.0
    cost, roas = _cost_and_roas(campaign.channel, sent, revenue)

    result = {
        "audience": total,
        "sent": sent,
        "delivered": count(C.delivered_at.isnot(None)),
        "opened": count(C.opened_at.isnot(None)),
        "read": count(C.read_at.isnot(None)),
        "clicked": count(C.clicked_at.isnot(None)),
        "failed": count(C.failed_at.isnot(None)),
        "orders_attributed": count(C.attributed_order_id.isnot(None)),
        "attributed_revenue": round(revenue, 2),
        "est_cost": cost,
        "net_revenue": round(revenue - cost, 2),
        "roas": roas,
    }

    # A/B breakdown + multi-metric significance — only when there's a B variant.
    if campaign.message_template_b or campaign.channel_b:
        variants = {
            "A": _variant_stats(db, campaign_id, "A", campaign.channel),
            "B": _variant_stats(db, campaign_id, "B", campaign.channel_b or campaign.channel)
        }
        result["variants"] = variants
        result["ab_significance"] = _ab_significance(variants["A"], variants["B"])
    return result


# ---------------------------------------------------------------------------
# A/B statistical engine
# ---------------------------------------------------------------------------

def _two_proportion_z(x1: int, n1: int, x2: int, n2: int) -> tuple[float | None, float | None]:
    """Two-tailed z-test for the difference of two proportions.

    Returns (z_stat, p_value).  Both are None when the test can't run.
    """
    if n1 == 0 or n2 == 0:
        return None, None
    p1, p2 = x1 / n1, x2 / n2
    pool = (x1 + x2) / (n1 + n2)
    denom = pool * (1 - pool) * (1 / n1 + 1 / n2)
    if denom <= 0:
        return None, None
    z = (p1 - p2) / math.sqrt(denom)
    p = math.erfc(abs(z) / math.sqrt(2))  # = 2*(1 - Φ(|z|))
    return round(z, 4), round(p, 4)


def _relative_lift(base: float, test: float) -> float | None:
    """Percentage lift of test over base.  e.g. 10% → 12% = +20% lift."""
    if base == 0:
        return None
    return round((test - base) / base * 100, 1)


def _required_sample_size(p1: float, p2: float, alpha: float = 0.05, power: float = 0.80) -> int | None:
    """Approximate per-group sample size needed to detect this effect size.

    Uses the normal approximation: n = (z_α/2 + z_β)² × (p1(1-p1) + p2(1-p2)) / (p1-p2)²
    """
    if p1 == p2 or p1 < 0 or p2 < 0:
        return None
    # z-scores for two-tailed alpha and power
    z_alpha = 1.96 if alpha == 0.05 else 2.576  # 95% or 99%
    z_beta = 0.8416 if power == 0.80 else 1.2816  # 80% or 90%
    numerator = (z_alpha + z_beta) ** 2 * (p1 * (1 - p1) + p2 * (1 - p2))
    denominator = (p1 - p2) ** 2
    return math.ceil(numerator / denominator)


def _metric_test(a: dict, b: dict, metric: str, numerator_key: str, denominator_key: str = "sent") -> dict:
    """Run a significance test on a single metric and return a rich result."""
    n_a, n_b = a[denominator_key], b[denominator_key]
    x_a, x_b = a[numerator_key], b[numerator_key]
    rate_a = round(x_a / n_a * 100, 1) if n_a else 0
    rate_b = round(x_b / n_b * 100, 1) if n_b else 0

    z, p = _two_proportion_z(x_a, n_a, x_b, n_b)
    leader = "A" if rate_a > rate_b else "B" if rate_b > rate_a else None
    significant = p is not None and p < 0.05
    confidence = round((1 - p) * 100) if p is not None else 0

    lift = _relative_lift(rate_a, rate_b) if leader == "B" else (
        _relative_lift(rate_b, rate_a) if leader == "A" else None
    )

    # How many more per group to reach significance (if not already)?
    needed = None
    if not significant and n_a > 0 and n_b > 0:
        p_a, p_b = x_a / n_a, x_b / n_b
        total_needed = _required_sample_size(p_a, p_b) if p_a != p_b else None
        if total_needed is not None:
            already = min(n_a, n_b)
            needed = max(0, total_needed - already)

    return {
        "metric": metric,
        "a_rate": rate_a,
        "b_rate": rate_b,
        "leader": leader,
        "lift_pct": lift,
        "winner": leader if significant else None,
        "z_stat": z,
        "p_value": p,
        "confidence": confidence,
        "significant": significant,
        "more_samples_needed": needed,
    }


def _ab_significance(a: dict, b: dict) -> dict:
    """Multi-metric A/B analysis: open rate, click rate, and conversion rate."""
    tests = {
        "open_rate": _metric_test(a, b, "open_rate", "opened"),
        "click_rate": _metric_test(a, b, "click_rate", "clicked"),
        "conversion_rate": _metric_test(a, b, "conversion_rate", "orders_attributed"),
    }

    # Overall verdict: pick the primary metric (click_rate), summarise all.
    primary = tests["click_rate"]
    any_significant = any(t["significant"] for t in tests.values())
    overall_winner = primary["winner"]

    # Build a human-readable note.
    if overall_winner:
        sig_metrics = [t["metric"] for t in tests.values() if t["significant"]]
        note = (
            f"Variant {overall_winner} wins on {', '.join(sig_metrics)} "
            f"at ≥95% confidence."
        )
        if primary["lift_pct"] is not None:
            note += f" Click-rate lift: +{abs(primary['lift_pct'])}%."
        recommendation = f"Roll out Variant {overall_winner} to full audience."
    elif primary["leader"]:
        note = (
            f"Variant {primary['leader']} is leading on click rate "
            f"({primary['confidence']}% confidence) but not yet significant."
        )
        if primary["more_samples_needed"]:
            note += f" ~{primary['more_samples_needed']:,} more sends per variant needed."
        recommendation = "Keep the test running to gather more data."
    else:
        note = "No meaningful difference between variants yet."
        recommendation = "Keep the test running to gather more data."

    return {
        "tests": tests,
        "primary_metric": "click_rate",
        "overall_winner": overall_winner,
        "any_significant": any_significant,
        "note": note,
        "recommendation": recommendation,
        # Legacy fields for backward compatibility with existing frontend
        "metric": "click_rate",
        "leader": primary["leader"],
        "winner": overall_winner,
        "confidence": primary["confidence"],
        "p_value": primary["p_value"],
        "significant": primary["significant"],
    }


def _variant_stats(db: Session, campaign_id: int, variant: str, channel: str = "email") -> dict:
    C = Communication

    def vcount(expr) -> int:
        return db.query(func.count(C.id)).filter(
            C.campaign_id == campaign_id, C.variant == variant, expr
        ).scalar()

    sent = vcount(C.sent_at.isnot(None))
    delivered = vcount(C.delivered_at.isnot(None))
    # WhatsApp/RCS report "read" instead of "opened" — treat both as an open.
    opened = vcount(C.opened_at.isnot(None)) + vcount(C.read_at.isnot(None))
    clicked = vcount(C.clicked_at.isnot(None))
    failed = vcount(C.failed_at.isnot(None))
    orders = vcount(C.attributed_order_id.isnot(None))

    revenue = (
        db.query(func.coalesce(func.sum(Order.amount), 0.0))
        .join(C, C.attributed_order_id == Order.id)
        .filter(C.campaign_id == campaign_id, C.variant == variant)
        .scalar()
    ) or 0.0
    cost, roas = _cost_and_roas(channel, sent, revenue)

    return {
        "sent": sent,
        "delivered": delivered,
        "opened": opened,
        "clicked": clicked,
        "failed": failed,
        "orders_attributed": orders,
        "revenue": round(revenue, 2),
        "cost": cost,
        "roas": roas,
        "open_rate": round(opened / sent * 100, 1) if sent else 0,
        "click_rate": round(clicked / sent * 100, 1) if sent else 0,
        "conversion_rate": round(orders / sent * 100, 1) if sent else 0,
        "delivery_rate": round(delivered / sent * 100, 1) if sent else 0,
    }


@router.get("/{campaign_id}/insight")
def campaign_insight(campaign_id: int, db: Session = Depends(get_db)):
    """AI-written, plain-English read of the funnel + one suggested next action."""
    from app.ai.client import AIUnavailable, get_ai
    from app.ai.prompts import SUMMARISE_RESULTS

    stats = campaign_stats(campaign_id, db)
    try:
        summary = get_ai().generate_text(SUMMARISE_RESULTS.format(stats=stats)).strip()
    except AIUnavailable as e:
        raise HTTPException(e.status, e.message)
    return {"stats": stats, "summary": summary}
