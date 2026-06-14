import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Search, TrendingUp, DollarSign, Activity, Filter, Award, Percent, ChevronDown, Mail, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";
import CountUp from "../components/CountUp";

const CremaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15 4.5C15 3.11929 13.8807 2 12.5 2C11.433 2 10.523 2.6685 10.1614 3.60682C9.7997 2.6685 8.88972 2 7.82276 2C6.44205 2 5.32275 3.11929 5.32275 4.5C5.32275 6.0967 6.7471 7.6432 9.3621 9.9407C9.7937 10.3201 10.4552 10.3201 10.8867 9.9407C13.5017 7.6432 14.9261 6.0967 15.0361 4.5H15Z" />
    <path d="M4 11H16V14C16 17.3137 13.3137 20 10 20C6.68629 20 4 17.3137 4 14V11Z" />
    <path d="M16 11V15H17.5C18.8807 15 20 13.8807 20 12.5C20 11.1193 18.8807 10 17.5 10H16V11Z" />
    <path d="M2 21C2 20.4477 2.44772 20 3 20H17C17.5523 20 18 20.4477 18 21C18 21.5523 17.5523 22 17 22H3C2.44772 22 2 21.5523 2 21Z" />
  </svg>
);

const BgBeans = ({ className }) => (
  <svg viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M100 50 C120 10, 180 30, 170 80 C160 130, 110 140, 80 100 C50 60, 80 90, 100 50 Z" />
    <path d="M160 45 C130 55, 100 80, 100 115" />
    <path d="M40 100 C70 50, 140 80, 120 140 C100 200, 30 180, 20 130 C10 80, 10 150, 40 100 Z" />
    <path d="M115 105 C80 110, 50 130, 45 165" />
  </svg>
);

const BgCup = ({ className }) => (
  <svg viewBox="0 0 200 250" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M45 40 L65 15 L95 15 C100 15, 105 20, 110 20 C115 20, 120 15, 125 15 L145 15 L155 40" />
    <rect x="25" y="40" width="150" height="20" rx="4" />
    <path d="M35 60 L55 230 C57 240, 65 245, 75 245 H125 C135 245, 143 240, 145 230 L165 60" />
    <path d="M75 145 C95 130, 115 150, 100 170 C85 190, 60 180, 65 155 C70 130, 55 160, 75 145 Z" />
    <path d="M95 140 C80 150, 75 165, 80 175" />
    <path d="M95 125 C115 110, 135 130, 120 150 C105 170, 80 160, 85 135 C90 110, 75 140, 95 125 Z" />
    <path d="M115 120 C100 130, 95 145, 100 155" />
  </svg>
);

