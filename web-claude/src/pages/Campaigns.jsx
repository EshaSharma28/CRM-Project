import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, ChevronRight } from "lucide-react";
import { api } from "../api";
import { Card, Badge, Empty, Skeleton } from "../components/ui";
import { titleCase, CHANNEL_META } from "../lib/format";

export default function Campaigns() {
  const [rows, setRows] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => api.campaigns().then(setRows).catch(() => setRows([]));
    load();
    const id = setInterval(load, 3000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card>
      <div className="card-head between">
        <h3>All campaigns</h3>
        <button className="btn btn-primary btn-sm" onClick={() => navigate("/copilot")}>
          <Sparkles size={14} /> New with co-pilot
        </button>
      </div>
      {rows === null ? (
        <div className="card-pad stack" style={{ gap: 10 }}>
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={22} />)}
        </div>
      ) : rows.length === 0 ? (
        <Empty>No campaigns yet — start one with the co-pilot.</Empty>
      ) : (
        <table className="table">
          <thead><tr><th>Campaign</th><th>Channel</th><th>Status</th><th></th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="clickable" onClick={() => navigate(`/campaigns/${c.id}`)}>
                <td style={{ fontWeight: 600 }}>{c.name}</td>
                <td><Badge color={CHANNEL_META[c.channel]?.color}>{CHANNEL_META[c.channel]?.label || titleCase(c.channel)}</Badge></td>
                <td><StatusBadge status={c.status} /></td>
                <td style={{ textAlign: "right" }}><ChevronRight size={16} className="muted" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Card>
  );
}

function StatusBadge({ status }) {
  const map = { draft: ["#978573", "Draft"], sending: ["#d69a52", "Sending"], sent: ["#6fa471", "Sent"] };
  const [color, label] = map[status] || ["#978573", status];
  return <Badge color={color}>{label}</Badge>;
}
