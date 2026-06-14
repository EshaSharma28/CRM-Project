"""Outcome simulation + async callback delivery.

Each accepted message rolls a realistic, CHANNEL-SPECIFIC lifecycle:
    email:    sent -> delivered -> opened -> clicked
    sms:      sent -> delivered -> clicked            (no open/read tracking)
    whatsapp: sent -> delivered -> read -> clicked    (read receipts, no "open")
    rcs:      sent -> delivered -> read -> clicked
    (or any of them -> failed)

Events get LOGICAL timestamps (occurred_at, strictly increasing) but are fired
back after INDEPENDENT random delays, so callbacks arrive ASYNCHRONOUSLY and
OUT OF ORDER. Some callbacks are intentionally DROPPED (never delivered) to model
real-world callback loss — the channel still RECORDS the truth, so the CRM's
reconciliation sweep can later pull the missing events via GET /status/{id}.
"""
from __future__ import annotations

import asyncio
import hashlib
import hmac
import json
import random
from datetime import datetime, timedelta, timezone

import httpx

from app.config import settings

LOGICAL_STEP = timedelta(seconds=30)

# The engagement event each channel reports between 'delivered' and 'clicked'.
# None means the channel has no open/read tracking (e.g. SMS).
CHANNEL_ENGAGEMENT = {
    "email": "opened",
    "sms": None,
    "whatsapp": "read",
    "rcs": "read",
}

# Source of truth: what the channel "knows" happened to each communication, kept
# even when a callback is dropped. communication_id -> list[event dict].
_TRUTH: dict[int, list[dict]] = {}


def get_truth(communication_id: int) -> list[dict] | None:
    return _TRUTH.get(communication_id)


def _roll_lifecycle(channel: str, rng: random.Random) -> list[str]:
    """Decide this message's events, in logical order, for its channel."""
    if rng.random() < settings.failure_rate:
        return ["sent", "failed"]

    events = ["sent", "delivered"]
    engagement = CHANNEL_ENGAGEMENT.get(channel, "opened")

    engaged = False
    if engagement is not None:
        if rng.random() < settings.open_rate:
            events.append(engagement)
            engaged = True

    # A click requires engagement on channels that track it; SMS can click off
    # delivery directly (no open/read signal exists).
    can_click = engaged or engagement is None
    if can_click and rng.random() < settings.click_rate:
        events.append("clicked")
    return events


async def _post_with_retry(client: httpx.AsyncClient, url: str, payload: dict) -> None:
    # Sign the exact bytes we send so the CRM can verify authenticity (HMAC-SHA256).
    payload_bytes = json.dumps(payload).encode("utf-8")
    signature = hmac.new(
        settings.webhook_secret.encode(), payload_bytes, hashlib.sha256
    ).hexdigest()
    headers = {
        "X-Hub-Signature": f"sha256={signature}",
        "Content-Type": "application/json"
    }

    for attempt in range(settings.callback_max_retries + 1):
        try:
            resp = await client.post(url, content=payload_bytes, headers=headers, timeout=10)
            if resp.status_code < 500:
                return  # 2xx ok or 4xx (won't fix by retrying, e.g. duplicate)
        except httpx.HTTPError:
            pass
        await asyncio.sleep(0.5 * (2**attempt))


async def simulate_and_callback(message: dict) -> None:
    """Roll outcomes for one message and POST each event to its callback_url.

    Records the full intended lifecycle as the channel's source of truth, then
    delivers each callback concurrently — dropping some to simulate loss.
    """
    rng = random.Random(message["communication_id"])
    callback_url = message["callback_url"]
    comm_id = message["communication_id"]
    channel = message.get("channel", "email")

    base = datetime.now(timezone.utc)
    lifecycle = _roll_lifecycle(channel, rng)

    # Record truth up front (immune to dropped callbacks).
    truth = [
        {
            "event_id": f"{comm_id}-{etype}",
            "communication_id": comm_id,
            "event_type": etype,
            "occurred_at": (base + LOGICAL_STEP * idx).isoformat(),
        }
        for idx, etype in enumerate(lifecycle)
    ]
    _TRUTH[comm_id] = truth

    async def deliver(event: dict) -> None:
        # Simulate permanent callback loss: record kept, callback never sent.
        if rng.random() < settings.callback_drop_rate:
            return
        delay_ms = rng.randint(settings.min_delay_ms, settings.max_delay_ms)
        await asyncio.sleep(delay_ms / 1000)
        async with httpx.AsyncClient() as client:
            await _post_with_retry(client, callback_url, event)

    await asyncio.gather(*(deliver(e) for e in truth))
