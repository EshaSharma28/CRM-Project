# web — Brewhaus CRM frontend (React + Vite)

The marketer-facing UI: a **chat panel** (talk to the co-pilot) on one side and a
**campaign dashboard** (live funnel as receipts stream in) on the other.

## Initialise (Day 3)

Scaffolded fresh to keep the dependency tree honest:

```bash
npm create vite@latest . -- --template react
npm install
npm run dev
```

## Planned structure

```
web/
├── index.html
├── package.json
├── .env.example          # VITE_API_URL -> crm-backend
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── api.js            # fetch wrapper around the crm-backend
    ├── components/
    │   ├── CopilotChat.jsx     # goal in -> proposal (audience + draft)
    │   ├── ProposalCard.jsx    # editable segment + message, Approve button
    │   ├── CampaignList.jsx
    │   └── CampaignStats.jsx   # live funnel; polls /campaigns/{id}/stats
    └── styles.css
```

## Key flows

1. Type a goal → `POST /copilot/propose` → render editable proposal.
2. Approve → create segment + campaign → `POST /campaigns/{id}/send`.
3. Watch `GET /campaigns/{id}/stats` update as the channel service calls back.
