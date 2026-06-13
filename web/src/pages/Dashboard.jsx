import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Users, Megaphone, Activity, ShoppingBag, ArrowRight, Bot } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import CountUp from "../components/CountUp";
import RfmBoard from "../components/RfmBoard";

const COLORS = ["#4A3525", "#BE7E50", "#8FA587", "#D69A52", "#C9695E"];

export default function Dashboard() {
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
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Hero CTA */}
      <div className="bg-gradient-to-r from-mocha-dark to-mocha text-surface-white p-8 rounded-3xl shadow-md relative overflow-hidden flex items-center justify-between">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <Bot className="w-48 h-48" />
        </div>
        <div className="relative z-10 max-w-xl">
          <h1 className="text-3xl font-serif font-bold mb-2">Welcome to Brewhaus</h1>
          <p className="text-surface-white/80 mb-6">Your audience is growing. What will you say next?</p>
          <Link to="/copilot" className="inline-flex items-center gap-2 bg-caramel text-white px-6 py-3 rounded-xl font-medium shadow-sm transition-transform hover:scale-105 active:scale-95">
            <Bot className="w-5 h-5" />
            Start a campaign with the co-pilot
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Shoppers", val: sum.total_customers, icon: Users, color: "text-mocha" },
          { label: "Active Campaigns", val: activeCampaigns, icon: Megaphone, color: "text-caramel" },
          { label: "Avg Open Rate", val: agg.sent ? (agg.opened / agg.sent) * 100 : 0, icon: Activity, color: "text-sage", fmt: (v) => agg.sent ? Math.round(v) + "%" : "—" },
          { label: "Orders Attributed", val: agg.orders, icon: ShoppingBag, color: "text-success" },
        ].map((kpi, i) => (
          <div key={i} className="card flex items-center gap-4">
            <div className={`p-3 rounded-xl bg-surface ${kpi.color}`}>
              <kpi.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-text/60">{kpi.label}</p>
              <h3 className="text-2xl font-bold font-serif text-mocha-dark">
                <CountUp value={kpi.val} formatter={kpi.fmt} />
              </h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-serif font-bold mb-4">Lifecycle Stages</h2>
          <div className="h-64">
            {lifecycleData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={lifecycleData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                    {lifecycleData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-text/50">No data</div>
            )}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mt-2">
             {lifecycleData.map((entry, index) => (
               <div key={entry.name} className="flex items-center gap-1.5 text-xs">
                 <div className="w-2.5 h-2.5 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                 <span className="capitalize">{entry.name}</span>
               </div>
             ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-lg font-serif font-bold mb-4">Persona Breakdown</h2>
          <div className="h-64">
            {personaData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={personaData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#EADFD2" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#2C211B', fontSize: 12}} width={100} />
                  <Tooltip cursor={{fill: '#FBF7F2'}} />
                  <Bar dataKey="value" fill="#BE7E50" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
             ) : (
              <div className="h-full flex items-center justify-center text-text/50">No data</div>
            )}
          </div>
        </div>
      </div>

      {/* RFM segmentation */}
      <RfmBoard />

      {/* Recent Campaigns */}
      <div className="card">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-serif font-bold">Recent Campaigns</h2>
          <Link to="/campaigns" className="text-sm text-caramel font-medium flex items-center gap-1 hover:underline">
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="divide-y divide-border">
          {campaigns.length > 0 ? campaigns.slice(0, 3).map(c => (
            <Link key={c.id} to={`/campaigns/${c.id}`} className="py-3 flex items-center justify-between hover:bg-surface/50 transition-colors -mx-6 px-6">
              <div>
                <p className="font-medium text-mocha-dark">{c.name}</p>
                <p className="text-sm text-text/60 capitalize">{c.channel}</p>
              </div>
              <div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                  c.status === 'sent' ? 'bg-success/10 text-success' :
                  c.status === 'sending' ? 'bg-warning/10 text-warning animate-pulse' :
                  c.status === 'scheduled' ? 'bg-caramel/10 text-caramel border border-caramel/20' :
                  'bg-surface border border-border text-text'
                }`}>
                  {c.status}
                </span>
              </div>
            </Link>
          )) : (
            <div className="py-8 text-center text-text/50">No recent campaigns.</div>
          )}
        </div>
      </div>
    </div>
  );
}
