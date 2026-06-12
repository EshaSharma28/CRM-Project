"""Agentic journeys API — plan a multi-step campaign, run it, watch it live."""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.ai.client import AIUnavailable, get_ai
from app.ai.prompts import AGENT_PLAN, SEGMENTABLE_FIELDS
from app.database import get_db
from app.models import Communication, Customer, Journey, JourneyStep
from app.schemas import AgentGoal, AgentRunIn
from app.services.agent import run_journey
from app.services.segmentation import apply_rules, build_filters, compute_data_profile

router = APIRouter(prefix="/agent", tags=["agent"])


@router.post("/plan")
def plan(payload: AgentGoal, db: Session = Depends(get_db)):
    """Goal -> (AI) multi-step journey plan + the initial step's live audience size."""
    try:
        spec = get_ai().generate_json(
            AGENT_PLAN.format(
                goal=payload.goal,
                fields=SEGMENTABLE_FIELDS,
                data_profile=compute_data_profile(db),
            )
        )
    except AIUnavailable as e:
        raise HTTPException(e.status, e.message)

    steps = spec.get("steps", [])
    # Validate + size the initial step so the human sees a real number before running.
    for s in steps:
        if s.get("audience_kind") == "initial":
            try:
                rules = [r for r in s.get("rules", [])]
                build_filters(rules)
                s["estimated_count"] = apply_rules(db.query(Customer), rules).count()
            except (ValueError, KeyError) as e:
                raise HTTPException(422, f"Invalid initial audience: {e}")
    return spec


@router.post("/run")
def run(payload: AgentRunIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Persist the approved plan and start executing it autonomously."""
    journey = Journey(
        name=payload.name, goal=payload.goal, objective=payload.objective, status="running"
    )
    db.add(journey)
    db.commit()
    db.refresh(journey)

    for i, step in enumerate(payload.steps):
        db.add(
            JourneyStep(
                journey_id=journey.id,
                step_index=i,
                label=step.label,
                audience_kind=step.audience_kind,
                rules={"rules": [r.model_dump() for r in step.rules]},
                channel=step.channel,
                message_template=step.message,
                wait_label=step.wait_label,
                status="pending",
            )
        )
    db.commit()

    background.add_task(run_journey, journey.id)
    return {"journey_id": journey.id}


@router.get("/journeys")
def list_journeys(db: Session = Depends(get_db)):
    rows = db.query(Journey).order_by(Journey.created_at.desc()).all()
    return [
        {"id": j.id, "name": j.name, "status": j.status, "steps": len(j.steps)}
        for j in rows
    ]


@router.get("/journeys/{journey_id}")
def journey_detail(journey_id: int, db: Session = Depends(get_db)):
    journey = db.get(Journey, journey_id)
    if journey is None:
        raise HTTPException(404, "Journey not found")

    def step_stats(campaign_id: int | None) -> dict:
        if not campaign_id:
            return {}
        C = Communication

        def c(expr):
            return db.query(func.count(C.id)).filter(
                C.campaign_id == campaign_id, expr
            ).scalar()

        return {
            "sent": c(C.sent_at.isnot(None)),
            "opened": c(C.opened_at.isnot(None)),
            "clicked": c(C.clicked_at.isnot(None)),
            "orders_attributed": c(C.attributed_order_id.isnot(None)),
        }

    return {
        "id": journey.id,
        "name": journey.name,
        "goal": journey.goal,
        "objective": journey.objective,
        "status": journey.status,
        "steps": [
            {
                "step_index": s.step_index,
                "label": s.label,
                "audience_kind": s.audience_kind,
                "channel": s.channel,
                "message_template": s.message_template,
                "wait_label": s.wait_label,
                "status": s.status,
                "audience_count": s.audience_count,
                "campaign_id": s.campaign_id,
                "stats": step_stats(s.campaign_id),
            }
            for s in journey.steps
        ],
    }
