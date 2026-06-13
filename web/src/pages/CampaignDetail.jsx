import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { api } from "../api";
import { ArrowLeft, Sparkles, Activity, AlertCircle, ShoppingBag, TrendingUp, FlaskConical, Trophy } from "lucide-react";
import { motion } from "framer-motion";

const inrCompact = (n) =>
  n == null ? "—" : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState(null);
  const [stats, setStats] = useState(null);
  const [insight, setInsight] = useState(null);

  useEffect(() => {
    // Initial fetch
    const fetchAll = async () => {
      try {
        const camps = await api.campaigns();
        const camp = camps.find(c => String(c.id) === String(id));
        setCampaign(camp);

        if (camp) {
          const st = await api.stats(id);
          setStats(st);
          
          if (camp.status === 'sent') {
            api.insight(id).then(setInsight).catch(console.error);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchAll();
  }, [id]);

  // Polling logic
  useEffect(() => {
    if (!campaign || campaign.status === 'sent') return;

    const interval = setInterval(async () => {
      try {
        const st = await api.stats(id);
        setStats(st);
        
        // Also poll campaign status to see if it finished
        const camps = await api.campaigns();
        const camp = camps.find(c => String(c.id) === String(id));
        if (camp) {
          setCampaign(camp);
          if (camp.status === 'sent') {
            api.insight(id).then(setInsight).catch(console.error);
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error("Polling error", e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [campaign?.status, id]);

  if (!campaign || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-caramel border-t-transparent rounded-full animate-spin"></div>
          <p className="text-text/50">Loading campaign data...</p>
        </div>
      </div>
    );
  }

  const funnelSteps = [
    { label: "Audience", value: stats.audience },
    { label: "Sent", value: stats.sent },
    { label: "Delivered", value: stats.delivered },
    { label: "Opened", value: stats.opened },
    { label: "Clicked", value: stats.clicked },
  ];

  const maxVal = stats.audience || 1;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <Link to="/campaigns" className="text-sm text-text/50 hover:text-caramel flex items-center gap-1 mb-4 w-fit">
          <ArrowLeft className="w-4 h-4" /> Back to Campaigns
        </Link>
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-serif font-bold text-mocha-dark">{campaign.name}</h1>
            <p className="text-text/60 mt-1 capitalize">Channel: {campaign.channel}</p>
          </div>
          <div className="flex items-center gap-3">
             {campaign.status === 'sending' && (
               <span className="flex items-center gap-2 text-warning bg-warning/10 px-3 py-1.5 rounded-full font-medium text-sm border border-warning/20">
                 <span className="w-2 h-2 rounded-full bg-warning animate-ping"></span> Live Sending
               </span>
             )}
             {campaign.status === 'sent' && (
               <span className="text-success bg-success/10 px-3 py-1.5 rounded-full font-medium text-sm border border-success/20">
                 Completed
               </span>
             )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Col: Funnel & Insights */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="card">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-serif font-bold">Delivery Funnel</h2>
              {campaign.status === 'sending' && <Activity className="w-5 h-5 text-caramel animate-pulse" />}
            </div>
            
            <div className="space-y-4">
              {funnelSteps.map((step, i) => {
                const percentage = Math.round((step.value / maxVal) * 100) || 0;
                return (
                  <div key={step.label} className="relative">
                    <div className="flex justify-between text-sm mb-1 font-medium text-mocha-dark">
                      <span>{step.label}</span>
                      <motion.span
                        key={step.value}
                        initial={{ scale: 1.2, color: '#BE7E50' }}
                        animate={{ scale: 1, color: '#2C211B' }}
                        transition={{ duration: 0.3 }}
                      >
                        {step.value.toLocaleString()} <span className="text-text/40 font-normal ml-1">({percentage}%)</span>
                      </motion.span>
                    </div>
                    <div className="h-3 bg-surface rounded-full overflow-hidden">
                      <motion.div 
                        className="h-full bg-caramel rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ type: "spring", stiffness: 50, damping: 15 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-sage/5 border-sage/20">
              <p className="text-xs font-medium text-sage mb-1 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" /> Revenue
              </p>
              <h3 className="text-2xl font-serif font-bold text-mocha-dark">{inrCompact(stats.attributed_revenue)}</h3>
              {stats.est_cost > 0 && (
                <p className="text-[11px] text-text/50 mt-1">
                  cost {inrCompact(stats.est_cost)} · {Math.round(stats.attributed_revenue / stats.est_cost).toLocaleString("en-IN") || 0}× ROAS
                </p>
              )}
            </div>
            <div className="card bg-success/5 border-success/20">
              <p className="text-xs font-medium text-success mb-1 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5" /> Orders
              </p>
              <h3 className="text-2xl font-serif font-bold text-success-dark">{stats.orders_attributed}</h3>
            </div>
            <div className="card">
              <p className="text-xs font-medium text-text/60 mb-1">Open rate</p>
              <h3 className="text-2xl font-serif font-bold text-mocha-dark">
                {stats.sent ? Math.round((stats.opened / stats.sent) * 100) : 0}%
              </h3>
            </div>
            <div className="card bg-error/5 border-error/20">
              <p className="text-xs font-medium text-error mb-1 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> Failed
              </p>
              <h3 className="text-2xl font-serif font-bold text-error-dark">{stats.failed}</h3>
            </div>
          </div>

          {/* A/B comparison — only when the campaign has a B variant */}
          {stats.variants && <AbComparison variants={stats.variants} significance={stats.ab_significance} />}

          {/* AI Insight Panel */}
          {campaign.status === 'sent' && insight && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="card border-l-4 border-l-sage bg-gradient-to-r from-sage/5 to-transparent relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <Sparkles className="w-24 h-24" />
              </div>
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                   <div className="bg-sage/20 text-sage p-1.5 rounded-lg">
                     <Sparkles className="w-4 h-4" />
                   </div>
                   <h2 className="text-lg font-serif font-bold text-mocha-dark">✦ Explain these results</h2>
                </div>
                <p className="text-mocha-dark leading-relaxed font-medium">
                  {insight.summary}
                </p>
              </div>
            </motion.div>
          )}

          {campaign.status === 'sending' && (
            <div className="card border border-dashed border-border bg-surface/30 flex items-center justify-center p-8 text-text/50">
               <p className="flex items-center gap-2"><Sparkles className="w-4 h-4" /> AI insights will be available once sending completes.</p>
            </div>
          )}

        </div>

        {/* Right Col: Details */}
        <div className="space-y-6">
          <div className="card">
             <h2 className="text-lg font-serif font-bold mb-4">Configuration</h2>
             {campaign.message_template_b && (
               <span className="inline-flex items-center gap-1.5 text-xs bg-caramel/10 text-caramel px-2.5 py-1 rounded-full font-medium mb-3">
                 <FlaskConical className="w-3.5 h-3.5" /> A/B test
               </span>
             )}
             <dl className="space-y-3 text-sm">
               <div>
                 <dt className="text-text/50">Campaign ID</dt>
                 <dd className="font-medium font-mono text-xs">{campaign.id}</dd>
               </div>
               <div>
                 <dt className="text-text/50">Target Audience</dt>
                 <dd className="font-medium">Selected Segment ({stats.audience} users)</dd>
               </div>
               <div>
                 <dt className="text-text/50">Channel</dt>
                 <dd className="font-medium capitalize">{campaign.channel}</dd>
               </div>
             </dl>
          </div>
        </div>

      </div>
    </div>
  );
}

function AbComparison({ variants, significance }) {
  const a = variants.A;
  const b = variants.B;
  const sig = significance || {};
  const tests = sig.tests || {};
  const winner = sig.overall_winner || sig.winner;

  const metricRows = [
    { key: "open_rate", label: "Open Rate", icon: "📬" },
    { key: "click_rate", label: "Click Rate", icon: "🖱️" },
    { key: "conversion_rate", label: "Conversion", icon: "🛒" },
  ];

  return (
    <div className="card space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-caramel/15 text-caramel p-1.5 rounded-lg"><FlaskConical className="w-4 h-4" /></div>
          <h2 className="text-lg font-serif font-bold">A/B Test Results</h2>
        </div>
        {winner && (
          <span className="inline-flex items-center gap-1.5 text-xs bg-sage/15 text-sage px-3 py-1 rounded-full font-bold">
            <Trophy className="w-3.5 h-3.5" /> Variant {winner} wins
          </span>
        )}
      </div>

      {/* Variant cards — side by side */}
      <div className="flex flex-col sm:flex-row gap-3">
        {["A", "B"].map(id => {
          const v = variants[id];
          const isWinner = winner === id;
          return (
            <div key={id} className={`flex-1 rounded-2xl border p-4 transition-all ${
              isWinner ? "border-sage bg-sage/5 shadow-sm shadow-sage/10" : "border-border bg-surface/40"
            }`}>
              <div className="flex items-center justify-between mb-4">
                <span className="font-serif font-bold text-lg text-mocha-dark">Variant {id}</span>
                {isWinner && (
                  <span className="inline-flex items-center gap-1 text-[10px] bg-sage/20 text-sage px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                    <Trophy className="w-3 h-3" /> Winner
                  </span>
                )}
              </div>
              {/* Mini funnel */}
              <div className="grid grid-cols-4 gap-1.5 text-center mb-3">
                <MiniStat label="Sent" value={v.sent} />
                <MiniStat label="Opened" value={v.opened} sub={`${v.open_rate}%`} />
                <MiniStat label="Clicked" value={v.clicked} sub={`${v.click_rate}%`} highlight />
                <MiniStat label="Orders" value={v.orders_attributed} sub={`${v.conversion_rate || 0}%`} />
              </div>
              {/* Revenue row */}
              <div className="flex items-center justify-between pt-3 border-t border-border/50">
                <div>
                  <div className="text-[10px] text-text/50 uppercase tracking-wider">Revenue</div>
                  <div className="font-serif font-bold text-mocha-dark">
                    {v.revenue != null ? (v.revenue >= 1e5 ? `₹${(v.revenue / 1e5).toFixed(1)}L` : `₹${Math.round(v.revenue).toLocaleString("en-IN")}`) : "—"}
                  </div>
                </div>
                {v.roi_pct != null && (
                  <div className="text-right">
                    <div className="text-[10px] text-text/50 uppercase tracking-wider">ROAS</div>
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

      {/* Multi-metric significance table */}
      {Object.keys(tests).length > 0 && (
        <div className="rounded-xl border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface/60 text-text/60">
                <th className="text-left px-4 py-2.5 font-medium">Metric</th>
                <th className="text-center px-3 py-2.5 font-medium">A</th>
                <th className="text-center px-3 py-2.5 font-medium">B</th>
                <th className="text-center px-3 py-2.5 font-medium">Lift</th>
                <th className="text-center px-3 py-2.5 font-medium">Confidence</th>
                <th className="text-center px-3 py-2.5 font-medium">Result</th>
              </tr>
            </thead>
            <tbody>
              {metricRows.map(({ key, label, icon }) => {
                const t = tests[key];
                if (!t) return null;
                return (
                  <tr key={key} className="border-t border-border/50 hover:bg-surface/30 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-mocha-dark">
                      <span className="mr-1.5">{icon}</span>{label}
                      {key === sig.primary_metric && (
                        <span className="ml-1.5 text-[9px] bg-caramel/10 text-caramel px-1.5 py-0.5 rounded font-semibold uppercase">Primary</span>
                      )}
                    </td>
                    <td className={`text-center px-3 py-2.5 font-mono text-xs ${t.leader === "A" ? "font-bold text-mocha-dark" : "text-text/60"}`}>
                      {t.a_rate}%
                    </td>
                    <td className={`text-center px-3 py-2.5 font-mono text-xs ${t.leader === "B" ? "font-bold text-mocha-dark" : "text-text/60"}`}>
                      {t.b_rate}%
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {t.lift_pct != null ? (
                        <span className={`inline-flex items-center gap-0.5 font-mono text-xs font-bold ${t.lift_pct > 0 ? "text-sage" : "text-error"}`}>
                          {t.lift_pct > 0 ? "↑" : "↓"}{Math.abs(t.lift_pct)}%
                        </span>
                      ) : <span className="text-text/30">—</span>}
                    </td>
                    <td className="text-center px-3 py-2.5">
                      <span className={`font-mono text-xs ${t.significant ? "font-bold text-sage" : "text-text/50"}`}>
                        {t.confidence}%
                      </span>
                    </td>
                    <td className="text-center px-3 py-2.5">
                      {t.significant ? (
                        <span className="inline-flex items-center gap-1 text-[10px] bg-sage/15 text-sage px-2 py-0.5 rounded-full font-bold">
                          <Trophy className="w-3 h-3" /> {t.winner}
                        </span>
                      ) : t.leader ? (
                        <span className="text-[10px] text-text/40 font-medium">Needs data</span>
                      ) : (
                        <span className="text-[10px] text-text/30">Tied</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Verdict + recommendation */}
      <div className={`rounded-xl p-4 text-sm flex items-start gap-3 ${
        sig.any_significant || sig.significant
          ? "bg-sage/5 border border-sage/20 text-mocha-dark"
          : "bg-surface/60 border border-border text-text/70"
      }`}>
        {(sig.any_significant || sig.significant)
          ? <Trophy className="w-5 h-5 text-sage mt-0.5 flex-shrink-0" />
          : <FlaskConical className="w-5 h-5 text-text/40 mt-0.5 flex-shrink-0" />}
        <div>
          <p className="font-medium">{sig.note}</p>
          {sig.recommendation && (
            <p className="text-xs text-text/50 mt-1 flex items-center gap-1">
              💡 <span className="font-medium">{sig.recommendation}</span>
            </p>
          )}
          {sig.p_value != null && (
            <p className="text-[11px] text-text/40 mt-1 font-mono">
              primary metric p = {sig.p_value} · two-proportion z-test · α = 0.05
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value, sub, highlight }) {
  return (
    <div>
      <div className={`font-serif font-bold text-lg ${highlight ? "text-caramel" : "text-mocha-dark"}`}>{value}</div>
      {sub && <div className="text-[10px] text-text/50 font-mono">{sub}</div>}
      <div className="text-[10px] text-text/40 mt-0.5">{label}</div>
    </div>
  );
}

function Metric({ label, value, highlight }) {
  return (
    <div>
      <div className={`font-serif font-bold text-xl ${highlight ? "text-caramel" : "text-mocha-dark"}`}>{value}</div>
      <div className="text-[11px] text-text/50">{label}</div>
    </div>
  );
}

