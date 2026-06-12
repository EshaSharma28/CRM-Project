"""Agentic campaign journeys — plan a multi-step campaign and execute it.

This is the brief's "true AI agent": from one goal, the AI proposes a plan
(initial outreach -> wait -> re-target non-engagers on another channel), and a
background runner executes the whole thing autonomously over time.

Time is COMPRESSED for the demo: a planned "after 3 days" wait runs in ~18s so
the multi-step behaviour is observable live. In production the wait would be a
real scheduled delay (cron / task queue) — a conscious scope tradeoff.
"""
from __future__ import annotations

import time

from app.database import SessionLocal
from app.models import Campaign, Communication, Customer, Journey, JourneyStep
from app.services.campaign_service import dispatch_campaign
from app.services.segmentation import apply_rules

STEP_WAIT_SECONDS = 18  # compressed stand-in for the planned wait between steps


def _resolve_initial_audience(db, rules: list[dict]) -> list[int]:
    return [c.id for c in apply_rules(db.query(Customer), rules).all()]


def _resolve_followup_audience(db, prev_campaign_id: int, kind: str) -> list[int]:
    """Customers from the previous step who didn't engage."""
    q = db.query(Communication.customer_id).filter(
        Communication.campaign_id == prev_campaign_id
    )
    if kind == "non_clickers_of_previous":
        q = q.filter(Communication.clicked_at.is_(None))
    else:  # non_openers_of_previous (default)
        q = q.filter(Communication.opened_at.is_(None))
    return [cid for (cid,) in q.all()]


def run_journey(journey_id: int) -> None:
    """Execute every step of a journey in order, waiting between steps."""
    db = SessionLocal()
    try:
        journey = db.get(Journey, journey_id)
        if journey is None:
            return
        prev_campaign_id: int | None = None

        for step in journey.steps:
            # Resolve this step's audience.
            if step.audience_kind == "initial":
                audience = _resolve_initial_audience(db, step.rules.get("rules", []))
            elif prev_campaign_id is not None:
                audience = _resolve_followup_audience(db, prev_campaign_id, step.audience_kind)
            else:
                audience = []

            if not audience:
                step.status = "skipped"
                step.audience_count = 0
                db.commit()
                continue

            # Materialise the step as a real campaign and dispatch to the audience.
            campaign = Campaign(
                name=f"{journey.name} · {step.label}",
                segment_id=None,
                channel=step.channel,
                message_template=step.message_template,
                status="draft",
            )
            db.add(campaign)
            db.commit()
            db.refresh(campaign)

            step.campaign_id = campaign.id
            step.audience_count = len(audience)
            step.status = "running"
            db.commit()

            dispatch_campaign(campaign.id, customer_ids=audience)  # synchronous fan-out
            step.status = "sent"
            db.commit()
            prev_campaign_id = campaign.id

            # Wait before the next step so engagement (opens/clicks) can accrue.
            if step is not journey.steps[-1]:
                time.sleep(STEP_WAIT_SECONDS)

        journey.status = "completed"
        db.commit()
    finally:
        db.close()
