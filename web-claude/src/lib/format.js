// Small presentation helpers.

export const inr = (n) =>
  n == null ? "—" : "₹" + Math.round(n).toLocaleString("en-IN");

export const pct = (num, den) =>
  !den ? 0 : Math.round((num / den) * 100);

export function daysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso);
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}

export function relativeDate(iso) {
  const days = daysSince(iso);
  if (days == null) return "—";
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export const LIFECYCLE_META = {
  new: { label: "New", color: "#8FA587" },
  active: { label: "Active", color: "#6FA471" },
  at_risk: { label: "At risk", color: "#D69A52" },
  lapsed: { label: "Lapsed", color: "#C9695E" },
  churned: { label: "Churned", color: "#9A8576" },
};

export const PERSONA_LABELS = {
  loyal_subscriber: "Loyal subscriber",
  lapsing_regular: "Lapsing regular",
  one_time_tryer: "One-time tryer",
  discount_hunter: "Discount hunter",
  new_promising: "New & promising",
  seasonal_gifter: "Seasonal gifter",
};

export const CHANNEL_META = {
  whatsapp: { label: "WhatsApp", color: "#6FA471" },
  email: { label: "Email", color: "#BE7E50" },
  sms: { label: "SMS", color: "#8FA587" },
  rcs: { label: "RCS", color: "#9A7BB0" },
};

export const titleCase = (s = "") =>
  s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
