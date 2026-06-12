"""Campaign orchestration: render messages, fan out concurrently, aggregate."""
from __future__ import annotations

from datetime import datetime, timezone

from app.database import SessionLocal
from app.models import Campaign, Communication, Customer
from app.services.channel_client import dispatch_batch
from app.services.segmentation import apply_rules

CHUNK_SIZE = 500  # process the audience in chunks: bounds memory + batches DB writes


def render_message(template: str, customer: Customer) -> str:
    """Fill personalisation tokens like {first_name} from a customer row."""
    first_name = customer.name.split(" ")[0] if customer.name else "there"
    return template.replace("{first_name}", first_name)


def _recipient(customer: Customer, channel: str) -> str:
    return customer.email if channel == "email" else customer.phone


def _chunks(seq, size):
    for i in range(0, len(seq), size):
        yield seq[i : i + size]


def dispatch_campaign(campaign_id: int, customer_ids: list[int] | None = None) -> None:
    """Materialise Communications for the audience and fan them out concurrently.

    Pipeline per chunk: batch-insert rows (one commit) -> concurrent worker-pool
    send with retries -> batch-mark any hard failures. Bounded concurrency in the
    pool provides backpressure. Runs in a background task with its own DB session.
    """
    db = SessionLocal()
    try:
        campaign = db.get(Campaign, campaign_id)
        if campaign is None:
            return

        if customer_ids is not None:
            audience = db.query(Customer).filter(Customer.id.in_(customer_ids)).all()
        else:
            from app.models import Segment

            segment = db.get(Segment, campaign.segment_id)
            rules = segment.rule.get("rules", []) if segment else []
            audience = apply_rules(db.query(Customer), rules).all()

        if not audience:
            campaign.status = "sent"
            db.commit()
            return

        campaign.status = "sending"
        db.commit()

        has_b = bool(campaign.message_template_b)

        for chunk_idx, chunk in enumerate(_chunks(audience, CHUNK_SIZE)):
            # 1. Batch-create this chunk's communications (a single commit).
            comms: list[Communication] = []
            for i, customer in enumerate(chunk):
                idx = chunk_idx * CHUNK_SIZE + i
                variant = "B" if (has_b and idx % 2 == 1) else "A"
                template = campaign.message_template_b if variant == "B" else campaign.message_template
                comm = Communication(
                    campaign_id=campaign.id,
                    customer_id=customer.id,
                    channel=campaign.channel,
                    rendered_message=render_message(template, customer),
                    variant=variant,
                    status="queued",
                )
                db.add(comm)
                comms.append(comm)
            db.commit()  # ids are populated after commit

            # 2. Fan out this chunk concurrently (workers do HTTP only).
            jobs = [
                {
                    "communication_id": c.id,
                    "recipient": _recipient(cust, campaign.channel),
                    "message": c.rendered_message,
                    "channel": campaign.channel,
                }
                for c, cust in zip(comms, chunk)
            ]
            failed_ids = dispatch_batch(jobs)

            # 3. Batch-mark hard failures (couldn't even hand off after retries).
            if failed_ids:
                now = datetime.now(timezone.utc).replace(tzinfo=None)
                db.query(Communication).filter(Communication.id.in_(failed_ids)).update(
                    {Communication.status: "failed", Communication.failed_at: now},
                    synchronize_session=False,
                )
                db.commit()

        campaign.status = "sent"
        db.commit()
    finally:
        db.close()
