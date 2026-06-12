"""Stubbed channel service entrypoint. Run with:
    uvicorn app.main:app --reload --port 8001

Does NOT deliver anything real — it simulates a messaging provider and reports
outcomes back to the CRM asynchronously. This is a separate service on purpose.
"""
from fastapi import BackgroundTasks, FastAPI
from pydantic import BaseModel

from app.simulator import get_truth, simulate_and_callback

app = FastAPI(title="Brewhaus Channel Service", version="0.1.0")


class SendRequest(BaseModel):
    communication_id: int
    recipient: str
    message: str
    channel: str        # whatsapp|email|sms
    callback_url: str   # where to POST receipts back into the CRM


@app.post("/send", status_code=202)
async def send(req: SendRequest, background: BackgroundTasks):
    """Accept a message and simulate its lifecycle asynchronously.

    Returns 202 immediately; engagement events are delivered later via callbacks.
    """
    background.add_task(simulate_and_callback, req.model_dump())
    return {"accepted": True, "communication_id": req.communication_id}


@app.get("/status/{communication_id}")
def status(communication_id: int):
    """Source-of-truth lifecycle for a message — used by CRM reconciliation to
    recover events whose callbacks were lost. 404 if the channel never saw it."""
    truth = get_truth(communication_id)
    if truth is None:
        return {"communication_id": communication_id, "known": False, "events": []}
    return {"communication_id": communication_id, "known": True, "events": truth}


@app.get("/health")
def health():
    return {"status": "ok", "service": "channel-service"}
