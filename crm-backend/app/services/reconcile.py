"""Reconciliation sweep — recover communications whose callbacks were lost.

Callback-driven systems have one nasty failure mode: a callback is permanently
lost, so a communication is stuck in a non-terminal state forever and the stats
are silently wrong. Retries help but can't fix a callback that never arrives.

The fix is reconciliation: for communications that should be settled by now
(their campaign has finished sending) but aren't terminal, ask the channel for
its source-of-truth lifecycle (GET /status/{id}) and apply any events we're
missing. Idempotency (event_id PK) makes this safe to run repeatedly — already-
seen events are no-ops, so only genuinely lost events are recovered.
"""
from __future__ import annotations

from datetime import datetime

import httpx

from app.config import settings
from app.models import Campaign, Communication
from app.routers.receipts import ingest_event

TERMINAL = ("clicked", "failed")


def reconcile(db, limit: int = 1000) -> dict:
    """Recover missing events for settled-but-non-terminal communications."""
    candidates = (
        db.query(Communication)
        .join(Campaign, Communication.campaign_id == Campaign.id)
        .filter(Campaign.status == "sent")  # campaign done sending => all callbacks due
        .filter(Communication.status.notin_(TERMINAL))
        .limit(limit)
        .all()
    )

    checked = 0
    recovered = 0
    with httpx.Client(timeout=10) as client:
        for comm in candidates:
            checked += 1
            try:
                resp = client.get(f"{settings.channel_service_url}/status/{comm.id}")
                if resp.status_code != 200:
                    continue
                events = resp.json().get("events", [])
            except httpx.HTTPError:
                continue
            for ev in events:
                occurred_at = datetime.fromisoformat(ev["occurred_at"]).replace(tzinfo=None)
                if ingest_event(db, ev["event_id"], comm.id, ev["event_type"], occurred_at) == "ok":
                    recovered += 1

    return {"checked": checked, "recovered": recovered}
