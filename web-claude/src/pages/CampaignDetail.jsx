import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, XCircle, Sparkles, Send } from "lucide-react";
import { api } from "../api";
import { Card, CountUp, Badge, AiPill, Spinner, Empty } from "../components/ui";
import { pct } from "../lib/format";

const STEPS = [
  { key: "sent", label: "Sent", color: "#9a8576" },
  { key: "delivered", label: "Delivered", color: "#be7e50" },
  { key: "opened", label: "Opened", color: "#d69a52" },
  { key: "read", label: "Read", color: "#cda96f" },
  { key: "clicked", label: "Clicked", color: "#6fa471" },
];

export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [meta, setMeta] = useState(null);
  const [insight, setInsight] = useState("");
  const [loadingInsight, setLoadingInsight] = useState(false);
  const settled = useRef(0);

  useEffect(() => {
    api.campaigns().then((cs) => setMeta(cs.find((c) => String(c.id) === String(id)))).catch(() => {});
  }, [id]);

  useEffect(() => {
    setStats(null);
    settled.current = 0;
    let active = true;
    async function tick() {
      try {
        const s = await api.stats(id);
        if (!active) return;
        setStats(s);
        // stop polling once everything has settled for a few cycles
        const done = s.audience > 0 && s.sent + s.failed >= s.audience;
        if (done) settled.current += 1;
      } catch { /* ignore */ }
    }
    tick();
    const iv = setInterval(() => {
      if (settled.current > 3) return;
      tick();
    }, 1500);
    return () => { active = false; clearInterval(iv); };
  }, [id]);

  async function getInsight() {
    setLoadingInsight(true);
    try {
      const r = await api.insight(id);
      setInsight(r.summary);
    } finally {
      setLoadingInsight(false);
    }
  }

  const live = stats && stats.audience > 0 && stats.sent + stats.failed < stats.audience;

  return (
    <div className="stack" style={{ gap: 18, maxWidth: 920 }}>
      <button className="row small muted" style={{ background: "none", border: "none", padding: 0, alignSelf: "flex-start" }} onClick={() => navigate("/campaigns")}>
        <ArrowLeft size={15} /> All campaigns
      </button>

      <div className="between wrap">
        <div>
          <h2 style={{ fontSize: 22 }}>{meta?.name || `Campaign #${id}`}</h2>
          {meta && <div className="muted small" style={{ marginTop: 4 }}>via {meta.channel}</div>}
        </div>
        {live ? <span className="live-badge"><span className="dot" /> Live · receipts arriving</span>
          : stats && <Badge color="#6fa471">Completed</Badge>}
      </div>

      {!stats ? (
        <Card pad className="center" style={{ padding: 40 }}><Spinner size={24} /></Card>
      ) : (
        <>
          <div className="grid cols-3 cols-4-sm2">
            <Card pad>
              <div className="tiny muted">Audience</div>
              <div className="serif" style={{ fontSize: 30 }}><CountUp value={stats.audience} /></div>
            </Card>
            <Card pad>
              <div className="tiny muted row" style={{ gap: 6 }}><ShoppingBag size={13} /> Orders attributed</div>
              <div className="serif accent" style={{ fontSize: 30 }}><CountUp value={stats.orders_attributed} /></div>
            </Card>
            <Card pad>
              <div className="tiny muted row" style={{ gap: 6 }}><XCircle size={13} /> Failed</div>
              <div className="serif" style={{ fontSize: 30, color: stats.failed ? "#c9695e" : undefined }}><CountUp value={stats.failed} /></div>
            </Card>
          </div>

          <Card>
            <div className="card-head between">
              <h3>Engagement funnel</h3>
              <span className="tiny muted">updated from channel receipts</span>
            </div>
            <div className="card-pad funnel">
              {STEPS.map((s) => {
                const val = stats[s.key];
                const p = pct(val, stats.audience);
                return (
                  <div className="funnel-row" key={s.key}>
                    <span className="funnel-label">{s.label}</span>
                    <div className="funnel-track">
                      <motion.div className="funnel-bar" style={{ background: s.color }}
                        animate={{ width: `${p}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                    </div>
                    <span className="funnel-val">{val} <span className="muted tiny">({p}%)</span></span>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card>
            <div className="card-head between">
              <div className="row" style={{ gap: 9 }}><Sparkles size={16} style={{ color: "#a9683b" }} /><h3>AI read on this campaign</h3></div>
              <AiPill>insight</AiPill>
            </div>
            <div className="card-pad">
              {insight ? (
                <div className="insight"><div className="eyebrow">✦ Summary & next step</div><p>{insight}</p></div>
              ) : (
                <button className="btn btn-ghost btn-block" onClick={getInsight} disabled={loadingInsight}>
                  {loadingInsight ? <><Spinner /> Analysing…</> : <><Sparkles size={15} /> Explain these results</>}
                </button>
              )}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
