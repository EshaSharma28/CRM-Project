// Typed-ish client around the crm-backend REST API.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  health: () => req("/health"),
  summary: () => req("/customers/summary"),
  customers: (qs = "") => req(`/customers${qs}`),
  customer: (id) => req(`/customers/${id}`),
  orders: (qs = "") => req(`/orders${qs}`),

  segmentsPreview: (rules) =>
    req("/segments/preview", { method: "POST", body: JSON.stringify({ rules }) }),
  createSegment: (seg) =>
    req("/segments", { method: "POST", body: JSON.stringify(seg) }),
  segments: () => req("/segments"),

  campaigns: () => req("/campaigns"),
  createCampaign: (c) =>
    req("/campaigns", { method: "POST", body: JSON.stringify(c) }),
  sendCampaign: (id) => req(`/campaigns/${id}/send`, { method: "POST" }),
  stats: (id) => req(`/campaigns/${id}/stats`),
  insight: (id) => req(`/campaigns/${id}/insight`),

  propose: (goal) =>
    req("/copilot/propose", { method: "POST", body: JSON.stringify({ goal }) }),
  launch: (proposal) =>
    req("/copilot/launch", { method: "POST", body: JSON.stringify(proposal) }),
};

export const MODEL_NAME = "gemini-2.5-flash";
