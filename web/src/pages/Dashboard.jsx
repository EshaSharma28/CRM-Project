import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api";
import { Users, Megaphone, Activity, ShoppingBag, ArrowRight, Bot, Sparkles, TrendingUp, MailCheck, MessageSquare, Bell } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import CountUp from "../components/CountUp";
import RfmBoard from "../components/RfmBoard";
import { Bean, CoffeeRing } from "../components/CoffeeDoodles";

const COLORS = ["#12b1c5", "#346572", "#bf998d", "#77574d", "#006875"];

function getCampaignIcon(channel) {
  const c = channel?.toLowerCase() || '';
  if (c === 'sms') return <MessageSquare className="w-8 h-8 text-[#004f58]" />;
  if (c === 'push') return <Bell className="w-8 h-8 text-[#004f58]" />;
  return <MailCheck className="w-8 h-8 text-[#004f58]" />;
}

function timeAgo(dateString) {
  if (!dateString) return "Recently";
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "1 day ago";
  return `${days} days ago`;
}

const BgSteam = ({ className }) => (
  <svg viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" className={className}>
    {/* Left Steam - Wavy with top curl */}
    <path d="M45 180 C 10 140, 80 110, 30 60 C 10 40, 40 10, 50 30 C 55 40, 40 50, 35 40" />
    {/* Right Steam - Shorter with right curl */}
    <path d="M55 160 C 65 130, 100 120, 80 80 C 70 60, 50 80, 70 95" />
  </svg>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [agg, setAgg] = useState({ sent: 0, opened: 0, orders: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.summary().catch(() => null),
      api.campaigns().catch(() => []),
    ]).then(async ([sum, camps]) => {
      setSummary(sum);
      setCampaigns(camps);
      // Aggregate real engagement across all campaigns for the KPI tiles.
      const stats = await Promise.all(camps.map((c) => api.stats(c.id).catch(() => null)));
      const a = { sent: 0, opened: 0, orders: 0 };
      stats.forEach((s) => {
        if (!s) return;
        a.sent += s.sent;
        a.opened += s.opened;
        a.orders += s.orders_attributed;
      });
      setAgg(a);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-32 rounded-2xl shimmer-bg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 rounded-2xl shimmer-bg"></div>)}
        </div>
      </div>
    );
  }

  // Fallback data if backend is asleep
  const sum = summary || {
    total_customers: 0,
    by_lifecycle_stage: {},
    by_persona: {}
  };

  const lifecycleData = Object.entries(sum.by_lifecycle_stage).map(([name, value]) => ({ name, value }));
  const personaData = Object.entries(sum.by_persona).map(([name, value]) => ({ name, value }));
  
  const activeCampaigns = campaigns.filter(c => c.status !== 'draft').length;
  const openRate = agg.sent ? `${Math.round((agg.opened / agg.sent) * 100)}%` : "—";

  return (
    <div className="relative min-w-0 max-w-7xl mx-auto space-y-6 pb-32">
      {/* Hero CTA */}
      <div className="bg-[#006875] text-white p-10 rounded-2xl relative overflow-hidden flex items-center justify-between border border-[#bcc9cc] shadow-sm mb-8 z-10">
        <BgSteam className="absolute right-[25%] top-[-20px] w-64 h-64 text-white opacity-20" />
        <div className="relative z-10 max-w-xl">
          <h1 className="font-headline-xl text-5xl mb-4 tracking-tight font-bold">Hi, Welcome to Brewhaus</h1>
          <p className="text-white/90 font-body-md text-lg mb-8">Your audience is growing. What's next?</p>
          <button onClick={() => navigate("/crema")} className="inline-flex items-center gap-2 bg-[#12b1c5] text-[#001f24] px-6 py-3 rounded-lg font-bold shadow-sm transition-transform hover:scale-105 active:scale-95">
            <Sparkles className="w-5 h-5" />
            Start a campaign with Crema
            <ArrowRight className="w-5 h-5 ml-1" />
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Shoppers", val: sum.total_customers, icon: Users, subtext: "+12% vs last month", trend: true },
          { label: "Active Campaigns", val: activeCampaigns, icon: Megaphone, subtext: "4 ending this week", trend: false },
          { label: "Avg Open Rate", val: agg.sent ? (agg.opened / agg.sent) * 100 : 0, icon: Activity, subtext: "+3.2% optimization", trend: true, fmt: (v) => agg.sent ? Math.round(v) + "%" : "—" },
          { label: "Orders Attributed", val: agg.orders, icon: ShoppingBag, subtext: "₹24,500 total value", trend: false },
        ].map((kpi, i) => (
          <div key={i} className="bg-surface-white p-6 rounded-2xl border border-outline-variant flex flex-col justify-between hover:shadow-sm transition-shadow">
            <div className="flex justify-between items-center mb-4">
              <p className="text-on-surface-variant font-label-md font-bold">{kpi.label}</p>
              <kpi.icon className="w-5 h-5 text-outline" />
            </div>
            <h3 className="font-headline-xl text-4xl text-on-surface leading-none tracking-tight font-bold mb-6">
              <CountUp value={kpi.val} formatter={kpi.fmt} />
            </h3>
            <div className={`flex items-center gap-1.5 text-xs font-bold ${kpi.trend ? 'text-primary' : 'text-outline'}`}>
              {kpi.trend && <TrendingUp className="w-3.5 h-3.5" />}
              {kpi.subtext}
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-6">
        <div className="bg-surface-white p-6 rounded-2xl border border-outline-variant flex flex-col">
          <h2 className="font-headline-md text-xl font-bold text-on-surface mb-6">Lifecycle Stages</h2>
          <div className="h-64 relative flex items-center justify-center mb-6">
            {lifecycleData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={lifecycleData} innerRadius={80} outerRadius={110} paddingAngle={0} dataKey="value" stroke="none">
                      {lifecycleData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #bcc9cc', backgroundColor: '#fef9ee' }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="font-headline-xl text-4xl font-bold text-on-surface leading-none">{sum.total_customers}</span>
                  <span className="text-[10px] font-bold text-outline tracking-widest mt-1">TOTAL</span>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-outline">No data</div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-2 mt-auto px-2">
             {lifecycleData.map((entry, index) => {
               const percentage = sum.total_customers ? Math.round((entry.value / sum.total_customers) * 100) : 0;
               return (
                 <div key={entry.name} className="flex items-center gap-2 font-label-md text-sm text-on-surface font-bold">
                   <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                   <span className="capitalize">{entry.name} ({percentage}%)</span>
                 </div>
               );
             })}
          </div>
        </div>

        <div className="bg-surface-white p-6 rounded-2xl border border-[#bcc9cc] flex flex-col">
          <div className="flex justify-between items-center mb-8">
            <h2 className="font-headline-md text-xl font-bold text-on-surface">Persona Breakdown</h2>
          </div>
          <div className="space-y-6">
            {personaData.length > 0 ? personaData.map((entry) => {
              const maxVal = Math.max(...personaData.map(d => d.value), 1);
              const pct = (entry.value / maxVal) * 100;
              return (
                <div key={entry.name}>
                  <div className="flex justify-between items-center mb-2 font-label-md text-sm text-on-surface font-bold">
                    <span>{entry.name}</span>
                    <span>{entry.value} Users</span>
                  </div>
                  <div className="w-full h-3.5 bg-[#ece8dd] rounded-full overflow-hidden">
                    <div className="h-full bg-[#77574d] rounded-full" style={{ width: `${pct}%` }}></div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-8 text-center text-outline">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* RFM segmentation */}
      <RfmBoard />

      {/* Recent Campaigns */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-6">
          <h2 className="font-headline-md text-xl font-bold text-on-surface">Recent Campaigns</h2>
          <Link to="/campaigns" className="text-[#006875] font-label-md flex items-center gap-1 hover:underline font-bold text-sm">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {campaigns.length > 0 ? campaigns.slice(0, 3).map(c => (
            <Link key={c.id} to={`/campaigns/${c.id}`} className="bg-surface-white border border-[#bcc9cc] rounded-2xl p-4 flex gap-4 items-center hover:shadow-md transition-shadow">
              <div className="w-16 h-16 rounded-xl bg-[#54d7ec] flex items-center justify-center flex-shrink-0 shadow-sm">
                {getCampaignIcon(c.channel)}
              </div>
              <div className="flex flex-col items-start min-w-0">
                <p className="font-bold text-on-surface leading-tight truncate w-full">{c.name}</p>
                <p className="text-xs text-gray-500 mt-0.5 truncate w-full">
                  {c.status === 'scheduled' ? 'Scheduled' : `Sent ${timeAgo(c.created_at || c.updated_at)}`}
                </p>
                <span className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded font-bold mt-2 ${
                  c.status === 'sent' ? 'bg-green-100 text-green-700' :
                  c.status === 'sending' ? 'bg-[#e0f7fa] text-[#006875] animate-pulse' :
                  c.status === 'scheduled' ? 'bg-[#f8f3e8] text-[#77574d]' :
                  'bg-[#ece8dd] text-[#4c3129]'
                }`}>
                  {c.status === 'sent' ? 'COMPLETED' : c.status === 'sending' ? 'ACTIVE' : c.status.toUpperCase()}
                </span>
              </div>
            </Link>
          )) : (
            <div className="col-span-3 py-8 text-center text-outline bg-surface-white rounded-2xl border border-[#bcc9cc]">No recent campaigns.</div>
          )}
        </div>
      </div>
    </div>
  );
}
