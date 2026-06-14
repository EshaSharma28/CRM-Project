# Brewhaus — AI-Native Mini CRM for Reaching Shoppers

An AI-native marketing CRM for a fictional D2C specialty-coffee brand, **Brewhaus**.
A marketer states a goal in plain English; an AI co-pilot finds the audience,
writes the message, and sends it through a **stubbed channel service** that
asynchronously reports delivery/engagement back — exactly how real channel
delivery and engagement tracking work.

> Xeno Engineering Take-Home Assignment 2026.

---

## The product bet

A **chat-first, AI-native** CRM — not a generic dashboard with lots of screens.
AI is woven through the product in all four shapes the brief describes:

| Shape (from brief) | In Brewhaus |
|---|---|
| Classic UI, AI assists at steps | Audience builder + AI draft/regenerate, AI image generation |
| Chat-first, NL intent | **Crema** co-pilot (multi-turn) + **Ask your data** analytics chat |
| AI that thinks/decides/acts | Co-pilot surfaces audience, recommends message, picks channel |
| **True AI agent** | **Autonomous agent** plans a multi-step journey and runs it itself |

Plus **always-on automations** (abandoned-cart recovery, birthday offers) that
run continuously on live shopper activity.

---

## Architecture

Three independently deployable services + a Postgres database.

```
┌──────────────┐   goal / approve   ┌────────────────────────┐
│  web (React) │ ◀────────────────▶ │  crm-backend (FastAPI) │
│  chat +      │   audience/stats   │  - AI (Gemini→Groq)    │
│  dashboards  │                    │  - segmentation + RFM  │
└──────────────┘                    │  - campaigns, agent    │
                                    │  - automations worker  │
                                    │  - Postgres            │
                  send(recipient,   └───────────┬────────────┘
                  message, channel)             │  ▲ signed receipts (async)
                              ┌──────────────────▼──┴───────────┐
                              │  channel-service (FastAPI)       │
                              │  - per-channel lifecycle sim     │
                              │  - async out-of-order callbacks  │
                              │  - HMAC-signed, retries, drops   │
                              │  - GET /status (reconciliation)  │
                              └──────────────────────────────────┘
```

Why two services: the brief requires the channel to be a **separate stubbed
service** calling **back** asynchronously. That callback loop — and how we handle
volume, ordering, retries and failures — is the system-design centerpiece.

---

## The Channel Service (system-design centerpiece)

A separate service that **simulates** a messaging provider (no real delivery):

- CRM `POST /campaigns/{id}/send` fans messages out to the channel service.
- The channel **simulates a per-channel lifecycle** and **calls back asynchronously**:
  - email: `sent → delivered → opened → clicked`
  - sms: `sent → delivered → clicked` (no open/read tracking)
  - whatsapp / rcs: `sent → delivered → read → clicked` (read receipts)
  - or `→ failed`
- The CRM `/receipts` API ingests callbacks and updates each communication.

Robustness we model (the part the brief cares about most):

| Concern | How |
|---|---|
| **Volume** | Bounded-concurrency worker pool (16) + chunked, batched DB writes |
| **Ordering** | Callbacks arrive out-of-order; state only ever advances forward |
| **Retries** | Exponential backoff on both send (CRM→channel) and callback (channel→CRM) |
| **Failures** | Simulated delivery failures + **dropped callbacks** |
| **Lost callbacks** | **Reconciliation** sweep pulls truth from the channel's `GET /status/{id}` |
| **Idempotency** | Receipts deduped by `event_id` (DB primary key) |
| **Authenticity** | Callbacks **HMAC-signed**; CRM verifies over raw bytes (forged → 401) |

---

## Features

- **Ingest** — persona-driven synthetic data (~500 shoppers, ~3k orders) **+ CSV import** (customers & orders), which recomputes derived fields + RFM.
- **Segment** — validated rule engine (no model-authored SQL), **RFM** scoring + named segments, gender/channel/lifecycle filters.
- **AI co-pilot (Crema)** — multi-turn: goal → audience + message + channel → launch. Data-grounded, self-correcting.
- **Autonomous agent** — one goal → multi-step journey (re-targets non-engagers on another channel) → executes itself over (compressed) time.
- **Ask your data** — NL question → safe structured query → number/chart (shoppers & orders, time windows, trends).
- **AI image generation** — rich-media images per message (Hugging Face FLUX), per-channel (SMS stays text-only).
- **Campaigns** — personalised sends, **A/B testing with a statistical-significance test**, live funnel.
- **Insights** — sent/delivered/opened/read/clicked/failed + **order attribution** (propensity-based) + revenue/ROI.
- **Automations** — abandoned-cart recovery + birthday offers, event-triggered, always-on, live.

---

## Tech stack

- **Backend:** Python · FastAPI · SQLAlchemy · Postgres (SQLite for local dev)
- **AI:** provider-agnostic layer — **Gemini** primary, **Groq** automatic fallback; **Hugging Face** for images
- **Frontend:** React · Vite · Tailwind · framer-motion · Recharts
- **Data:** fully synthetic, persona-driven (no real customer data)

---

## Repo layout

```
brewhaus-crm/
├── crm-backend/        FastAPI CRM
│   └── app/
│       ├── routers/        HTTP endpoints (customers, segments, campaigns,
│       │                   receipts, ai_copilot, agent, automation, rfm, ingest)
│       ├── services/       business logic (segmentation, campaign fan-out,
│       │                   channel_client, analytics, agent, automation,
│       │                   reconcile, rfm, derive)
│       ├── ai/             provider-agnostic AI client + prompts
│       ├── models.py       SQLAlchemy schema
│       └── seed/           persona-driven data generator
├── channel-service/    stubbed messaging provider (FastAPI)
└── web/                React + Vite UI
```

---

## Run locally

```bash
# 1. Channel service (port 8001)
cd channel-service && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8001

# 2. CRM backend (port 8000) — copy .env.example to .env, add keys
cd crm-backend && python -m venv .venv && . .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # set GEMINI_API_KEY (+ optional GROQ_API_KEY, HF_TOKEN)
python -m app.seed.seed_data 500   # generate data
uvicorn app.main:app --port 8000

# 3. Frontend (port 5173)
cd web && npm install
npm run dev
```

Local dev uses SQLite (`DATABASE_URL=sqlite:///./brewhaus_dev.db`); production
points `DATABASE_URL` at Postgres. Demo login: `marketer@brewhaus.coffee` / `brewhaus`.

---

## Conscious tradeoffs (what I'd do at scale)

- **In-process fan-out → durable queue.** The worker pool models the producer/
  consumer pattern; at scale it becomes Kafka/SQS + autoscaled consumers + a
  dead-letter queue. Same shape, different transport.
- **Compressed time.** Agent waits ("3 days") and automation thresholds ("2 hours")
  are compressed to seconds so they're observable in a demo; production uses a real scheduler.
- **Simulated live data.** A background generator streams cart/birthday events;
  swap it for a real storefront webhook and nothing downstream changes.
- **Attribution.** Single-channel last-touch within a window; real attribution
  needs multi-touch + identity resolution + incrementality testing.
- **AI images.** Generated to demonstrate the capability; a real brand uses an
  approved asset library for brand safety.
- **Schema.** `create_all` on startup; production would use Alembic migrations.
- **Auth.** Lightweight demo gate; production needs real auth + multi-brand tenancy.
