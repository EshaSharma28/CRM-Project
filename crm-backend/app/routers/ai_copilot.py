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
from urllib.parse import quote

import httpx

from app.ai.prompts import (
    ANALYTICS,
    ASSISTANT_ROUTER,
    CHAT_REFINE,
    DRAFT_MESSAGE,
    GOAL_TO_SEGMENT,
    IMAGE_PROMPT,
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
    ImageIn,
    SegmentRule,
)

# Channels that can carry rich media (an image). SMS is text-only.
IMAGE_CHANNELS = {"whatsapp", "rcs", "email"}
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


_IMG_STORE: dict[str, bytes] = {}  # in-memory generated images (demo)


@router.post("/image")
def image(payload: ImageIn):
    """Design + generate a rich-media image for a message.

    The AI writes a vivid image prompt from the message; we render it with a
    text-to-image model (Hugging Face if a token is set, else a best-effort
    keyless service). Only rich channels get media — SMS is text-only.
    Tradeoff: a real brand uses an approved asset library; AI generation here
    demonstrates the capability.
    """
    import uuid

    from app.config import settings

    if payload.channel not in IMAGE_CHANNELS:
        return {"supported": False, "reason": f"{payload.channel} is text-only"}

    try:
        prompt = get_ai().generate_text(IMAGE_PROMPT.format(message=payload.message))
        prompt = prompt.strip().strip('"').replace("\n", " ")[:200]
    except AIUnavailable:
        prompt = "warm cinematic photo of specialty coffee, cozy cafe, steam, golden light"
    full = f"{prompt}, Brewhaus specialty coffee, photoreal, warm tones, no text"

    # Preferred: Hugging Face inference (reliable, real generation).
    if settings.hf_token:
        try:
            r = httpx.post(
                f"https://router.huggingface.co/hf-inference/models/{settings.hf_image_model}",
                headers={"Authorization": f"Bearer {settings.hf_token}"},
                json={"inputs": full},
                timeout=60,
            )
            if r.status_code == 200 and r.headers.get("content-type", "").startswith("image"):
                img_id = uuid.uuid4().hex[:12]
                _IMG_STORE[img_id] = r.content
                return {
                    "supported": True, "image_prompt": prompt,
                    "image_url": f"{settings.crm_public_url}/copilot/image/{img_id}.jpg",
                }
        except httpx.HTTPError:
            pass  # fall through to keyless

    # Fallback: keyless service (best-effort; may be rate-limited).
    url = f"https://image.pollinations.ai/prompt/{quote(full)}?width=640&height=400&nologo=true"
    return {"supported": True, "image_prompt": prompt, "image_url": url}


@router.get("/image/{img_id}.jpg")
def get_image(img_id: str):
    from fastapi import Response

    data = _IMG_STORE.get(img_id)
    if data is None:
        raise HTTPException(404, "image not found")
    return Response(content=data, media_type="image/jpeg")


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
        image_url=payload.image_url,
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
