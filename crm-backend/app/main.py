"""CRM backend entrypoint. Wires routers and CORS. Run with:
    uvicorn app.main:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import Base, engine
from app.routers import (
    agent,
    ai_copilot,
    automation,
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

for r in (customers, orders, segments, campaigns, receipts, ai_copilot, rfm, ingest, agent, automation):
    app.include_router(r.router)


@app.on_event("startup")
def _seed_if_empty():
    # On a fresh deploy (e.g. free tier with no shell), auto-seed once so the
    # product has data. Safe: only runs when the customer table is empty.
    from app.database import SessionLocal
    from app.models import Customer

    db = SessionLocal()
    try:
        if db.query(Customer).count() == 0:
            from app.seed.seed_data import seed

            seed(500)
    except Exception as e:  # don't block startup if seeding fails
        print(f"[seed] skipped: {e}")
    finally:
        db.close()


@app.on_event("startup")
def _start_automation_worker():
    # Standing background worker for event-triggered automations (abandoned cart).
    from app.services.automation import start

    start()


@app.get("/health")
def health():
    return {"status": "ok", "service": "crm-backend"}
