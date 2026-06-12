import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCheck, MailOpen, Eye, MousePointerClick, XCircle, Send, Radio } from "lucide-react";
import { api } from "../api";
import { Card, Empty } from "../components/ui";

// Visualises the async callback loop: we poll campaign stats and surface the
// DELTAS as a live event stream — i.e. what the stubbed channel service just
// reported back to the CRM. Demonstrates the two-service callback architecture.
const EVENT_META = {
  sent: { icon: Send, color: "#9a8576", bg: "#f0e7d9", verb: "sent" },
  delivered: { icon: CheckCheck, color: "#be7e50", bg: "#f6ead9", verb: "delivered" },
  opened: { icon: MailOpen, color: "#d69a52", bg: "#f8eed9", verb: "opened" },
  read: { icon: Eye, color: "#b8945c", bg: "#f6eedd", verb: "read" },
  clicked: { icon: MousePointerClick, color: "#6fa471", bg: "#e6f0e2", verb: "clicked" },
  failed: { icon: XCircle, color: "#c9695e", bg: "#f6e2df", verb: "failed" },
  orders_attributed: { icon: MousePointerClick, color: "#a9683b", bg: "#f3e7d8", verb: "converted to an order" },
};
const KEYS = ["sent", "delivered", "opened", "read", "clicked", "failed", "orders_attributed"];

export default function Activity() {
  const [feed, setFeed] = useState([]);
  const snap = useRef({});      // campaignId -> last stats
  const names = useRef({});     // campaignId -> name
  const seq = useRef(0);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const campaigns = await api.campaigns();
        campaigns.forEach((c) => (names.current[c.id] = c.name));
        const all = await Promise.all(campaigns.map((c) => api.stats(c.id).then((s) => [c.id, s]).catch(() => null)));
        if (!active) return;
        const newItems = [];
        all.filter(Boolean).forEach(([cid, s]) => {
          const prev = snap.current[cid];
          if (prev) {
            KEYS.forEach((k) => {
              const delta = (s[k] || 0) - (prev[k] || 0);
              if (delta > 0) {
                newItems.push({
                  id: ++seq.current, cid, type: k, delta,
                  name: names.current[cid] || `Campaign #${cid}`,
                  t: new Date().toLocaleTimeString("en-IN", { hour12: false }),
                });
              }
            });
          }
          snap.current[cid] = s;
        });
        if (newItems.length) setFeed((f) => [...newItems.reverse(), ...f].slice(0, 60));
      } catch { /* ignore */ }
    }
    poll();
    const iv = setInterval(poll, 1500);
    return () => { active = false; clearInterval(iv); };
  }, []);

  return (
    <div className="grid cols-2" style={{ alignItems: "start" }}>
      <Card>
        <div className="card-head between">
          <div className="row" style={{ gap: 9 }}><Radio size={16} style={{ color: "#6fa471" }} /><h3>Channel activity</h3></div>
          <span className="live-badge"><span className="dot" /> live</span>
        </div>
        {feed.length === 0 ? (
          <Empty>
            Waiting for channel receipts…<br />
            <span className="small">Launch a campaign from the co-pilot and watch events stream in here.</span>
          </Empty>
        ) : (
          <div>
            <AnimatePresence initial={false}>
              {feed.map((e) => {
                const m = EVENT_META[e.type];
                const Icon = m.icon;
                return (
                  <motion.div key={e.id} className="feed-item"
                    initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                    <div className="feed-ico" style={{ background: m.bg, color: m.color }}><Icon size={15} /></div>
                    <div className="grow">
                      <div style={{ fontSize: 13.5 }}>
                        <b>{e.delta}</b> message{e.delta > 1 ? "s" : ""} {m.verb}
                      </div>
                      <div className="tiny muted">{e.name}</div>
                    </div>
                    <span className="tiny muted">{e.t}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </Card>

      <Card pad>
        <div className="eyebrow">How this works</div>
        <h3 style={{ fontSize: 17, margin: "8px 0 10px" }}>A two-service callback loop</h3>
        <p className="soft small" style={{ lineHeight: 1.65 }}>
          When a campaign launches, the CRM hands each message to a <b>separate stubbed
          channel service</b>. That service doesn't really deliver anything — it
          simulates outcomes and <b>calls back asynchronously</b> into the CRM's
          receipt API with what "happened": delivered, opened, read, clicked or failed.
        </p>
        <div className="divider" />
        <div className="stack" style={{ gap: 10 }}>
          {[
            ["Out-of-order", "Events arrive on independent delays — a click can land before its delivery."],
            ["Idempotent", "Each receipt has an event id; replays are dropped by the database."],
            ["Forward-only", "Status never regresses, so late events can't corrupt state."],
            ["Retries", "Failed callbacks retry with backoff."],
          ].map(([t, d]) => (
            <div key={t} className="row" style={{ gap: 10, alignItems: "flex-start" }}>
              <span className="dot" style={{ background: "#6fa471", marginTop: 7 }} />
              <div><b className="small">{t}.</b> <span className="soft small">{d}</span></div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
