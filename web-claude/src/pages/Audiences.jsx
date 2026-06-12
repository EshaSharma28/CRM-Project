import { useEffect, useState } from "react";
import { Plus, Trash2, Users, Save } from "lucide-react";
import { api } from "../api";
import { Card, CountUp, Badge, Spinner, Empty } from "../components/ui";
import { inr } from "../lib/format";

const FIELDS = [
  { v: "lifecycle_stage", label: "Lifecycle stage", type: "stage" },
  { v: "total_spent", label: "Lifetime spend (₹)", type: "num" },
  { v: "order_count", label: "Order count", type: "num" },
  { v: "days_since_last_order", label: "Days since last order", type: "num" },
  { v: "avg_days_between_orders", label: "Avg days between orders", type: "num" },
  { v: "city", label: "City", type: "text" },
  { v: "channel_pref", label: "Preferred channel", type: "channel" },
];
const OPS = [
  { v: "gte", label: "≥" }, { v: "gt", label: ">" }, { v: "lte", label: "≤" },
  { v: "lt", label: "<" }, { v: "eq", label: "=" },
];
const STAGES = ["new", "active", "at_risk", "lapsed", "churned"];
const CHANNELS = ["whatsapp", "email", "sms", "rcs"];

export default function Audiences() {
  const [segments, setSegments] = useState([]);
  const [rules, setRules] = useState([{ field: "lifecycle_stage", op: "eq", value: "at_risk" }]);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [saved, setSaved] = useState(false);

  const loadSegments = () => api.segments().then(setSegments).catch(() => {});
  useEffect(() => { loadSegments(); }, []);

  // live preview, debounced
  useEffect(() => {
    setLoading(true);
    const t = setTimeout(() => {
      const clean = rules.map((r) => ({
        ...r,
        value: FIELDS.find((f) => f.v === r.field)?.type === "num" ? Number(r.value) : r.value,
      }));
      api.segmentsPreview(clean).then(setPreview).catch(() => setPreview({ estimated_count: 0, sample: [] })).finally(() => setLoading(false));
    }, 350);
    return () => clearTimeout(t);
  }, [rules]);

  const update = (i, patch) => setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const addRule = () => setRules((rs) => [...rs, { field: "total_spent", op: "gte", value: 5000 }]);
  const removeRule = (i) => setRules((rs) => rs.filter((_, j) => j !== i));

  async function save() {
    if (!name.trim()) return;
    const clean = rules.map((r) => ({ ...r, value: FIELDS.find((f) => f.v === r.field)?.type === "num" ? Number(r.value) : r.value }));
    await api.createSegment({ name, description: "", rules: clean });
    setName(""); setSaved(true); loadSegments();
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="grid cols-2" style={{ alignItems: "start" }}>
      {/* builder */}
      <Card>
        <div className="card-head between">
          <h3>Segment builder</h3>
          <span className="badge"><Users size={12} /> live preview</span>
        </div>
        <div className="card-pad stack" style={{ gap: 12 }}>
          {rules.map((r, i) => {
            const meta = FIELDS.find((f) => f.v === r.field) || FIELDS[0];
            return (
              <div key={i} className="row" style={{ gap: 8 }}>
                <select className="select" value={r.field}
                  onChange={(e) => {
                    const t = FIELDS.find((f) => f.v === e.target.value)?.type;
                    update(i, { field: e.target.value, value: t === "stage" ? "at_risk" : t === "channel" ? "whatsapp" : t === "num" ? 0 : "" });
                  }}>
                  {FIELDS.map((f) => <option key={f.v} value={f.v}>{f.label}</option>)}
                </select>
                <select className="select" style={{ width: 70 }} value={r.op} onChange={(e) => update(i, { op: e.target.value })}>
                  {OPS.map((o) => <option key={o.v} value={o.v}>{o.label}</option>)}
                </select>
                {meta.type === "stage" ? (
                  <select className="select" value={r.value} onChange={(e) => update(i, { value: e.target.value })}>
                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : meta.type === "channel" ? (
                  <select className="select" value={r.value} onChange={(e) => update(i, { value: e.target.value })}>
                    {CHANNELS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                ) : (
                  <input className="input" type={meta.type === "num" ? "number" : "text"} value={r.value}
                    onChange={(e) => update(i, { value: e.target.value })} />
                )}
                <button className="signout" style={{ color: "#c9695e" }} onClick={() => removeRule(i)} disabled={rules.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
          <button className="btn btn-ghost btn-sm" style={{ alignSelf: "flex-start" }} onClick={addRule}>
            <Plus size={14} /> Add rule
          </button>

          <div className="divider" />
          <div className="row" style={{ gap: 8 }}>
            <input className="input" placeholder="Name this audience…" value={name} onChange={(e) => setName(e.target.value)} />
            <button className="btn btn-sage" onClick={save} disabled={!name.trim()}>
              {saved ? <>✓ Saved</> : <><Save size={15} /> Save</>}
            </button>
          </div>
        </div>
      </Card>

      {/* preview + saved list */}
      <div className="stack" style={{ gap: 18 }}>
        <Card pad className="center" style={{ padding: 26 }}>
          <div className="serif accent" style={{ fontSize: 46, lineHeight: 1 }}>
            {loading ? <Spinner size={28} /> : <CountUp value={preview?.estimated_count || 0} />}
          </div>
          <div className="muted small" style={{ marginTop: 6 }}>shoppers match this audience</div>
        </Card>

        {preview?.sample?.length > 0 && (
          <Card>
            <div className="card-head"><h3 style={{ fontSize: 15 }}>Sample</h3></div>
            <table className="table">
              <tbody>
                {preview.sample.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td><Badge>{s.lifecycle_stage}</Badge></td>
                    <td className="muted">{inr(s.total_spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        )}

        <Card>
          <div className="card-head"><h3 style={{ fontSize: 15 }}>Saved audiences</h3></div>
          {segments.length ? (
            <table className="table">
              <tbody>
                {segments.map((s) => (
                  <tr key={s.id}>
                    <td style={{ fontWeight: 600 }}>{s.name}</td>
                    <td className="muted small">{(s.rule?.rules || []).length} rule(s)</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : <Empty>No saved audiences yet.</Empty>}
        </Card>
      </div>
    </div>
  );
}
