# Brewhaus — AI-Native Mini CRM for Reaching Shoppers

An AI-native marketing CRM for a fictional D2C specialty-coffee brand, **Brewhaus**.
A marketer states a goal in plain English; an AI co-pilot finds the audience,
writes the message, and sends it through a **stubbed channel service** that
asynchronously reports delivery/engagement back — exactly how real channel
delivery and engagement tracking work.

> Xeno Engineering Take-Home Assignment 2026.

![Python](https://img.shields.io/badge/Python-3.12-3776AB?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![React](https://img.shields.io/badge/React-Vite-61DAFB?logo=react&logoColor=white)
![Postgres](https://img.shields.io/badge/Postgres-16-4169E1?logo=postgresql&logoColor=white)
![AI](https://img.shields.io/badge/AI-Gemini%20%E2%86%92%20Groq%20fallback-8E75B2)
![Deploy](https://img.shields.io/badge/Deploy-Render%20%2B%20Vercel-46E3B7)

**🔗 Live demo:** https://brewhaus-sigma.vercel.app  ·  **Demo login:** `marketer@brewhaus.coffee` / `brewhaus`

*(Free-tier backend sleeps when idle — first load may take ~40s to wake.)*

---

## 🎯 The product bet

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

## 🏗 Architecture

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

## 🔌 The Channel Service (system-design centerpiece)

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

## ✨ Features

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

## 🖥 Every screen — what it does & why

| Screen | What it does | Why it exists |
|---|---|---|
| **Dashboard** | KPI tiles (shoppers, open rate, orders), lifecycle & persona charts, **RFM board**, recent campaigns | One glance at base health + a fast path into the co-pilot |
| **Crema** (co-pilot) | Chat-first: goal → audience (RFM rules + live count) → drafted message → AI image → A/B → launch | The core AI-native bet — the marketer's main surface |
| **Autonomous agent** | One goal → a multi-step journey that executes itself, re-targeting non-engagers on another channel | The brief's "true AI agent" shape |
| **Automations** | Always-on abandoned-cart recovery + birthday offers, running on live shopper activity | Lifecycle revenue without a human pressing send |
| **Analytics Studio** | Channel performance, ROAS, revenue, top-campaign leaderboard | Aggregate view of what's working |
| **Audiences** | Visual segment builder with a live count + sample | Carve audiences by hand when you don't want the AI to |
| **Campaigns / detail** | List + live funnel (sent→delivered→opened→read→clicked), orders, revenue, **A/B significance**, AI insight | Where a send's performance surfaces |
| **Shoppers** | Searchable table + RFM/channel/gender filters + a profile drawer with order history | Browse and understand individual customers |
| **Import** | Drag-drop **any** CSV — the AI maps your column names to the model, ingests customers + orders, recomputes derived fields + RFM | Makes "ingest data" a real, forgiving path, not just the seed |
| **Activity** | Live channel webhook feed + a **Reconcile lost events** button | Makes the async callback loop (and its self-healing) visible |
| **Floating assistant** | A global AI helper to ask questions about the data or start a campaign from any screen | Keeps the product chat-first everywhere |

## 🛠 Tech stack

| Layer | Choice | Why |
|---|---|---|
| Backend | **FastAPI** + SQLAlchemy | Async-friendly, typed, fast to ship; one language across CRM + channel |
| Database | **Postgres** (SQLite locally) | Relational fits the CRM data model; zero-setup local dev |
| AI | **Gemini → Groq** (provider-agnostic) + **Hugging Face** images | Free tiers; automatic failover so a rate limit never breaks the demo |
| Frontend | **React + Vite + Tailwind** · framer-motion · Recharts | Fast HMR, utility styling, smooth motion + charts |
| Channel service | Separate **FastAPI** app | Deliberately isolated to model real provider/callback boundaries |
| Deploy | **Render** (APIs) + **Neon** (DB) + **Vercel** (web) | All free-tier, Git-connected |
| Data | Fully synthetic, **persona-driven** | Realistic behaviour to segment on — no real customer data |

---

## 📁 Repo layout

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

## 🚀 Run locally

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

## ⚖️ Conscious tradeoffs (what I'd do at scale)

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

## ⚠️ Known limitations & honest notes

Things I consciously left incomplete, and why — so nothing here is a surprise:

- **Settings is a UI placeholder.** The screen renders the form fields a real
  settings page would have, but it is **not wired to persistence** — there's no
  user/preferences store behind it yet. I prioritised the core marketing loop
  (segment → send → measure → automate) over account configuration, which adds
  no signal to what the brief evaluates. It would be backed by a simple
  preferences table per workspace.
- **Auth is a demo gate.** A single client-side demo login, not real
  authentication. Production would need proper auth, sessions, and multi-brand
  tenancy.
- **Free-tier hosting sleeps.** On Render's free tier the services spin down
  after ~15 min idle (≈30–50s cold start), and the always-on automation worker
  pauses while asleep. Opening the URL wakes it. A paid always-on instance + a
  real scheduler removes this.
- **AI runs on free quotas.** Gemini's free tier is limited, so the app
  **automatically falls back to Groq**; images use Hugging Face's free tier
  (rate-limited, occasional cold start). The provider-agnostic layer makes
  swapping or adding a provider a one-file change.
- **A few early campaigns show empty funnels.** Campaigns created before the
  production callback URL was configured never received their callbacks, and the
  channel's in-memory truth for them is gone, so reconciliation can't recover
  them. New campaigns and the live automations are correct.
- **Channel truth store is in-memory.** The channel service remembers each
  message's outcome in memory (for reconciliation). If it restarts, that memory
  is lost. A real provider persists this.

None of these affect the core loop the assignment is about — they're scope
boundaries I drew on purpose to spend time where it mattered.
