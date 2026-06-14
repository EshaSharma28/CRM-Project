// Thin fetch wrapper around the crm-backend.
const BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function req(path, opts = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail.detail || `${res.status} ${res.statusText}`);
  }
  return res.json();
}

export const api = {
  summary: () => req("/customers/summary"),
  rfmSummary: () => req("/rfm/summary"),
  customers: (query = "") => req(`/customers${query}`),
  customer: (id) => req(`/customers/${id}`),
  orders: (query = "") => req(`/orders${query}`),
  segmentsPreview: (rules) => req("/segments/preview", { method: "POST", body: JSON.stringify({ rules }) }),
  createSegment: (segment) => req("/segments", { method: "POST", body: JSON.stringify(segment) }),
  segments: () => req("/segments"),
  
  reconcile: () => req("/receipts/reconcile", { method: "POST" }),
  events: (limit = 50) => req(`/receipts/events?limit=${limit}`),
  campaigns: () => req("/campaigns"),
  previewSegment: (rules) => req("/segments/preview", { method: "POST", body: JSON.stringify({ rules }) }),
  createCampaign: (campaign) => req("/campaigns", { method: "POST", body: JSON.stringify(campaign) }),
  sendCampaign: (id, payload = null) => req(`/campaigns/${id}/send`, { method: "POST", body: payload ? JSON.stringify(payload) : null }),
  stats: (id) => req(`/campaigns/${id}/stats`),
  insight: (id) => req(`/campaigns/${id}/insight`),

  propose: (goal) =>
    req("/copilot/propose", { method: "POST", body: JSON.stringify({ goal }) }),
  draft: (description, channel) =>
    req("/copilot/draft", { method: "POST", body: JSON.stringify({ description, channel }) }),
  genImage: (message, channel) =>
    req("/copilot/image", { method: "POST", body: JSON.stringify({ message, channel }) }),
  chat: (messages, proposal) =>
    req("/copilot/chat", { method: "POST", body: JSON.stringify({ messages, proposal }) }),
  ask: (question) =>
    req("/copilot/ask", { method: "POST", body: JSON.stringify({ question }) }),
  launch: (proposal) =>
    req("/copilot/launch", { method: "POST", body: JSON.stringify(proposal) }),
  assistant: (history, message) =>
    req("/copilot/assistant", { method: "POST", body: JSON.stringify({ history, message }) }),

  agentPlan: (goal) =>
    req("/agent/plan", { method: "POST", body: JSON.stringify({ goal }) }),
  agentRun: (payload) =>
    req("/agent/run", { method: "POST", body: JSON.stringify(payload) }),
  agentJourney: (id) => req(`/agent/journeys/${id}`),

  automationCart: () => req("/automations/abandoned-cart"),
  automationToggle: (enabled) =>
    req("/automations/abandoned-cart/toggle", { method: "POST", body: JSON.stringify({ enabled }) }),
  automationCarts: (limit = 20) => req(`/automations/abandoned-cart/carts?limit=${limit}`),
  birthdayAutomation: () => req("/automations/birthday"),
  birthdayToggle: (enabled) =>
    req("/automations/birthday/toggle", { method: "POST", body: JSON.stringify({ enabled }) }),

  // CSV ingestion (multipart — no JSON content-type header).
  ingestCustomers: (file) => uploadCsv("/ingest/customers", file),
  ingestOrders: (file) => uploadCsv("/ingest/orders", file),
  ingestSmart: (file) => uploadCsv("/ingest/smart", file),
  sampleUrl: (kind) => `${BASE}/ingest/sample/${kind}`,
};

async function uploadCsv(path, file) {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${BASE}${path}`, { method: "POST", body: form });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `${res.status} ${res.statusText}`);
  }
  return res.json();
}
