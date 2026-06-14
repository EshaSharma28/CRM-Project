import { useEffect, useState, useRef } from "react";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, AreaChart, Area } from "recharts";
import CountUp from "../components/CountUp";

const inr = (n) => "₹" + Math.round(n || 0).toLocaleString("en-IN");
const CHANNEL_SYMBOL = { whatsapp: "chat_bubble", email: "mail", sms: "sms", rcs: "sms" };
const STATUS_STYLE = {
  open: ["bg-surface-container-highest text-on-surface-variant", "In cart"],
  purchased: ["bg-primary text-on-primary", "Self-checkout"],
  recovery_sent: ["bg-secondary-container text-secondary font-bold", "Nudged"],
  recovered: ["bg-tertiary-container text-on-tertiary-container font-bold", "Recovered"],
};

const AVATAR_COLORS = [
  "bg-secondary-container text-secondary",
  "bg-tertiary-fixed text-tertiary",
  "bg-primary-fixed text-primary",
  "bg-on-tertiary-fixed-variant/10 text-on-tertiary-fixed-variant",
  "bg-secondary-fixed text-on-secondary-fixed-variant",
];

// Show {tokens} highlighted so it's clear the message is personalised per shopper.
function renderTokens(text) {
  return String(text || "").split(/(\{[a-z_]+\})/g).map((part, i) =>
    /^\{[a-z_]+\}$/.test(part)
      ? <span key={i} className="bg-primary/10 text-primary font-semibold px-1 rounded not-italic">{part}</span>
      : part
  );
}

