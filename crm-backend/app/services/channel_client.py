"""Concurrent dispatch of communications to the stubbed channel service.

This is the fan-out worker pool. Instead of sending one message at a time, we
run a bounded pool of workers that POST to the channel service concurrently,
each with its own retry-with-backoff. Bounded concurrency is the backpressure:
no matter how big the campaign, only N sends are ever in flight at once.

Scale tradeoff (stated, not built): at true volume this in-process pool becomes
a durable distributed queue (Kafka / SQS) feeding autoscaled worker machines,
with a dead-letter queue for messages that exhaust their retries. The
producer/consumer shape here is the same; only the transport changes.
"""
from __future__ import annotations

import time
from concurrent.futures import ThreadPoolExecutor, as_completed

import httpx

from app.config import settings

DISPATCH_CONCURRENCY = 16   # max sends in flight at once (backpressure)
RETRY_ATTEMPTS = 3          # retries per message on transient failure
BASE_BACKOFF = 0.25         # seconds; doubles each retry


def _send_one(client: httpx.Client, job: dict) -> bool:
    """POST one message to the channel service, retrying with backoff."""
    payload = {
        "communication_id": job["communication_id"],
        "recipient": job["recipient"],
        "message": job["message"],
        "channel": job["channel"],
        "callback_url": f"{settings.crm_public_url}/receipts",
    }
    for attempt in range(RETRY_ATTEMPTS + 1):
        try:
            resp = client.post(f"{settings.channel_service_url}/send", json=payload, timeout=10)
            if resp.status_code == 202:
                return True
        except httpx.HTTPError:
            pass
        if attempt < RETRY_ATTEMPTS:
            time.sleep(BASE_BACKOFF * (2**attempt))  # 0.25s, 0.5s, 1s
    return False


def dispatch_batch(jobs: list[dict], concurrency: int = DISPATCH_CONCURRENCY) -> list[int]:
    """Send a batch of jobs concurrently. Returns the ids that failed all retries.

    Workers do HTTP only (never touch the DB) — they're pure send tasks, so the
    caller can update the database safely on a single thread.
    """
    failed: list[int] = []
    if not jobs:
        return failed
    with httpx.Client() as client:  # one connection-pooled client, shared by workers
        with ThreadPoolExecutor(max_workers=concurrency) as pool:
            futures = {pool.submit(_send_one, client, job): job for job in jobs}
            for fut in as_completed(futures):
                if not fut.result():
                    failed.append(futures[fut]["communication_id"])
    return failed
