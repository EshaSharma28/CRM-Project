import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip, CartesianGrid,
} from "recharts";
import { Users, Send, MousePointerClick, ShoppingBag, Sparkles, ArrowRight } from "lucide-react";
import { api } from "../api";
import { Card, Stat, CountUp, Badge, Skeleton, AiPill } from "../components/ui";
import { LIFECYCLE_META, PERSONA_LABELS, titleCase } from "../lib/format";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [agg, setAgg] = useState({ sent: 0, opened: 0, clicked: 0, orders: 0 });
  const navigate = useNavigate();

  useEffect(() => {
    api.summary().then(setSummary).catch(() => {});
    api.campaigns().then(async (cs) => {
      setCampaigns(cs);
      const stats = await Promise.all(cs.map((c) => api.stats(c.id).catch(() => null)));
      const a = { sent: 0, opened: 0, clicked: 0, orders: 0 };
      stats.forEach((s) => {
        if (!s) return;
        a.sent += s.sent; a.opened += s.opened; a.clicked += s.clicked; a.orders += s.orders_attributed;
      });
      setAgg(a);
    }).catch(() => {});
  }, []);

  const lifecycleData = summary
    ? Object.entries(summary.by_lifecycle_stage).map(([k, v]) => ({
        name: LIFECYCLE_META[k]?.label || k, value: v, color: LIFECYCLE_META[k]?.color || "#bbb",
      }))
    : [];
  const personaData = summary
    ? Object.entries(summary.by_persona).map(([k, v]) => ({ name: PERSONA_LABELS[k] || k, value: v }))
    : [];

  const openRate = agg.sent ? Math.round((agg.opened / agg.sent) * 100) : 0;

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* hero CTA */}
      <Card pad className="between" style={{ background: "linear-gradient(135deg,#fbf7f2,#f3ece1)", gap: 18 }}>
        <div>
          <div className="row" style={{ gap: 9, marginBottom: 6 }}>
            <AiPill>Co-pilot</AiPill>
          </div>
          <h2 style={{ fontSize: 22 }}>Run a campaign in plain English</h2>
          <p className="muted" style={{ maxWidth: "52ch", marginTop: 6 }}>
            Tell the co-pilot who to reach — it builds the audience, drafts the
            message and launches it, then explains the results.
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate("/copilot")}>
          <Sparkles size={16} /> Open co-pilot
        </button>
      </Card>

      {/* KPIs */}
      <div className="grid cols-4 cols-4-sm2">
        <Stat icon={<Users size={18} />} label="Total shoppers"
          value={summary ? <CountUp value={summary.total_customers} /> : <Skeleton w={60} h={28} />} />
        <Stat icon={<Send size={18} />} label="Messages sent"
          value={<CountUp value={agg.sent} />} />
        <Stat icon={<MousePointerClick size={18} />} label="Avg open rate"
          value={`${openRate}%`} />
        <Stat icon={<ShoppingBag size={18} />} label="Orders attributed"
          value={<CountUp value={agg.orders} />} />
      </div>

      {/* charts */}
      <div className="grid cols-2">
        <Card>
          <div className="card-head"><h3>Shopper lifecycle</h3></div>
          <div className="card-pad row" style={{ gap: 18 }}>
            <div style={{ width: 170, height: 170 }}>
              {lifecycleData.length ? (
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={lifecycleData} dataKey="value" innerRadius={48} outerRadius={80} paddingAngle={2} stroke="none">
                      {lifecycleData.map((d, i) => <Cell key={i} fill={d.color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : <Skeleton h={170} />}
            </div>
            <div className="stack grow" style={{ gap: 8 }}>
              {lifecycleData.map((d) => (
                <div key={d.name} className="between">
                  <span className="row small"><span className="dot" style={{ background: d.color }} /> {d.name}</span>
                  <b className="small">{d.value}</b>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card>
          <div className="card-head"><h3>Personas in your base</h3></div>
          <div className="card-pad" style={{ height: 210 }}>
            {personaData.length ? (
              <ResponsiveContainer>
                <BarChart data={personaData} margin={{ left: -18, right: 8, top: 6 }}>
                  <CartesianGrid vertical={false} stroke="#f0e7d9" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#978573" }} interval={0} angle={-18} textAnchor="end" height={54} />
                  <Tooltip cursor={{ fill: "rgba(190,126,80,0.08)" }} />
                  <Bar dataKey="value" fill="#be7e50" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Skeleton h={180} />}
          </div>
        </Card>
      </div>

      {/* recent campaigns */}
      <Card>
        <div className="card-head between">
          <h3>Recent campaigns</h3>
          <Link to="/campaigns" className="row small accent" style={{ gap: 5 }}>
            View all <ArrowRight size={14} />
          </Link>
        </div>
        {campaigns.length ? (
          <table className="table">
            <thead><tr><th>Campaign</th><th>Channel</th><th>Status</th></tr></thead>
            <tbody>
              {campaigns.slice(0, 5).map((c) => (
                <tr key={c.id} className="clickable" onClick={() => navigate(`/campaigns/${c.id}`)}>
                  <td style={{ fontWeight: 600 }}>{c.name}</td>
                  <td className="muted">{titleCase(c.channel)}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty">No campaigns yet — start one with the co-pilot.</div>
        )}
      </Card>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    draft: ["#978573", "Draft"], sending: ["#d69a52", "Sending"], sent: ["#6fa471", "Sent"],
  };
  const [color, label] = map[status] || ["#978573", status];
  return <Badge color={color}>{label}</Badge>;
}
