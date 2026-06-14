# Deploy Brewhaus (free tiers)

Three services: **2 FastAPI on Render**, **Postgres on Neon**, **React on Vercel**.

## 0. Push to GitHub first
```bash
git add -A && git commit -m "Brewhaus CRM"
git branch -M main
git remote add origin https://github.com/<you>/brewhaus-crm.git
git push -u origin main
```

## 1. Database — Neon (https://neon.tech)
- New project → copy the connection string.
- Change the scheme to `postgresql+psycopg://...` (keep the rest).
- Keep it for `DATABASE_URL` below.

## 2. Backend services — Render (https://render.com)
- New → **Blueprint** → connect the repo → it reads `render.yaml` (2 services).
- Set env vars:
  - **brewhaus-channel**: `WEBHOOK_SECRET` = any random string (remember it).
  - **brewhaus-crm**:
    - `DATABASE_URL` = the Neon URL
    - `CHANNEL_SERVICE_URL` = the channel service's Render URL (e.g. `https://brewhaus-channel.onrender.com`)
    - `CRM_PUBLIC_URL` = the CRM service's own Render URL
    - `WEBHOOK_SECRET` = **same** string as the channel
    - `GEMINI_API_KEY`, `GROQ_API_KEY`, `HF_TOKEN` = your keys
- After first deploy, seed the DB once (Render → brewhaus-crm → Shell):
  ```bash
  python -m app.seed.seed_data 500
  ```

## 3. Frontend — Vercel (https://vercel.com)
- New Project → import the repo → **Root Directory: `web`**.
- Framework: Vite. Build: `npm run build`. Output: `dist`.
- Env var: `VITE_API_URL` = the CRM Render URL.
- Deploy → that public URL is your submission link.

## Notes / tradeoffs
- Render free tier **sleeps after ~15 min idle** (≈30s cold start, and the
  always-on automations pause while asleep). Hit the URL once before recording
  the demo. In production: an always-on instance + a real scheduler.
- `CRM_PUBLIC_URL` must be the real CRM URL so async callbacks and generated
  image links resolve.
- `WEBHOOK_SECRET` must be identical on both services (HMAC verification).
