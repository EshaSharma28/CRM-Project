import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ShoppingBag, XCircle, Sparkles, FlaskConical, Trophy } from "lucide-react";
import { api } from "../api";
import CountUp from "../components/CountUp";

const STEPS = [
  { key: "sent", label: "Sent", color: "#9a8576" },
  { key: "delivered", label: "Delivered", color: "#be7e50" },
  { key: "opened", label: "Opened", color: "#d69a52" },
  { key: "read", label: "Read", color: "#cda96f" },
  { key: "clicked", label: "Clicked", color: "#6fa471" },
];

const inrCompact = (n) =>
  n == null ? "—" : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

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
        const done = s.audience > 0 && s.sent + s.failed >= s.audience;
        if (done) settled.current += 1;
      } catch { }
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
    <div className="max-w-4xl mx-auto space-y-6 pb-20 pt-4">
      <button className="text-sm font-medium text-text/50 hover:text-caramel flex items-center gap-1 mb-2 bg-transparent border-none p-0 w-fit cursor-pointer transition-colors" onClick={() => navigate("/campaigns")}>
        <ArrowLeft size={16} /> All campaigns
      </button>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-3xl font-serif font-bold text-mocha-dark">{meta?.name || `Campaign #${id}`}</h2>
          {meta && <div className="text-text/50 text-sm mt-1 capitalize font-medium">via {meta.channel}</div>}
        </div>
        {live ? (
          <span className="flex items-center gap-2 bg-warning/10 text-warning px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-warning/20 shadow-sm">
            <span className="w-1.5 h-1.5 bg-warning rounded-full animate-ping"></span> Live · receipts arriving
          </span>
        ) : stats ? (
          <span className="bg-[#EEF1EB] text-[#4F6C4E] px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-[#DEE6DA] shadow-sm">Completed</span>
        ) : null}
      </div>

      {!stats ? (
        <div className="card p-12 flex items-center justify-center border border-border shadow-sm rounded-2xl bg-white">
          <div className="w-8 h-8 border-4 border-caramel border-t-transparent rounded-full animate-spin opacity-50"></div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card border border-border shadow-sm p-6 bg-white rounded-2xl">
              <div className="text-[11px] text-text/50 uppercase tracking-widest font-bold mb-2">Audience</div>
              <div className="text-4xl font-serif font-bold text-mocha-dark"><CountUp value={stats.audience} /></div>
            </div>
            <div className="card border border-border shadow-sm p-6 bg-white rounded-2xl">
              <div className="text-[11px] text-text/50 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                <ShoppingBag size={13} /> Orders attributed
              </div>
              <div className="text-4xl font-serif font-bold text-[#BE7E50]"><CountUp value={stats.orders_attributed} /></div>
            </div>
            <div className="card border border-border shadow-sm p-6 bg-white rounded-2xl">
              <div className="text-[11px] text-text/50 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                <XCircle size={13} /> Failed
              </div>
              <div className={`text-4xl font-serif font-bold ${stats.failed ? "text-[#c9695e]" : "text-mocha-dark"}`}><CountUp value={stats.failed} /></div>
            </div>
          </div>

          {stats.variants && <AbComparison variants={stats.variants} significance={stats.ab_significance} />}

          <div className="card p-0 overflow-hidden border border-border shadow-sm bg-white rounded-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center bg-white">
              <h3 className="text-xl font-serif font-bold text-mocha-dark">Engagement funnel</h3>
              <span className="text-[10px] text-text/40 font-bold uppercase tracking-widest">updated from channel receipts</span>
            </div>
            <div className="p-8 bg-[#F7F4F0]/30">
              {STEPS.map((s) => {
                const val = stats[s.key] || 0;
                const p = stats.audience ? Math.round((val / stats.audience) * 100) : 0;
                return (
                  <div className="flex items-center gap-6 mb-5 last:mb-0" key={s.key}>
                    <span className="w-24 text-[13px] font-bold text-mocha-dark uppercase tracking-wider">{s.label}</span>
                    <div className="flex-1 h-3 bg-white border border-border rounded-full overflow-hidden flex shadow-inner">
                      <motion.div className="h-full rounded-full" style={{ background: s.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${p}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                    </div>
                    <span className="w-24 text-right text-base font-serif font-bold text-mocha-dark">
                      {val.toLocaleString()} <span className="text-text/40 text-xs font-sans font-medium ml-1">({p}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="card p-0 overflow-hidden border border-border shadow-sm bg-white rounded-2xl">
            <div className="p-6 border-b border-border flex justify-between items-center bg-white">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#BE7E50]" />
                <h3 className="text-xl font-serif font-bold text-mocha-dark">AI read on this campaign</h3>
              </div>
              <span className="bg-sage/15 text-sage px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-sage/20">insight</span>
            </div>
            <div className="p-8">
              {insight ? (
                <div className="bg-[#F7F4F0] p-6 rounded-xl border border-[#EBE4D9]">
                  <div className="text-[11px] text-[#BE7E50] uppercase tracking-widest font-bold mb-3">✦ Summary & next step</div>
                  <p className="text-mocha-dark text-sm leading-relaxed font-medium">{insight}</p>
                </div>
              ) : (
                <button className="w-full py-4 rounded-xl border border-dashed border-[#BE7E50]/40 text-[#BE7E50] hover:bg-[#BE7E50]/5 transition-colors flex items-center justify-center gap-2 text-sm font-bold shadow-sm" onClick={getInsight} disabled={loadingInsight}>
                  {loadingInsight ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Analysing…</> : <><Sparkles size={16} /> Explain these results</>}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AbComparison({ variants, significance }) {
  const winner = significance?.overall_winner || significance?.winner;
  return (
    <div className="card p-6 border border-border shadow-sm bg-white rounded-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="bg-caramel/15 text-caramel p-1.5 rounded-lg"><FlaskConical className="w-4 h-4" /></div>
          <h3 className="text-xl font-serif font-bold text-mocha-dark">A/B Test Results</h3>
        </div>
        {winner && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-sage/15 text-sage px-3 py-1 rounded-full font-bold">
            <Trophy className="w-3.5 h-3.5" /> Variant {winner} wins
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {["A", "B"].map(id => {
          const v = variants[id];
          if (!v) return null;
          const isWinner = winner === id;
          return (
            <div key={id} className={`rounded-xl border p-5 transition-all ${
              isWinner ? "border-sage bg-sage/5" : "border-border bg-surface/40"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif font-bold text-lg text-mocha-dark">Variant {id}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mb-4">
                <div>
                  <div className="font-serif font-bold text-mocha-dark">{v.sent}</div>
                  <div className="text-[10px] text-text/40 mt-1 uppercase tracking-wider font-bold">Sent</div>
                </div>
                <div>
                  <div className="font-serif font-bold text-mocha-dark">{v.opened}</div>
                  <div className="text-[10px] text-text/40 mt-1 uppercase tracking-wider font-bold">Opened</div>
                </div>
                <div>
                  <div className="font-serif font-bold text-caramel">{v.clicked}</div>
                  <div className="text-[10px] text-text/40 mt-1 uppercase tracking-wider font-bold">Clicked</div>
                </div>
                <div>
                  <div className="font-serif font-bold text-mocha-dark">{v.orders_attributed}</div>
                  <div className="text-[10px] text-text/40 mt-1 uppercase tracking-wider font-bold">Orders</div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-4 border-t border-border/50">
                <div>
                  <div className="text-[10px] text-text/50 uppercase tracking-wider font-bold mb-0.5">Revenue</div>
                  <div className="font-serif font-bold text-mocha-dark">{inrCompact(v.revenue)}</div>
                </div>
                {v.roi_pct != null && (
                  <div className="text-right">
                     <div className="text-[10px] text-text/50 uppercase tracking-wider font-bold mb-0.5">ROAS</div>
                     <div className={`font-bold text-sm ${v.roi_pct >= 0 ? "text-sage" : "text-error"}`}>
                       {v.roi_pct >= 100 
                         ? `${Math.round(v.roi_pct / 100).toLocaleString("en-IN")}×` 
                         : `${v.roi_pct >= 0 ? "+" : ""}${v.roi_pct}%`}
                     </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
