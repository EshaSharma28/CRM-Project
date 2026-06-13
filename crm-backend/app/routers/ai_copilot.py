"""AI co-pilot endpoints — the product's centerpiece.

Marketer sends a goal in natural language; we return a full proposal
(audience rule + live count + drafted message) for the human to approve, then
optionally launch it in one call.

Design notes:
  - The AI emits a STRUCTURED rule over a whitelist, never raw SQL. We validate
    it against the same segmentation engine the rest of the app uses.
  - If the model hallucinates an un-segmentable field, we feed the error back
    and let it correct itself once before giving up — cheap robustness.
"""
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

import json

from app.ai.client import AIUnavailable, get_ai
from app.ai.prompts import (
    ANALYTICS,
    ASSISTANT_ROUTER,
    CHAT_REFINE,
    DRAFT_MESSAGE,
    GOAL_TO_SEGMENT,
    SEGMENTABLE_FIELDS,
)
from app.database import get_db
from app.models import Campaign, Customer, Segment
from app.schemas import (
    AskIn,
    AssistantIn,
    ChatIn,
    CopilotGoal,
    CopilotLaunchIn,
    CopilotProposal,
    DraftIn,
    SegmentRule,
)
from app.services.analytics import run_analytics
from app.services.campaign_service import dispatch_campaign
from app.services.segmentation import apply_rules, build_filters, compute_data_profile

router = APIRouter(prefix="/copilot", tags=["copilot"])

MAX_RULE_ATTEMPTS = 2


def _propose_rules(goal: str, data_profile: str) -> dict:
    """Ask the AI for a segment definition, validating + self-correcting once."""
    ai = get_ai()
    prompt = GOAL_TO_SEGMENT.format(
        goal=goal, fields=SEGMENTABLE_FIELDS, data_profile=data_profile
    )
    last_error = ""
    for attempt in range(MAX_RULE_ATTEMPTS):
        data = ai.generate_json(prompt if not last_error else prompt + f"\n\nYour previous attempt failed validation: {last_error}\nFix it.")
        try:
            build_filters(data.get("rules", []))  # validate only; cheap
            return data
        except (ValueError, KeyError) as e:
            last_error = str(e)
    raise HTTPException(422, f"Could not derive a valid segment: {last_error}")


@router.post("/propose", response_model=CopilotProposal)
def propose(payload: CopilotGoal, db: Session = Depends(get_db)):
    """goal -> (AI) segment rule -> live count -> (AI) message draft."""
    try:
        data = _propose_rules(payload.goal, compute_data_profile(db))
        rules = data["rules"]
        count = apply_rules(db.query(Customer), rules).count()

        channel = data.get("suggested_channel", "whatsapp")
        message = get_ai().generate_text(
            DRAFT_MESSAGE.format(
                segment_description=data.get("segment_description", payload.goal),
                channel=channel,
            )
        ).strip()
    except AIUnavailable as e:
        raise HTTPException(e.status, e.message)

    return CopilotProposal(
        segment_name=data.get("segment_name", "Untitled segment"),
        segment_description=data.get("segment_description", ""),
        rules=[SegmentRule(**r) for r in rules],
        estimated_count=count,
        suggested_channel=channel,
        message_draft=message,
    )


@router.post("/chat")
def chat(payload: ChatIn, db: Session = Depends(get_db)):
    """Multi-turn refinement: conversation + current proposal -> reply + updated proposal."""
    conversation = "\n".join(
        f"{'Marketer' if m.role == 'user' else 'Co-pilot'}: {m.content}"
        for m in payload.messages
    )
    base = CHAT_REFINE.format(
        fields=SEGMENTABLE_FIELDS,
        data_profile=compute_data_profile(db),
        proposal=json.dumps(payload.proposal) if payload.proposal else "null",
        conversation=conversation,
    )

    last_error = ""
    for _ in range(MAX_RULE_ATTEMPTS):
        try:
            data = get_ai().generate_json(
                base if not last_error else base + f"\n\nPrevious attempt was invalid: {last_error}\nFix it."
            )
        except AIUnavailable as e:
            raise HTTPException(e.status, e.message)
        prop = data.get("proposal") or {}
        try:
            build_filters(prop.get("rules", []))
            break
        except (ValueError, KeyError) as e:
            last_error = str(e)
    else:
        raise HTTPException(422, f"Could not build a valid audience: {last_error}")

    prop["estimated_count"] = apply_rules(db.query(Customer), prop.get("rules", [])).count()
    return {"reply": data.get("reply", ""), "proposal": prop}


@router.post("/ask")
def ask(payload: AskIn, db: Session = Depends(get_db)):
    """Natural-language analytics: question -> (AI) query spec -> executed result."""
    try:
        spec = get_ai().generate_json(
            ANALYTICS.format(
                question=payload.question,
                fields=SEGMENTABLE_FIELDS,
                data_profile=compute_data_profile(db),
            )
        )
    except AIUnavailable as e:
        raise HTTPException(e.status, e.message)
    try:
        result = run_analytics(db, spec)
    except (ValueError, KeyError) as e:
        raise HTTPException(422, f"Could not run that query: {e}")
    result["interpretation"] = spec.get("interpretation", payload.question)
    result["question"] = payload.question
    return result


@router.post("/draft")
def draft(payload: DraftIn):
    """Draft a single message for a given audience description + channel.

    Powers 'regenerate' and 'generate variant B' without re-running segmentation.
    """
    try:
        text = get_ai().generate_text(
            DRAFT_MESSAGE.format(segment_description=payload.description, channel=payload.channel)
        ).strip()
    except AIUnavailable as e:
        raise HTTPException(e.status, e.message)
    return {"message_draft": text}


@router.post("/launch")
def launch(payload: CopilotLaunchIn, background: BackgroundTasks, db: Session = Depends(get_db)):
    """Turn an approved proposal into a live campaign: create + send in one call."""
    rules = [r.model_dump() for r in payload.rules]
    try:
        build_filters(rules)
    except ValueError as e:
        raise HTTPException(422, str(e))

    segment = Segment(name=payload.name, description=payload.description, rule={"rules": rules})
    db.add(segment)
    db.commit()
    db.refresh(segment)

    campaign = Campaign(
        name=payload.name,
        segment_id=segment.id,
        channel=payload.channel,
        message_template=payload.message_template,
        message_template_b=payload.message_template_b,
        channel_b=payload.channel_b,
        status="scheduled" if payload.scheduled_at else "draft",
        scheduled_at=payload.scheduled_at,
    )
    db.add(campaign)
    db.commit()
    db.refresh(campaign)

    if not payload.scheduled_at:
        background.add_task(dispatch_campaign, campaign.id)
    return {"campaign_id": campaign.id, "segment_id": segment.id, "status": "scheduled" if payload.scheduled_at else "accepted"}


@router.post("/assistant")
def assistant(payload: AssistantIn):
    """The universal assistant router. Takes history + message, decides what to do."""
    history_text = "\n".join(
        f"{'User' if m.role == 'user' else 'Assistant'}: {m.content}"
        for m in payload.history
    )
    
    prompt = ASSISTANT_ROUTER.format(
        history=history_text,
        message=payload.message
    )
    
    try:
        action_spec = get_ai().generate_json(prompt)
    except AIUnavailable as e:
        raise HTTPException(e.status, e.message)
        
    return action_spec