const BgSteamTall = ({ className }) => (
  <svg viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M40 180 C 10 160, 20 120, 30 90 C 40 60, 10 40, 20 10 C 25 -5, 40 5, 30 20" />
    <path d="M60 190 C 50 150, 80 120, 60 80 C 40 40, 60 20, 80 40 C 90 50, 80 70, 70 60" />
    <path d="M20 140 C 0 120, 50 100, 35 60" />
  </svg>
);

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
  email: "#006875",
  sms: "#346572",
  whatsapp: "#bf998d",
  rcs: "#77574d"
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
        
        const statsByChannel = {};

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
          if (!statsByChannel[ch]) statsByChannel[ch] = { orders: 0, revenue: 0, count: 0 };
          
          const s = res.stats;
          statsByChannel[ch].orders += (s.orders_attributed || 0);
          statsByChannel[ch].revenue += (s.attributed_revenue || 0);
          statsByChannel[ch].count += 1;

          totalSent += (s.sent || 0);
          totalOpened += (s.opened || 0);
          totalClicked += (s.clicked || 0);
          totalOrders += (s.orders_attributed || 0);
          totalRevenue += (s.attributed_revenue || 0);
          totalCost += (s.sent || 0) * (costs[ch] || 0.02);

          allCampaigns.push({ ...c, revenue: s.attributed_revenue || 0, orders: s.orders_attributed || 0 });
        });

        const formattedStats = Object.entries(statsByChannel)
          .filter(([_, data]) => data.count > 0)
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
    { name: "Sent", value: globalTotals.sent, fill: "#bf998d" },
    { name: "Opened", value: globalTotals.opened, fill: "#346572" },
    { name: "Clicked", value: globalTotals.clicked, fill: "#12b1c5" },
    { name: "Orders", value: globalTotals.orders, fill: "#006875" },
  ];

  return (
    <div className="relative max-w-6xl mx-auto py-6 space-y-8 pb-32">
      {/* Background Watermarks */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-between items-center px-10">
        <BgBeans className="absolute top-20 left-10 w-[400px] h-[400px] text-[#77574d] opacity-[0.05] -rotate-12" />
        <BgCup className="absolute bottom-10 right-20 w-[350px] h-[450px] text-[#77574d] opacity-[0.05] rotate-12" />
        <BgSteamTall className="absolute top-[30%] right-[30%] w-[300px] h-[600px] text-[#77574d] opacity-[0.03]" />
      </div>

      {/* Page Header */}
      <div className="relative z-10">
        <h1 className="font-headline-xl text-4xl font-bold text-on-surface">Analytics Studio</h1>
        <p className="text-on-surface-variant font-label-md mt-1">Global campaign performance and AI-assisted data exploration.</p>
      </div>

      {/* Global Stats Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-[#f8f3e8] border border-[#bcc9cc] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-headline-md font-bold text-on-surface">
              Orders by Channel
            </h2>
          </div>
          
          <div className="flex-1 flex flex-col justify-center">
            {statsLoading ? (
              <div className="h-full w-full shimmer-bg rounded-lg"></div>
            ) : channelStats.length > 0 ? (
              (() => {
                const maxOrders = Math.max(...channelStats.map(c => c.orders));
                const names = {
                  email: "Email Marketing",
                  sms: "SMS Broadcasts",
                  whatsapp: "WhatsApp Flows",
                  rcs: "RCS Messaging"
                };
                return channelStats.map((c, i) => (
                  <div key={c.channel} className="mb-6 last:mb-0">
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-on-surface-variant font-medium text-base">{names[c.channel] || c.channel}</span>
                      <span className="text-on-surface font-bold text-base">{c.orders.toLocaleString('en-IN')} Orders</span>
                    </div>
                    <div className="h-7 w-full rounded-lg border border-[#bcc9cc] bg-transparent p-[2px]">
                      <div 
                        className="h-full rounded-md" 
                        style={{ 
                          width: `${maxOrders > 0 ? Math.max((c.orders / maxOrders) * 100, 2) : 0}%`,
                          backgroundColor: CHANNEL_COLORS[c.channel] || "#12b1c5"
                        }} 
                      />
                    </div>
                  </div>
                ));
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant font-medium">No campaign data available.</div>
            )}
          </div>
        </div>

        <div className="bg-[#f8f3e8] border border-[#bcc9cc] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow flex flex-col relative z-10">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-headline-md font-bold text-on-surface">
              Revenue by Channel
            </h2>
          </div>
          
          <div className="flex-1 flex justify-around items-end h-48 mt-4">
            {statsLoading ? (
              <div className="h-full w-full shimmer-bg rounded-lg"></div>
            ) : channelStats.length > 0 ? (
              (() => {
                const maxRev = Math.max(...channelStats.map(c => c.revenue));
                const names = {
                  email: "Email",
                  sms: "SMS",
                  whatsapp: "WhatsApp",
                  rcs: "RCS"
                };
                return channelStats.map((c, i) => (
                  <div key={c.channel} className="flex flex-col items-center justify-end h-full gap-2 w-16">
                    <span className="text-on-surface font-bold text-sm">₹{(c.revenue/1000).toFixed(1)}k</span>
                    <div className="w-10 rounded-t-lg border border-[#bcc9cc] border-b-0 bg-transparent p-[2px] flex flex-col justify-end" style={{ height: '100%' }}>
                      <div 
                        className="w-full rounded-t-md" 
                        style={{ 
                          height: `${maxRev > 0 ? Math.max((c.revenue / maxRev) * 100, 5) : 0}%`,
                          backgroundColor: CHANNEL_COLORS[c.channel] || "#12b1c5"
                        }} 
                      />
                    </div>
                    <span className="text-on-surface-variant font-medium text-sm">{names[c.channel] || c.channel}</span>
                  </div>
                ));
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant font-medium">No campaign data available.</div>
            )}
          </div>
        </div>
      </div>

      {/* Funnel & Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        <div className="bg-[#f8f3e8] border border-[#bcc9cc] rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow lg:col-span-2 flex flex-col">
          <h2 className="text-2xl font-headline-md font-bold mb-8 text-on-surface">
            Global Engagement Funnel
          </h2>
          <div className="flex-1 flex flex-col justify-center">
            {statsLoading ? (
              <div className="h-full w-full shimmer-bg rounded-lg"></div>
            ) : globalTotals.sent > 0 ? (
              (() => {
                const maxVal = globalTotals.sent;
                return funnelData.map((d, i) => (
                  <div key={d.name} className="mb-6 last:mb-0">
                    <div className="flex justify-between items-end mb-3">
                      <span className="text-on-surface-variant font-medium text-base">{d.name}</span>
                      <span className="text-on-surface font-bold text-base">{d.value.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="h-7 w-full rounded-lg border border-[#bcc9cc] bg-transparent p-[2px]">
                      <div 
                        className="h-full rounded-md" 
                        style={{ 
                          width: `${maxVal > 0 ? Math.max((d.value / maxVal) * 100, 1) : 0}%`,
                          backgroundColor: d.fill
                        }} 
                      />
                    </div>
                  </div>
                ));
              })()
            ) : (
              <div className="h-full flex items-center justify-center text-on-surface-variant font-medium">No funnel data available.</div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-6">
          <div className="bg-[#ece8dd] border border-[#bcc9cc] rounded-2xl p-6 flex-1 flex flex-col justify-center items-center text-center shadow-sm">
            <Percent className="w-8 h-8 text-[#006875] mb-4 opacity-80" />
            <h2 className="text-xs font-bold text-on-surface-variant uppercase tracking-widest mb-1">Estimated ROAS</h2>
            {statsLoading ? (
               <div className="w-24 h-10 shimmer-bg rounded-lg mt-2"></div>
            ) : (
               <>
                 <div className="text-5xl font-serif font-bold text-success">
                   <CountUp value={roas} formatter={(v) => `${Math.round(v).toLocaleString('en-IN')}×`} />
                 </div>
                 <p className="text-xs text-text/50 mt-2">
                   Revenue: <CountUp value={globalTotals.revenue} formatter={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`} /> <br/>
                   Est. Cost: <CountUp value={globalTotals.cost} formatter={(v) => `₹${Math.round(v).toLocaleString('en-IN')}`} />
                 </p>
               </>
            )}
          </div>
        </div>
      </div>

      {/* Top Campaigns Table */}
      <div className="bg-[#f8f3e8] border border-[#bcc9cc] rounded-2xl p-0 overflow-hidden shadow-sm relative z-10">
        <div className="p-8 flex justify-between items-center">
          <h2 className="text-2xl font-headline-md font-bold text-on-surface">
            Top 5 Campaigns Leaderboard
          </h2>
          <Link to="/campaigns" className="text-[#006875] font-bold text-sm hover:underline">View all campaigns →</Link>
        </div>
        <div className="px-8 pb-8">
          <table className="w-full text-left text-sm">
            <thead className="text-[#978573] text-xs uppercase tracking-widest font-bold border-b border-[#bcc9cc]">
              <tr>
                <th className="py-4 font-bold">Campaign Name</th>
                <th className="py-4 font-bold">Status</th>
                <th className="py-4 font-bold text-right">Revenue</th>
                <th className="py-4 font-bold text-right">ROI</th>
                <th className="py-4 text-right font-bold">Orders</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#bcc9cc]/50">
              {statsLoading ? (
                <tr><td colSpan="5" className="py-8 text-center text-on-surface-variant font-medium">Loading leaderboard...</td></tr>
              ) : topCampaigns.length > 0 ? topCampaigns.map((c, i) => {
                const roi = c.revenue / (c.sent * 0.02 || 1);
                const Icon = c.channel === 'email' ? Mail : MessageSquare;
                return (
                  <tr key={c.id} className="hover:bg-surface-container-lowest transition-colors">
                    <td className="py-5 font-bold text-on-surface flex items-center gap-4 text-base">
                      <div className="w-10 h-10 rounded-lg bg-[#006875]/10 flex items-center justify-center text-[#006875]">
                        <Icon className="w-5 h-5" />
                      </div>
                      {c.name}
                    </td>
                    <td className="py-5">
                      {c.status !== 'draft' ? (
                        <span className="px-3 py-1 rounded bg-[#ccfbf1] text-[#0f766e] text-xs font-bold uppercase tracking-wider">Active</span>
                      ) : (
                        <span className="px-3 py-1 rounded bg-[#e5e5e5] text-[#525252] text-xs font-bold uppercase tracking-wider">Draft</span>
                      )}
                    </td>
                    <td className="py-5 text-right font-bold text-on-surface text-base">₹{Math.round(c.revenue).toLocaleString('en-IN')}</td>
                    <td className="py-5 text-right font-bold text-[#006875] text-base">{roi.toFixed(1)}x</td>
                    <td className="py-5 text-right text-on-surface text-base">{c.orders}</td>
                  </tr>
                );
              }) : (
                <tr><td colSpan="5" className="py-8 text-center text-on-surface-variant font-medium">No campaigns found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <hr className="border-border" />

      {/* AI Query Section */}
      <div className="max-w-4xl mx-auto space-y-8 pt-10 relative z-10">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#006875] text-[#12b1c5] mb-6 shadow-md border border-[#346572]">
            <CremaIcon className="w-10 h-10 text-[#f8f3e8]" />
          </div>
          <h2 className="text-4xl font-headline-xl font-bold text-on-surface">Ask Crema</h2>
          <p className="text-on-surface-variant font-label-md mt-2 text-lg">Can't find what you need above? Ask a custom query in plain English.</p>
        </div>

        <div className="bg-[#ece8dd] border border-[#bcc9cc] rounded-3xl p-8 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-3 flex-1 bg-surface-white border border-outline-variant rounded-full px-5 shadow-inner focus-within:border-[#12b1c5] focus-within:ring-2 focus-within:ring-[#12b1c5]/20 transition-all">
              <Search className="w-5 h-5 text-outline" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && run()}
                placeholder="e.g. Which city has the most Champions?"
                className="flex-1 bg-transparent py-4 outline-none text-base text-on-surface font-medium placeholder:text-outline"
              />
            </div>
            <button onClick={() => run()} disabled={busy} className="bg-[#12b1c5] text-[#001f24] hover:brightness-110 font-bold px-8 rounded-full flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-50">
              <CremaIcon className="w-5 h-5" /> {busy ? "Thinking…" : "Ask"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2 mt-6 justify-center">
            {EXAMPLES.map((ex) => (
              <button key={ex} onClick={() => run(ex)} className="text-xs bg-surface-white hover:bg-[#12b1c5]/10 text-on-surface-variant border border-[#bcc9cc] hover:border-[#12b1c5] px-4 py-2 rounded-full font-bold transition-colors">
                {ex}
              </button>
            ))}
          </div>
        </div>

        {error && <div className="bg-error/10 border border-error/30 text-error p-4 rounded-xl font-bold text-sm">⚠ {error}</div>}

        {result && (
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-white border border-[#bcc9cc] rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-sm text-[#006875] font-bold mb-6">
              <CremaIcon className="w-5 h-5" /> {result.interpretation}
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
                <p className="text-sm text-on-surface-variant font-medium mt-6">
                  Top: <b className="text-on-surface">{result.rows[0]?.label}</b> with{" "}
                  <b className="text-[#006875]">{fmt(result.metric, result.rows[0]?.value || 0)}</b>{" "}
                  {METRIC_LABEL[result.metric]}, across {result.rows.length} {result.group_by.replace("_", " ")}s.
                </p>
              </>
            ) : (
              <div className="flex items-center gap-6 py-6">
                <div className="bg-[#12b1c5]/20 text-[#006875] p-4 rounded-2xl"><TrendingUp className="w-10 h-10" /></div>
                <div>
                  <div className="text-6xl font-headline-xl font-bold text-on-surface">
                    <CountUp value={result.value} formatter={(v) => fmt(result.metric, v)} />
                  </div>
                  <div className="text-base text-on-surface-variant font-bold mt-2 uppercase tracking-widest">{METRIC_LABEL[result.metric]}</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
