import { useEffect, useState } from "react";
import { api } from "../api";

const STEPS = [
  { key: "sent", label: "Sent", color: "#8a7a6d" },
  { key: "delivered", label: "Delivered", color: "#c98a4b" },
  { key: "opened", label: "Opened", color: "#e0a868" },
  { key: "read", label: "Read", color: "#eabb84" },
  { key: "clicked", label: "Clicked", color: "#7bb274" },
];

// Live funnel for one campaign. Polls while the campaign is still in flight.
export default function CampaignStats({ campaignId }) {
  const [stats, setStats] = useState(null);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    if (!campaignId) return;
    setStats(null);
    setInsight("");
    let active = true;

    async function tick() {
      try {
        const s = await api.stats(campaignId);
        if (active) setStats(s);
      } catch {
        /* transient */
      }
    }
    tick();
    const id = setInterval(tick, 1500);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [campaignId]);

  async function getInsight() {
    setLoadingInsight(true);
    try {
      const res = await api.insight(campaignId);
      setInsight(res.summary);
    } finally {
      setLoadingInsight(false);
    }
  }

  if (!campaignId) {
    return (
      <div className="empty-state">
        <p className="muted">Launch a campaign to watch it perform here, live.</p>
      </div>
    );
  }
  if (!stats) return <div className="empty-state muted">Loading…</div>;

  const max = Math.max(stats.audience, 1);
  const pct = (n) => Math.round((n / max) * 100);

  return (
    <div className="stats">
      <div className="stats-top">
        <div className="metric">
          <span className="metric-num">{stats.audience}</span>
          <span className="metric-label">Audience</span>
        </div>
        <div className="metric">
          <span className="metric-num accent">{stats.orders_attributed}</span>
          <span className="metric-label">Orders attributed</span>
        </div>
        <div className="metric">
          <span className="metric-num">{stats.failed}</span>
          <span className="metric-label">Failed</span>
        </div>
      </div>

      <div className="funnel">
        {STEPS.map((s) => (
          <div className="funnel-row" key={s.key}>
            <span className="funnel-label">{s.label}</span>
            <div className="funnel-track">
              <div
                className="funnel-bar"
                style={{ width: `${pct(stats[s.key])}%`, background: s.color }}
              />
            </div>
            <span className="funnel-val">
              {stats[s.key]} <span className="muted small">({pct(stats[s.key])}%)</span>
            </span>
          </div>
        ))}
      </div>

      <div className="insight-block">
        {insight ? (
          <div className="insight">
            <div className="eyebrow">✦ AI read on this campaign</div>
            <p>{insight}</p>
          </div>
        ) : (
          <button className="ghost-btn" onClick={getInsight} disabled={loadingInsight}>
            {loadingInsight ? "Analysing…" : "✦ Explain these results"}
          </button>
        )}
      </div>
    </div>
  );
}
