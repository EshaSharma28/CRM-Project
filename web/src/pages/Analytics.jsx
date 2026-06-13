import { useState, useEffect } from "react";
import { api } from "../api";
import { Sparkles, Search, TrendingUp, BarChart2, DollarSign, Activity, Filter, Award, Percent } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

const EXAMPLES = [
  "Which city has the most at-risk shoppers?",
  "Revenue by product",
  "How many orders in the last 30 days?",
  "Total revenue over time by month",
  "Average order value by lifecycle stage",
  "How many Champions do we have?",
];

const METRIC_LABEL = {
  count: "shoppers",
  sum_spend: "total spend (₹)",
  avg_spend: "avg spend (₹)",
  order_count: "orders",
  revenue: "revenue (₹)",
  avg_order_value: "avg order value (₹)",
};
const CURRENCY_METRICS = new Set(["sum_spend", "avg_spend", "revenue", "avg_order_value"]);
const fmt = (metric, v) =>
  (CURRENCY_METRICS.has(metric) ? "₹" : "") + Math.round(v).toLocaleString("en-IN");

const CHANNEL_COLORS = {
  email: "#8FA587",
  sms: "#BE7E50",
  whatsapp: "#D69A52",
  rcs: "#4A3525"
};

export default function Analytics() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  
  // Global stats state
  const [channelStats, setChannelStats] = useState([]);
  const [globalTotals, setGlobalTotals] = useState({ sent: 0, opened: 0, clicked: 0, orders: 0, revenue: 0, cost: 0 });
  const [topCampaigns, setTopCampaigns] = useState([]);
  const [statsLoading, setStatsLoading] = useState(true);

  useEffect(() => {
    async function fetchGlobalStats() {
      try {
        const camps = await api.campaigns();
        const active = camps.filter(c => c.status !== 'draft');
        
        const statsByChannel = {
          email: { orders: 0, revenue: 0 },
          sms: { orders: 0, revenue: 0 },
          whatsapp: { orders: 0, revenue: 0 },
        };

        const statsPromises = active.map(c => 
          api.stats(c.id).then(s => ({ channel: c.channel, stats: s })).catch(() => null)
        );
        
        const results = await Promise.all(statsPromises);
        
        const costs = { whatsapp: 0.35, sms: 0.15, email: 0.02, rcs: 0.30 };
        let totalSent = 0, totalOpened = 0, totalClicked = 0, totalOrders = 0, totalRevenue = 0, totalCost = 0;
        let allCampaigns = [];

        results.forEach((res, i) => {
          if (!res || !res.stats) return;
          const ch = res.channel || 'email';
          const c = active[i];
          if (!statsByChannel[ch]) statsByChannel[ch] = { orders: 0, revenue: 0 };
          
          const s = res.stats;
          statsByChannel[ch].orders += (s.orders_attributed || 0);
          statsByChannel[ch].revenue += (s.revenue || 0);

          totalSent += (s.sent || 0);
          totalOpened += (s.opened || 0);
          totalClicked += (s.clicked || 0);
          totalOrders += (s.orders_attributed || 0);
          totalRevenue += (s.revenue || 0);
          totalCost += (s.sent || 0) * (costs[ch] || 0.02);

          allCampaigns.push({ ...c, revenue: s.revenue || 0, orders: s.orders_attributed || 0 });
        });

        const formattedStats = Object.entries(statsByChannel)
          .filter(([_, data]) => data.orders > 0 || data.revenue > 0)
          .map(([channel, data]) => ({ channel, orders: data.orders, revenue: data.revenue }));

        setChannelStats(formattedStats);
        setGlobalTotals({ sent: totalSent, opened: totalOpened, clicked: totalClicked, orders: totalOrders, revenue: totalRevenue, cost: totalCost });
        setTopCampaigns(allCampaigns.sort((a,b) => b.revenue - a.revenue).slice(0, 5));
      } catch (err) {
        console.error("Failed to load global stats", err);
      } finally {
        setStatsLoading(false);
      }
    }
    fetchGlobalStats();
  }, []);

  async function run(question) {
    const text = (question ?? q).trim();
    if (!text) return;
    setQ(text);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.ask(text));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const roas = globalTotals.cost > 0 ? (globalTotals.revenue / globalTotals.cost) : 0;
  
  const funnelData = [
    { name: "Sent", value: globalTotals.sent, fill: "#BE7E50" },
    { name: "Opened", value: globalTotals.opened, fill: "#8FA587" },
    { name: "Clicked", value: globalTotals.clicked, fill: "#D69A52" },
    { name: "Orders", value: globalTotals.orders, fill: "#4A3525" },
  ];

  return (
    <div className="max-w-6xl mx-auto py-6 space-y-8">
      
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-serif font-bold text-mocha-dark">Analytics Studio</h1>
        <p className="text-text/60 mt-1">Global campaign performance and AI-assisted data exploration.</p>
      </div>

      {/* Global Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
            <Activity className="w-5 h-5 text-caramel" /> Orders by Channel
          </h2>
          <div className="h-64">
            {statsLoading ? (
              <div className="h-full w-full shimmer-bg rounded-lg"></div>
            ) : channelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelStats} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD2" />
                  <XAxis dataKey="channel" tick={{ fontSize: 12, fill: "#978573" }} tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                  <YAxis tick={{ fontSize: 12, fill: "#978573" }} />
                  <RechartsTooltip cursor={{ fill: "rgba(190,126,80,0.05)" }} />
                  <Bar dataKey="orders" radius={[4, 4, 0, 0]}>
                    {channelStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.channel] || "#BE7E50"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text/50">No campaign data available.</div>
            )}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-sage" /> Revenue by Channel (₹)
          </h2>
          <div className="h-64">
            {statsLoading ? (
              <div className="h-full w-full shimmer-bg rounded-lg"></div>
            ) : channelStats.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={channelStats} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EADFD2" />
                  <XAxis dataKey="channel" tick={{ fontSize: 12, fill: "#978573" }} tickFormatter={(val) => val.charAt(0).toUpperCase() + val.slice(1)} />
                  <YAxis tick={{ fontSize: 12, fill: "#978573" }} tickFormatter={(val) => `₹${val >= 1000 ? (val/1000).toFixed(1)+'k' : val}`} />
                  <RechartsTooltip cursor={{ fill: "rgba(143,165,135,0.05)" }} formatter={(val) => `₹${Math.round(val).toLocaleString('en-IN')}`} />
                  <Bar dataKey="revenue" radius={[4, 4, 0, 0]}>
                    {channelStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CHANNEL_COLORS[entry.channel] || "#8FA587"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text/50">No campaign data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Funnel & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2">
          <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
            <Filter className="w-5 h-5 text-mocha" /> Global Engagement Funnel
          </h2>
          <div className="h-64">
            {statsLoading ? (
              <div className="h-full w-full shimmer-bg rounded-lg"></div>
            ) : globalTotals.sent > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADFD2" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 12, fill: "#978573" }} axisLine={false} tickLine={false} />
                  <RechartsTooltip cursor={{ fill: "rgba(190,126,80,0.05)" }} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {funnelData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text/50">No funnel data available.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="card flex-1 flex flex-col justify-center items-center text-center">
            <Percent className="w-8 h-8 text-success mb-2 opacity-50" />
            <h2 className="text-sm font-bold text-text/60 uppercase tracking-wider mb-1">Estimated ROAS</h2>
            {statsLoading ? (
               <div className="w-24 h-10 shimmer-bg rounded-lg mt-2"></div>
            ) : (
               <>
                 <div className="text-5xl font-serif font-bold text-success">
                   {Math.round(roas).toLocaleString('en-IN')}×
                 </div>
                 <p className="text-xs text-text/50 mt-2">
                   Revenue: ₹{Math.round(globalTotals.revenue).toLocaleString('en-IN')} <br/>
                   Est. Cost: ₹{Math.round(globalTotals.cost).toLocaleString('en-IN')}
                 </p>
               </>
            )}
          </div>
        </div>
      </div>

      {/* Top Campaigns Table */}
      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/50">
          <h2 className="text-lg font-serif font-bold flex items-center gap-2">
            <Award className="w-5 h-5 text-warning" /> Top 5 Campaigns Leaderboard
          </h2>
        </div>
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/30 text-text/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Campaign</th>
              <th className="px-6 py-4 font-medium">Channel</th>
              <th className="px-6 py-4 font-medium text-right">Orders</th>
              <th className="px-6 py-4 font-medium text-right">Revenue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {statsLoading ? (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-text/50">Loading leaderboard...</td></tr>
            ) : topCampaigns.length > 0 ? topCampaigns.map((c, i) => (
              <tr key={c.id} className="hover:bg-surface/50 transition-colors">
                <td className="px-6 py-4 font-medium text-mocha-dark flex items-center gap-3">
                  <span className="text-text/40 font-bold">#{i + 1}</span> {c.name}
                </td>
                <td className="px-6 py-4 capitalize">{c.channel}</td>
                <td className="px-6 py-4 text-right font-bold text-mocha-dark">{c.orders}</td>
                <td className="px-6 py-4 text-right font-bold text-success">₹{Math.round(c.revenue).toLocaleString('en-IN')}</td>
              </tr>
            )) : (
              <tr><td colSpan="4" className="px-6 py-8 text-center text-text/50">No campaigns found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <hr className="border-border" />

      {/* AI Query Section */}
      <div className="max-w-4xl mx-auto space-y-6 pt-4">
        <div className="text-center mb-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-sage to-success text-white mb-4 shadow-md">
            <Sparkles className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-serif font-bold text-mocha-dark">Ask your data</h2>
          <p className="text-text/60 mt-1">Can't find what you need above? Ask a custom query in plain English.</p>
        </div>

        <div className="card">
          <div className="flex gap-2">
            <div className="flex items-center gap-2 flex-1 bg-surface border border-border rounded-xl px-3">
              <Search className="w-4 h-4 text-text/40" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="e.g. Which city has the most Champions?"
                className="flex-1 bg-transparent py-3 outline-none text-sm"
              />
            </div>
            <button onClick={() => run()} disabled={busy} className="btn-primary px-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {busy ? "Thinking…" : "Ask"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-3 justify-center">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => run(ex)} className="text-xs bg-surface hover:bg-sage/10 border border-border hover:border-sage/40 px-3 py-1.5 rounded-full transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="card border-error/30 bg-error/5 text-error text-sm">⚠ {error}</div>}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
            <div className="flex items-center gap-2 text-xs text-sage font-medium mb-3">
              <Sparkles className="w-3.5 h-3.5" /> {result.interpretation}
            </div>

            {result.group_by ? (
              <>
                <div className="h-72 mt-2">
                  <ResponsiveContainer>
                    <BarChart data={result.rows.slice(0, 10)} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#EADFD2" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#978573" }} interval={0} angle={-15} textAnchor="end" height={50} />
                      <YAxis tick={{ fontSize: 11, fill: "#978573" }} />
                      <RechartsTooltip cursor={{ fill: "rgba(143,165,135,0.08)" }} formatter={(v) => fmt(result.metric, v)} />
                      <Bar dataKey="value" fill="#8FA587" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <p className="text-sm text-text/60 mt-3">
                  Top: <b className="text-mocha-dark">{result.rows[0]?.label}</b> with{" "}
                  <b className="text-mocha-dark">{fmt(result.metric, result.rows[0]?.value || 0)}</b>{" "}
                  {METRIC_LABEL[result.metric]}, across {result.rows.length} {result.group_by.replace("_", " ")}s.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-4 py-6">
                <div className="bg-sage/10 text-sage p-3 rounded-2xl"><TrendingUp className="w-8 h-8" /></div>
                <div>
                  <div className="text-5xl font-serif font-bold text-mocha-dark">{fmt(result.metric, result.value)}</div>
                  <div className="text-sm text-text/50 mt-1">{METRIC_LABEL[result.metric]}</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