export default function Automations() {
  const [data, setData] = useState(null);
  const [carts, setCarts] = useState([]);
  const [bday, setBday] = useState(null);
  const [toggling, setToggling] = useState(false);
  const [triggerTime, setTriggerTime] = useState("2 hours");
  const [showOptHub, setShowOptHub] = useState(false);
  const [opt, setOpt] = useState({ by_segment: [], by_product: [] });
  const timer = useRef(null);

  // Real, live breakdowns from cart_events (see /abandoned-cart/optimization).
  const segmentData = opt.by_segment;
  const productData = opt.by_product;

  async function refresh() {
    try {
      const [d, cs, b, o] = await Promise.all([
        api.automationCart(), api.automationCarts(18),
        api.birthdayAutomation().catch(() => null),
        api.cartOptimization().catch(() => null),
      ]);
      setData(d);
      setCarts(cs);
      if (b) setBday(b);
      if (o) setOpt(o);
    } catch { /* ignore */ }
  }

  async function toggleBday() {
    if (!bday) return;
    await api.birthdayToggle(!bday.enabled);
    refresh();
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

  if (!data) return (
    <div className="max-w-7xl mx-auto p-8"><div className="h-40 rounded-xl bg-surface-container shimmer-bg" /></div>
  );

  const c = data.carts;
  const rs = data.recovery_stats;
  const channelSymbol = CHANNEL_SYMBOL[data.channel] || "chat_bubble";

  const getInitials = (name) => {
    const parts = (name || "").trim().split(" ");
    if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase();
    return (name?.slice(0, 2) || "U").toUpperCase();
  };

  const getAvatarColor = (name) => {
    const code = (name || "").charCodeAt(0) || 0;
    return AVATAR_COLORS[code % AVATAR_COLORS.length];
  };

  return (
    <div className="relative min-h-full">
      {/* Faded Background Cliparts */}
      <div className="fixed top-[10%] right-[5%] w-full max-w-[280px] opacity-[0.06] pointer-events-none z-0">
        <img src="/automation-bg-1.png" alt="" className="w-full h-auto object-contain" />
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Automations</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Always-on, event-triggered flows that run on live shopper activity — no manual send.
            </p>
          </div>
        </section>

      {/* Birthday Offer automation */}
      {bday && (
        <section className="glass-effect rounded-xl p-6 border border-outline-variant/40">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-tertiary-container/30 flex items-center justify-center text-2xl">🎂</div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-headline-md text-lg font-bold text-on-surface">{bday.name}</h3>
                  {bday.enabled && (
                    <span className="text-xs font-medium text-green-700 bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-600 animate-pulse" /> Live
                    </span>
                  )}
                </div>
                <p className="text-sm text-on-surface-variant mt-0.5">Trigger: shopper's birthday · {bday.channel}</p>
              </div>
            </div>
            <button onClick={toggleBday}
              className={`relative w-14 h-7 rounded-full transition-colors ${bday.enabled ? "bg-primary" : "bg-outline-variant"}`}>
              <span className={`absolute top-0.5 ${bday.enabled ? "left-7" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`} />
            </button>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-5">
            {[
              ["🎉 Birthdays today", bday.birthdays_today, "text-tertiary"],
              ["Offers sent", bday.stats.sent, "text-on-surface"],
              ["Read", (bday.stats.read || 0) + (bday.stats.opened || 0), "text-primary"],
              ["Revenue", "₹" + Math.round(bday.stats.attributed_revenue || 0).toLocaleString("en-IN"), "text-green-700"],
            ].map(([label, val, cls]) => (
              <div key={label} className="bg-surface-container-low rounded-xl p-4 border border-outline-variant/30">
                <p className="text-xs text-on-surface-variant">{label}</p>
                <p className={`text-2xl font-bold font-headline-md mt-1 ${cls}`}>{val}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-[#E5DDD5] p-3 rounded-xl max-w-md">
            <div className="bg-white p-2.5 rounded-xl rounded-tl-sm shadow-sm text-sm text-mocha-dark inline-block">
              {renderTokens(bday.message_template)}
            </div>
          </div>
        </section>
      )}

      {/* Active Automation Card */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 glass-effect rounded-xl p-6 border border-outline-variant/40 flex flex-col gap-6 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[32px]">shopping_cart_checkout</span>
              </div>
              <div>
                <h3 className="font-headline-md text-headline-md text-on-surface">{data.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`w-2 h-2 rounded-full ${data.enabled ? "bg-green-500 animate-pulse" : "bg-outline"} `}></span>
                  <span className={`font-label-sm text-label-sm uppercase tracking-wider font-bold ${data.enabled ? "text-green-600" : "text-outline"}`}>
                    {data.enabled ? "Live Status" : "Paused"}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={toggling ? undefined : toggle}
                className={`relative w-14 h-7 rounded-full transition-colors ${data.enabled ? "bg-primary" : "bg-outline-variant"}`}>
                <span className={`absolute top-0.5 ${data.enabled ? "left-7" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Trigger</p>
              <div className="flex items-center gap-2 text-on-surface font-medium">
                <span className="material-symbols-outlined text-[20px] text-tertiary">timer</span>
                <select 
                  value={triggerTime} 
                  onChange={(e) => setTriggerTime(e.target.value)}
                  className="bg-transparent border-b border-outline-variant/50 outline-none focus:border-primary text-sm font-medium py-0.5 pr-2"
                >
                  <option value="15 mins">Cart idle 15 mins</option>
                  <option value="1 hour">Cart idle 1 hour</option>
                  <option value="2 hours">Cart idle 2 hours</option>
                  <option value="1 day">Cart idle 1 day</option>
                </select>
              </div>
            </div>
            <div className="bg-surface-container-low p-4 rounded-lg border border-outline-variant/20">
              <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-2">Channel</p>
              <div className="flex items-center gap-2 text-on-surface font-medium capitalize">
                <span className={`material-symbols-outlined text-[20px] ${data.channel === 'whatsapp' ? 'text-[#25D366]' : 'text-primary'}`} style={{ fontVariationSettings: "'FILL' 1" }}>
                  {channelSymbol}
                </span>
                <span>{data.channel}</span>
              </div>
            </div>
          </div>
          <div className="mt-2">
            <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-3">Message Preview</p>
            <div className="bg-white p-4 rounded-2xl rounded-tl-none border border-outline-variant/30 max-w-sm shadow-sm relative">
              <p className="font-body-md text-body-md text-on-surface italic">
                "{renderTokens(data.message_template)}"
              </p>
              <div className="mt-3 flex justify-between items-center text-xs text-outline font-medium">
                <span>14:32</span>
                <span className="material-symbols-outlined text-[16px] text-primary">done_all</span>
              </div>
            </div>
          </div>
        </div>
        
        <div 
          onClick={() => setShowOptHub(true)}
          className="lg:col-span-1 rounded-xl overflow-hidden shadow-sm relative group cursor-pointer border border-outline-variant/30 h-full min-h-[300px] bg-[#f8f3e8]"
        >
          <div className="absolute inset-0 pt-12 opacity-60 group-hover:opacity-100 transition-opacity duration-700">
             <ResponsiveContainer width="100%" height="100%">
               <AreaChart data={segmentData}>
                 <defs>
                   <linearGradient id="colorRecCard" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#12b1c5" stopOpacity={0.6}/>
                     <stop offset="95%" stopColor="#12b1c5" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <Area type="monotone" dataKey="recovered" stroke="#12b1c5" strokeWidth={3} fillOpacity={1} fill="url(#colorRecCard)" />
               </AreaChart>
             </ResponsiveContainer>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#001f24]/90 via-[#001f24]/40 to-transparent flex flex-col justify-end p-6">
            <h4 className="text-white font-headline-md">Optimization Hub</h4>
            <p className="text-white/80 font-label-md mt-1">View detailed segment analytics for cart recovery performance.</p>
            <div className="mt-4 flex items-center gap-2 text-[#001f24] font-bold text-sm bg-white/90 w-fit px-3 py-1.5 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-all transform translate-y-2 group-hover:translate-y-0">
              <span className="material-symbols-outlined text-[18px]">open_in_full</span> Open Widget
            </div>
          </div>
        </div>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-container-padding-desktop">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Open carts (live)</p>
            <h5 className="font-headline-lg text-headline-lg text-on-surface">
              <CountUp value={c.open} /> <span className="text-on-surface-variant/50 font-medium text-lg">active</span>
            </h5>
          </div>
          <div className="flex items-center gap-1 mt-4 text-primary font-bold text-sm">
            <span className="material-symbols-outlined text-[18px]">trending_up</span>
            <span>Watching now</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Self-checkout</p>
            <h5 className="font-headline-lg text-headline-lg text-on-surface">
              <CountUp value={c.purchased} /> <span className="text-on-surface-variant/50 font-medium text-lg">shoppers</span>
            </h5>
          </div>
          <div className="flex items-center gap-1 mt-4 text-tertiary font-bold text-sm">
            <span className="material-symbols-outlined text-[18px]">shopping_bag</span>
            <span>Bought on their own</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Carts recovered</p>
            <h5 className="font-headline-lg text-headline-lg text-on-surface">
              <CountUp value={c.recovered} /> <span className="text-on-surface-variant/50 font-medium text-lg">total</span>
            </h5>
          </div>
          <div className="flex items-center gap-1 mt-4 text-green-600 font-bold text-sm">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{data.recovery_rate}% of nudged</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-outline-variant/20 flex flex-col justify-between hover:border-primary/40 transition-colors">
          <div>
            <p className="font-label-md text-label-md text-on-surface-variant mb-1">Recovery revenue</p>
            <h5 className="font-headline-lg text-headline-lg text-on-surface">
              <CountUp value={rs.attributed_revenue} formatter={inr} />
            </h5>
          </div>
          <div className="flex items-center gap-1 mt-4 text-primary font-bold text-sm">
            <span className="material-symbols-outlined text-[18px]">payments</span>
            <span>Attributed to nudges</span>
          </div>
        </div>
      </section>

      {/* Bottom Section: Funnel & Live Activity */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-container-padding-desktop items-start">
        {/* Recovery Funnel */}
        <div className="bg-surface-container-lowest p-8 rounded-xl border border-outline-variant/20">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-headline-md text-headline-md">Recovery funnel</h3>
            <span className="material-symbols-outlined text-outline cursor-pointer">more_horiz</span>
          </div>
          <div className="space-y-6">
            <FunnelBar label="Abandoned" value={c.recovery_sent} max={Math.max(1, c.recovery_sent)} colorClass="bg-primary" />
            <FunnelBar label="Nudge sent" value={rs.sent} max={Math.max(1, c.recovery_sent)} colorClass="bg-primary-container" />
            <FunnelBar label="Opened/Read" value={Math.max(0, rs.opened)} max={Math.max(1, c.recovery_sent)} colorClass="bg-outline-variant" />
            <FunnelBar label="Clicked" value={rs.clicked} max={Math.max(1, c.recovery_sent)} colorClass="bg-secondary-container" />
            <FunnelBar label="Recovered" value={c.recovered} max={Math.max(1, c.recovery_sent)} colorClass="bg-tertiary-container" highlight />
          </div>
        </div>

        {/* Live Cart Activity */}
        <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden flex flex-col">
          <div className="p-8 border-b border-outline-variant/10 flex justify-between items-center">
            <div>
              <h3 className="font-headline-md text-headline-md">Live cart activity</h3>
              <p className="text-xs text-green-600 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                Auto-refreshing
              </p>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[400px]">
            <table className="w-full text-left">
              <tbody className="divide-y divide-outline-variant/5">
                <AnimatePresence initial={false}>
                  {carts.map((cart) => {
                    const [cls, label] = STATUS_STYLE[cart.status] || STATUS_STYLE.open;
                    return (
                      <motion.tr 
                        key={cart.id} 
                        initial={{ opacity: 0, backgroundColor: "rgba(182, 232, 246, 0.5)" }}
                        animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
                        className="group hover:bg-surface-container-low transition-colors"
                      >
                        <td className="py-4 px-8">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${getAvatarColor(cart.customer)}`}>
                              {getInitials(cart.customer)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-on-surface block truncate">{cart.customer}</span>
                              <span className="text-xs text-on-surface-variant block truncate">{cart.product}</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-8">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase whitespace-nowrap ${cls}`}>
                            {label}
                          </span>
                        </td>
                        <td className="py-4 px-8 text-right">
                          <span className="text-xs text-outline font-medium block whitespace-nowrap">{inr(cart.amount)}</span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
                {carts.length === 0 && (
                  <tr><td colSpan="3" className="p-8 text-center text-text/40 text-sm">Waiting for cart activity…</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
      </div>

      {/* Optimization Hub Modal */}
      <AnimatePresence>
        {showOptHub && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-on-surface/30 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-surface-white border border-outline-variant/30 rounded-3xl p-8 w-full max-w-5xl max-h-[90vh] overflow-y-auto shadow-xl relative"
            >
              <button 
                onClick={() => setShowOptHub(false)}
                className="absolute top-6 right-6 p-2 rounded-full hover:bg-surface-container transition-colors text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-[24px]">close</span>
              </button>

              <div className="mb-8 pr-12">
                <h2 className="text-3xl font-headline-lg font-bold text-on-surface flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-primary-container/20 flex items-center justify-center text-primary">
                    <span className="material-symbols-outlined text-[28px]">insert_chart</span>
                  </div>
                  Optimization Hub
                </h2>
                <p className="text-on-surface-variant font-label-md mt-2 ml-15">Deep dive into your cart recovery performance metrics.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Chart 1: Products (real) */}
                <div className="bg-[#f8f3e8] p-6 rounded-2xl border border-[#bcc9cc] shadow-sm">
                  <h3 className="font-headline-md font-bold text-on-surface mb-1">Recovery by Product</h3>
                  <p className="text-sm text-on-surface-variant mb-8">Which abandoned products convert after a nudge.</p>
                  <div className="h-72">
                    {productData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">No cart activity yet.</div>
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={productData} layout="vertical" margin={{ top: 10, right: 10, left: 40, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#bcc9cc" />
                        <XAxis type="number" tick={{fontSize: 12, fill: "#77574d"}} axisLine={false} tickLine={false} />
                        <YAxis type="category" dataKey="product" width={130} tick={{fontSize: 10, fill: "#77574d"}} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: 'rgba(119, 87, 77, 0.05)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #bcc9cc', backgroundColor: '#fff', padding: '12px' }} />
                        <Bar dataKey="abandoned" fill="#d6b884" radius={[0,6,6,0]} name="Abandoned" />
                        <Bar dataKey="recovered" fill="#006875" radius={[0,6,6,0]} name="Recovered" />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Chart 2: Segments (real) */}
                <div className="bg-[#f8f3e8] p-6 rounded-2xl border border-[#bcc9cc] shadow-sm">
                  <h3 className="font-headline-md font-bold text-on-surface mb-1">Audience Breakdown</h3>
                  <p className="text-sm text-on-surface-variant mb-8">Abandonment vs Recovery by RFM segment.</p>
                  <div className="h-72">
                    {segmentData.length === 0 ? (
                      <div className="h-full flex items-center justify-center text-sm text-on-surface-variant">No cart activity yet.</div>
                    ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={segmentData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#bcc9cc" />
                        <XAxis dataKey="segment" tick={{fontSize: 12, fill: "#77574d"}} axisLine={false} tickLine={false} />
                        <YAxis tick={{fontSize: 12, fill: "#77574d"}} axisLine={false} tickLine={false} />
                        <RechartsTooltip cursor={{ fill: 'rgba(119, 87, 77, 0.05)' }} contentStyle={{ borderRadius: '12px', border: '1px solid #bcc9cc', backgroundColor: '#fff', padding: '12px' }} />
                        <Bar dataKey="abandoned" fill="#d6b884" radius={[6,6,0,0]} name="Abandoned" />
                        <Bar dataKey="recovered" fill="#006875" radius={[6,6,0,0]} name="Recovered" />
                      </BarChart>
                    </ResponsiveContainer>
                    )}
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}

function FunnelBar({ label, value, max, colorClass, highlight }) {
  const pct = Math.min(100, Math.round((value / max) * 100));
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span className="text-on-surface">{label}</span>
        <span className={highlight ? "text-primary font-bold" : "text-on-surface-variant"}>
          <CountUp value={value} />
        </span>
      </div>
      <div className="h-2.5 w-full bg-surface-container rounded-full overflow-hidden">
        <motion.div 
          className={`h-full rounded-full ${colorClass}`} 
          initial={{ width: 0 }} 
          animate={{ width: `${pct}%` }} 
          transition={{ duration: 0.6, ease: "easeOut" }} 
        />
      </div>
    </div>
  );
}
