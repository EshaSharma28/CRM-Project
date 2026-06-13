import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { ShoppingCart, Zap, Clock, Smartphone, Mail, MessageSquare, TrendingUp, CheckCircle2, MailOpen, MousePointerClick } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CountUp from "../components/CountUp";

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const CHANNEL_ICON = { whatsapp: Smartphone, email: Mail, sms: MessageSquare, rcs: MessageSquare };
const STATUS_STYLE = {
  open: ["bg-warning/10 text-warning border-warning/20", "In cart"],
  purchased: ["bg-text/5 text-text/50 border-border", "Self-checkout"],
  recovery_sent: ["bg-caramel/10 text-caramel border-caramel/20", "Nudged"],
  recovered: ["bg-success/10 text-success border-success/20", "Recovered ✓"],
};

export default function Automations() {
  const [data, setData] = useState(null);
  const [carts, setCarts] = useState([]);
  const [toggling, setToggling] = useState(false);
  const timer = useRef(null);

  async function refresh() {
    try {
      const [d, cs] = await Promise.all([api.automationCart(), api.automationCarts(18)]);
      setData(d);
      setCarts(cs);
    } catch { /* ignore */ }
  }

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, 4000);
    return () => clearInterval(timer.current);
  }, []);

  async function toggle() {
    if (!data) return;
    setToggling(true);
    try {
      await api.automationToggle(!data.enabled);
      await refresh();
    } finally {
      setToggling(false);
    }
  }

  if (!data) return <div className="max-w-5xl mx-auto"><div className="card h-40 shimmer-bg" /></div>;

  const c = data.carts;
  const rs = data.recovery_stats;
  const ChannelIcon = CHANNEL_ICON[data.channel] || Smartphone;
  const funnel = [
    { label: "Abandoned", value: c.recovery_sent, icon: ShoppingCart, color: "#D69A52" },
    { label: "Nudge sent", value: rs.sent, icon: ChannelIcon, color: "#BE7E50" },
    { label: "Opened/Read", value: Math.max(rs.opened, 0), icon: MailOpen, color: "#C99A6A" },
    { label: "Clicked", value: rs.clicked, icon: MousePointerClick, color: "#A9683B" },
    { label: "Recovered", value: c.recovered, icon: CheckCircle2, color: "#6FA471" },
  ];
  const maxF = Math.max(1, ...funnel.map((f) => f.value));

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-mocha-dark">Automations</h1>
        <p className="text-text/60 mt-1">
          Always-on, event-triggered flows that run on live shopper activity — no manual send.
        </p>
      </div>

      {/* Automation card */}
      <div className="card">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="bg-caramel/10 text-caramel p-3 rounded-2xl"><ShoppingCart className="w-7 h-7" /></div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-serif font-bold text-mocha-dark">{data.name}</h2>
                {data.enabled && (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full border border-success/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" /> Live
                  </span>
                )}
              </div>
              <p className="text-sm text-text/60 mt-1 flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Trigger: cart idle {data.delay_label}</span>
                <span className="inline-flex items-center gap-1 capitalize"><ChannelIcon className="w-3.5 h-3.5" /> {data.channel}</span>
              </p>
            </div>
          </div>

          {/* toggle */}
          <button onClick={toggle} disabled={toggling}
            className={`relative w-14 h-7 rounded-full transition-colors ${data.enabled ? "bg-success" : "bg-text/20"}`}>
            <span className={`absolute top-0.5 ${data.enabled ? "left-7" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`} />
          </button>
        </div>

        {/* message preview */}
        <div className="mt-4 bg-[#E5DDD5] p-3 rounded-xl max-w-md">
          <div className="bg-white p-2.5 rounded-xl rounded-tl-sm shadow-sm text-sm text-mocha-dark inline-block">
            {data.message_template.replace("{first_name}", "Aanya").replace("{product}", "Cold Brew Kit")}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Kpi label="Open carts (live)" value={c.open} sub="being watched" tone="warning" />
        <Kpi label="Self-checkout" value={c.purchased} sub="bought on their own" tone="muted" />
        <Kpi label="Carts recovered" value={c.recovered} sub={`${data.recovery_rate}% of nudged`} tone="success" />
        <Kpi label="Recovery revenue" value={rs.attributed_revenue} fmt={(v) => inr(v)} sub="attributed to nudges" tone="accent" isText />
      </div>

      {/* Funnel + live cart feed */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <div className="card">
          <h3 className="font-serif font-bold text-lg mb-4 flex items-center gap-2"><Zap className="w-5 h-5 text-caramel" /> Recovery funnel</h3>
          <div className="space-y-3">
            {funnel.map((f) => (
              <div key={f.label} className="flex items-center gap-3">
                <span className="w-24 text-sm text-text/60 flex items-center gap-1.5"><f.icon className="w-4 h-4" />{f.label}</span>
                <div className="flex-1 h-3 bg-surface rounded-full overflow-hidden">
                  <motion.div className="h-full rounded-full" style={{ background: f.color }}
                    animate={{ width: `${(f.value / maxF) * 100}%` }} transition={{ duration: 0.6 }} />
                </div>
                <span className="w-8 text-right text-sm font-semibold text-mocha-dark">
                  <CountUp value={f.value} />
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-text/50 mt-4">
            Recovered purchases flow through the same channel loop + attribution as every other campaign — recovery revenue is measured, not assumed.
          </p>
        </div>

        <div className="card p-0 overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-serif font-bold text-lg flex items-center gap-2"><ShoppingCart className="w-5 h-5 text-caramel" /> Live cart activity</h3>
            <span className="text-xs text-text/40">auto-refreshing</span>
          </div>
          <div className="max-h-[360px] overflow-y-auto divide-y divide-border">
            <AnimatePresence initial={false}>
              {carts.map((cart) => {
                const [cls, label] = STATUS_STYLE[cart.status] || STATUS_STYLE.open;
                return (
                  <motion.div key={cart.id} initial={{ opacity: 0, backgroundColor: "rgba(190,126,80,0.08)" }}
                    animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }} className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-mocha-dark truncate">{cart.customer}</p>
                      <p className="text-xs text-text/50 truncate">{cart.product} · {inr(cart.amount)}</p>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded-full border whitespace-nowrap ${cls}`}>{label}</span>
                  </motion.div>
                );
              })}
            </AnimatePresence>
            {carts.length === 0 && <div className="p-8 text-center text-text/40 text-sm">Waiting for cart activity…</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Kpi({ label, value, fmt, sub, tone, isText }) {
  const toneCls = {
    warning: "text-warning", success: "text-success", accent: "text-caramel", muted: "text-text/50",
  }[tone] || "text-mocha-dark";
  return (
    <div className="card">
      <p className="text-xs font-medium text-text/60">{label}</p>
      <p className={`font-serif font-bold ${isText ? "text-2xl" : "text-3xl"} ${toneCls} mt-1`}>
        <CountUp value={value} formatter={fmt} />
      </p>
      <p className="text-[11px] text-text/40 mt-0.5">{sub}</p>
    </div>
  );
}
