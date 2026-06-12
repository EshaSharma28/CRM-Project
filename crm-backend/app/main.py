"""CRM backend entrypoint. Wires routers and CORS. Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import (
    agent,
    ai_copilot,
    campaigns,
    customers,
    ingest,
    orders,
    receipts,
    rfm,
    segments,
)

app = FastAPI(title="Brewhaus CRM", version="0.1.0")

# Dev convenience: create tables on startup. (Would use Alembic migrations
# for a real deployment — noted as a conscious scope cut.)
Base.metadata.create_all(bind=engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tightened per-environment in production
    allow_methods=["*"],
    allow_headers=["*"],
)

for r in (customers, orders, segments, campaigns, receipts, ai_copilot, rfm, ingest, agent):
    app.include_router(r.router)


@app.get("/health")
def health():
    return {"status": "ok", "service": "crm-backend"}
