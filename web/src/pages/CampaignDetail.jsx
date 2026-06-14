import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "../api";
import CountUp from "../components/CountUp";

const STEPS = [
  { key: "sent", label: "Sent", color: "#9a8576" },
  { key: "delivered", label: "Delivered", color: "#8c6b5d" },
  { key: "opened", label: "Opened", color: "#be7e50" },
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
    <div className="relative min-h-full">
      {/* Faded Background Cliparts */}
      <div className="fixed bottom-[2%] right-[5%] w-full max-w-[350px] opacity-[0.06] pointer-events-none z-0">
        <img src="/audience-bg-bottom.png" alt="" className="w-full h-auto object-contain" />
      </div>

      <div className="p-8 max-w-5xl mx-auto space-y-6 relative z-10">
        <button className="font-label-md text-on-surface-variant hover:text-primary flex items-center gap-1.5 bg-transparent border-none p-0 w-fit cursor-pointer transition-colors" onClick={() => navigate("/campaigns")}>
          <span className="material-symbols-outlined text-[18px]">arrow_back</span> All campaigns
        </button>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h2 className="font-headline-xl text-headline-xl text-on-surface">{meta?.name || `Campaign #${id}`}</h2>
            {meta && <div className="text-on-surface-variant font-label-md mt-1 capitalize">via {meta.channel}</div>}
          </div>
          {live ? (
            <span className="flex items-center gap-2 bg-warning/10 text-warning px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-warning/20 shadow-sm">
              <span className="w-1.5 h-1.5 bg-warning rounded-full animate-ping"></span> Live · receipts arriving
            </span>
          ) : stats ? (
            <span className="bg-sage/15 text-sage px-3 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border border-sage/20 shadow-sm">Completed</span>
          ) : null}
        </div>

        {!stats ? (
          <div className="bg-surface-container-lowest p-12 flex items-center justify-center border border-outline-variant/30 shadow-sm rounded-xl glass-effect">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin opacity-50"></div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-6 rounded-xl glass-effect">
                <div className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-3">Audience</div>
                <div className="font-headline-lg text-headline-lg text-on-surface"><CountUp value={stats.audience} /></div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-6 rounded-xl glass-effect">
                <div className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">local_mall</span> Orders attributed
                </div>
                <div className="font-headline-lg text-headline-lg text-primary"><CountUp value={stats.orders_attributed} /></div>
              </div>
              <div className="bg-surface-container-lowest border border-outline-variant/30 shadow-sm p-6 rounded-xl glass-effect">
                <div className="font-label-sm text-on-surface-variant uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px]">error</span> Failed
                </div>
                <div className={`font-headline-lg text-headline-lg ${stats.failed ? "text-error" : "text-on-surface"}`}><CountUp value={stats.failed} /></div>
              </div>
            </div>

            {stats.variants && <AbComparison variants={stats.variants} significance={stats.ab_significance} />}

            <div className="bg-surface-container-lowest overflow-hidden border border-outline-variant/30 shadow-sm rounded-xl glass-effect">
              <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest/50">
                <h3 className="font-headline-md text-headline-md text-on-surface">Engagement funnel</h3>
                <span className="font-label-sm text-on-surface-variant uppercase tracking-widest">updated from channel receipts</span>
              </div>
              <div className="p-8 bg-surface-container-low/30">
                {STEPS.map((s) => {
                  const val = stats[s.key] || 0;
                  const p = stats.audience ? Math.round((val / stats.audience) * 100) : 0;
                  return (
                    <div className="flex items-center gap-6 mb-5 last:mb-0" key={s.key}>
                      <span className="w-24 font-label-md text-on-surface uppercase tracking-wider">{s.label}</span>
                      <div className="flex-1 h-3 bg-surface-container-highest border border-outline-variant/20 rounded-full overflow-hidden flex shadow-inner">
                        <motion.div className="h-full rounded-full" style={{ background: s.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${p}%` }} transition={{ duration: 0.6, ease: "easeOut" }} />
                      </div>
                      <span className="w-24 text-right font-headline-sm text-on-surface">
                        {val.toLocaleString()} <span className="text-on-surface-variant font-label-sm ml-1">({p}%)</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-surface-container-lowest overflow-hidden border border-outline-variant/30 shadow-sm rounded-xl glass-effect">
              <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest/50">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">auto_awesome</span>
                  <h3 className="font-headline-md text-headline-md text-on-surface">AI read on this campaign</h3>
                </div>
                <span className="bg-tertiary/10 text-tertiary px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider border border-tertiary/20">insight</span>
              </div>
              <div className="p-8">
                {insight ? (
                  <div className="bg-primary text-on-primary p-8 rounded-xl shadow-md border border-primary-fixed/20">
                    <div className="font-label-md text-primary-fixed mb-4 uppercase tracking-wider font-bold">✦ Summary & next step</div>
                    <p className="text-on-primary text-base leading-relaxed font-medium">{insight}</p>
                  </div>
                ) : (
                  <button className="w-full py-4 rounded-xl border border-dashed border-primary/40 text-primary hover:bg-primary/5 transition-colors flex items-center justify-center gap-2 font-label-md shadow-sm" onClick={getInsight} disabled={loadingInsight}>
                    {loadingInsight ? <><div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div> Analysing…</> : <><span className="material-symbols-outlined text-[18px]">auto_awesome</span> Explain these results</>}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AbComparison({ variants, significance }) {
  const winner = significance?.overall_winner || significance?.winner;
  return (
    <div className="bg-surface-container-lowest p-8 border border-outline-variant/30 shadow-sm rounded-xl glass-effect">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-xl"><span className="material-symbols-outlined">science</span></div>
          <h3 className="font-headline-md text-headline-md text-on-surface">A/B Test Results</h3>
        </div>
        {winner && (
          <span className="inline-flex items-center gap-1.5 font-label-sm bg-sage/15 text-sage px-3 py-1.5 rounded-full uppercase tracking-wider">
            <span className="material-symbols-outlined text-[16px]">emoji_events</span> Variant {winner} wins
          </span>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {["A", "B"].map(id => {
          const v = variants[id];
          if (!v) return null;
          const isWinner = winner === id;
          return (
            <div key={id} className={`rounded-xl border p-6 transition-all ${
              isWinner ? "border-sage bg-sage/5" : "border-outline-variant/30 bg-surface-container-low/50"
            }`}>
              <div className="flex items-center justify-between mb-6">
                <span className="font-headline-sm text-on-surface">Variant {id}</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center mb-6">
                <div>
                  <div className="font-headline-sm text-on-surface">{v.sent}</div>
                  <div className="font-label-sm text-on-surface-variant mt-1 uppercase tracking-wider">Sent</div>
                </div>
                <div>
                  <div className="font-headline-sm text-on-surface">{v.opened}</div>
                  <div className="font-label-sm text-on-surface-variant mt-1 uppercase tracking-wider">Opened</div>
                </div>
                <div>
                  <div className="font-headline-sm text-primary">{v.clicked}</div>
                  <div className="font-label-sm text-on-surface-variant mt-1 uppercase tracking-wider">Clicked</div>
                </div>
                <div>
                  <div className="font-headline-sm text-on-surface">{v.orders_attributed}</div>
                  <div className="font-label-sm text-on-surface-variant mt-1 uppercase tracking-wider">Orders</div>
                </div>
              </div>
              <div className="flex justify-between items-center pt-5 border-t border-outline-variant/20">
                <div>
                  <div className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">Revenue</div>
                  <div className="font-headline-sm text-on-surface">{inrCompact(v.revenue)}</div>
                </div>
                {v.roas != null && (
                  <div className="text-right">
                     <div className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-1">ROAS</div>
                     <div className={`font-label-md ${v.roas >= 1 ? "text-sage" : "text-error"}`}>
                       {v.roas}× <span className="text-on-surface-variant font-normal">return</span>
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
