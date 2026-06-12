import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { api } from "../api";
import { Card, Badge, Skeleton, Empty } from "../components/ui";
import { inr, relativeDate, LIFECYCLE_META, PERSONA_LABELS, titleCase } from "../lib/format";

const STAGES = ["", "new", "active", "at_risk", "lapsed", "churned"];

export default function Shoppers() {
  const [rows, setRows] = useState(null);
  const [stage, setStage] = useState("");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    setRows(null);
    const qs = `?limit=200${stage ? `&lifecycle_stage=${stage}` : ""}`;
    api.customers(qs).then(setRows).catch(() => setRows([]));
  }, [stage]);

  const filtered = (rows || []).filter(
    (r) => !q || r.name.toLowerCase().includes(q.toLowerCase()) || r.city.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Card pad className="row wrap" style={{ gap: 12, justifyContent: "space-between" }}>
        <div className="row" style={{ gap: 10, flex: 1, minWidth: 220 }}>
          <Search size={17} className="muted" />
          <input className="input" placeholder="Search by name or city…" value={q}
            onChange={(e) => setQ(e.target.value)} style={{ border: "none", padding: "6px 0" }} />
        </div>
        <div className="row wrap" style={{ gap: 6 }}>
          {STAGES.map((s) => (
            <button key={s || "all"} className="chip"
              style={stage === s ? { borderColor: "#be7e50", background: "rgba(190,126,80,0.1)", color: "#a9683b", fontWeight: 600 } : {}}
              onClick={() => setStage(s)}>
              {s ? titleCase(s) : "All"}
            </button>
          ))}
        </div>
      </Card>

      <Card>
        {rows === null ? (
          <div className="card-pad stack" style={{ gap: 10 }}>
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} h={20} />)}
          </div>
        ) : filtered.length === 0 ? (
          <Empty>No shoppers match.</Empty>
        ) : (
          <table className="table">
            <thead>
              <tr><th>Shopper</th><th>City</th><th>Lifecycle</th><th>Orders</th><th>Spend</th><th>Last order</th></tr>
            </thead>
            <tbody>
              {filtered.slice(0, 80).map((r) => (
                <tr key={r.id} className="clickable" onClick={() => setSelected(r)}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div className="tiny muted">{PERSONA_LABELS[r.persona] || r.persona}</div>
                  </td>
                  <td className="muted">{r.city}</td>
                  <td><Badge color={LIFECYCLE_META[r.lifecycle_stage]?.color}>{titleCase(r.lifecycle_stage)}</Badge></td>
                  <td>{r.order_count}</td>
                  <td style={{ fontWeight: 600 }}>{inr(r.total_spent)}</td>
                  <td className="muted small">{relativeDate(r.last_order_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {filtered.length > 80 && <div className="card-pad tiny muted">Showing first 80 of {filtered.length}.</div>}
      </Card>

      {selected && <ShopperDrawer shopper={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function ShopperDrawer({ shopper, onClose }) {
  const [orders, setOrders] = useState(null);
  useEffect(() => {
    api.orders(`?customer_id=${shopper.id}&limit=50`).then(setOrders).catch(() => setOrders([]));
  }, [shopper.id]);

  return (
    <div className="scrim" onClick={onClose} style={{ display: "flex", justifyContent: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()} style={{
        width: 420, maxWidth: "92vw", height: "100vh", overflowY: "auto",
        background: "var(--oat)", borderLeft: "1px solid var(--cream-line)", padding: 24,
      }}>
        <div className="between" style={{ marginBottom: 18 }}>
          <div className="row">
            <div className="avatar" style={{ width: 44, height: 44, fontSize: 16 }}>
              {shopper.name.split(" ").map((s) => s[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h3>{shopper.name}</h3>
              <div className="tiny muted">{shopper.email}</div>
            </div>
          </div>
          <button className="signout" style={{ color: "#4a3525" }} onClick={onClose}><X size={18} /></button>
        </div>

        <div className="grid cols-2" style={{ gap: 10, marginBottom: 16 }}>
          <Card pad><div className="tiny muted">Lifetime spend</div><div className="serif" style={{ fontSize: 22 }}>{inr(shopper.total_spent)}</div></Card>
          <Card pad><div className="tiny muted">Orders</div><div className="serif" style={{ fontSize: 22 }}>{shopper.order_count}</div></Card>
        </div>
        <div className="row wrap" style={{ gap: 8, marginBottom: 18 }}>
          <Badge color={LIFECYCLE_META[shopper.lifecycle_stage]?.color}>{titleCase(shopper.lifecycle_stage)}</Badge>
          <Badge>{PERSONA_LABELS[shopper.persona] || shopper.persona}</Badge>
          <Badge>{shopper.city}</Badge>
          <Badge>prefers {shopper.channel_pref}</Badge>
        </div>

        <div className="eyebrow" style={{ marginBottom: 10 }}>Order history</div>
        {orders === null ? <Skeleton h={120} /> : orders.length === 0 ? (
          <Empty>No orders.</Empty>
        ) : (
          <div className="stack" style={{ gap: 8 }}>
            {orders.map((o) => (
              <Card key={o.id} pad className="between" style={{ padding: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13.5 }}>{o.product}</div>
                  <div className="tiny muted">{relativeDate(o.ordered_at)}{o.is_subscription ? " · subscription" : ""}{o.used_discount ? " · promo" : ""}</div>
                </div>
                <b>{inr(o.amount)}</b>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
