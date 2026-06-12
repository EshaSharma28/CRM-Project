# Brewhaus CRM — AI-Native Mini CRM for Reaching Shoppers

An AI-native mini CRM for a fictional D2C specialty-coffee brand, **Brewhaus**.
A marketer describes a goal in plain English; an AI co-pilot proposes the
audience, drafts the message, and fires the campaign through a **stubbed channel
service** that asynchronously reports back delivery/open/click events — exactly
how real channel delivery and engagement tracking work.

> Xeno Engineering Take-Home Assignment 2026.

## The product bet (what we chose to build)

A **chat-first campaign co-pilot**, not a generic CRM with lots of screens.

```
Marketer: "win back customers who used to order monthly but went quiet"
   → AI proposes a segment (editable filter + live count)
   → AI drafts a personalised message per channel
   → Human approves
   → Campaign sends via the channel service
   → Dashboard fills in live as delivery/open/click events stream back
```

## Architecture

Three independently deployable pieces + a Postgres database.

```
┌─────────────┐   goal / approve   ┌────────────────────┐
│  web (React)│ ◀────────────────▶ │  crm-backend       │
│  chat +     │   audience/stats   │  (FastAPI)         │
│  dashboard  │                    │  - AI co-pilot     │
└─────────────┘                    │  - Postgres        │
                                   └─────────┬──────────┘
              send(recipient,msg,channel)    │   ▲ receipts (async)
                              ┌──────────────▼───┴────────┐
                              │  channel-service (FastAPI)│
                              │  - simulates delivery     │
                              │  - async callbacks:       │
                              │    delivered/opened/...   │
                              └───────────────────────────┘
```

Why two services: the assignment requires the channel to be a **separate stubbed
service** that calls **back** asynchronously. That callback loop — and how we
handle volume, ordering, retries, and failures — is the system-design centerpiece.

## Repo layout

```
brewhaus-crm/
├── crm-backend/        Main CRM API (FastAPI + SQLAlchemy + Postgres)
│   └── app/
│       ├── main.py         App entrypoint, router wiring
│       ├── config.py       Settings from env
│       ├── database.py     Engine / session
│       ├── models.py       SQLAlchemy tables
│       ├── schemas.py      Pydantic request/response models
│       ├── ai/             Provider-agnostic AI layer (Gemini by default)
│       ├── routers/        HTTP endpoints (customers, orders, segments,
│       │                   campaigns, receipts, ai_copilot)
│       ├── services/       Business logic (segmentation, campaigns, channel client)
│       └── seed/           Persona-driven synthetic data generator
├── channel-service/    Stubbed messaging provider (FastAPI)
│   └── app/
│       ├── main.py         /send endpoint
│       └── simulator.py    Async outcome simulation + callbacks
└── web/                React + Vite UI (chat + dashboard)
```

## Tech stack

- **Backend:** Python, FastAPI, SQLAlchemy, Postgres
- **AI:** Provider-agnostic client; default **Google Gemini** (free tier).
  Swappable to Groq/others via one module.
- **Frontend:** React (Vite)
- **Data:** Fully synthetic, persona-driven (Faker) — no real customer data.

## Local development

See `crm-backend/.env.example` and `channel-service/.env.example`.
Quickstart docs are filled in as each service lands (build is staged across days).

## Conscious scope cuts (would add at scale)

Auth/multi-tenancy, real provider integration, A/B testing, campaign scheduling,
a durable queue (Kafka/SQS) in front of the channel loop. Done synchronously here
for clarity; reasoning is in the walkthrough video.
