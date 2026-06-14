import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { motion } from "framer-motion";
import clsx from "clsx";

const EXAMPLES = [
  "Win back lapsed high-value customers, and keep nudging the ones who ignore us",
  "Re-engage one-time buyers across multiple channels until they respond",
  "Drive repeat orders from Potential Loyalists this month",
];

const CHANNEL_ICON = { email: "alternate_email", sms: "textsms", whatsapp: "chat", rcs: "textsms" };
const CHANNEL_SYMBOL = { email: "mail", sms: "sms", whatsapp: "smartphone", rcs: "sms" };

const BgSteamTall = ({ className }) => (
  <svg viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M40 180 C 10 160, 20 120, 30 90 C 40 60, 10 40, 20 10 C 25 -5, 40 5, 30 20" />
    <path d="M60 190 C 50 150, 80 120, 60 80 C 40 40, 60 20, 80 40 C 90 50, 80 70, 70 60" />
    <path d="M20 140 C 0 120, 50 100, 35 60" />
  </svg>
);

export default function Agent() {
  const [goal, setGoal] = useState("");
  const [planning, setPlanning] = useState(false);
  const [plan, setPlan] = useState(null);
  const [error, setError] = useState("");
  const [journeyId, setJourneyId] = useState(null);
  const [journey, setJourney] = useState(null);
  const [editingStepIndex, setEditingStepIndex] = useState(null);
  const poll = useRef(null);

  async function makePlan(text) {
    const g = (text ?? goal).trim();
    if (!g) return;
    setGoal(g); setError(""); setPlan(null); setJourney(null); setJourneyId(null); setEditingStepIndex(null);
    setPlanning(true);
    try {
      setPlan(await api.agentPlan(g));
    } catch (e) { setError(e.message); }
    finally { setPlanning(false); }
  }

  const updateStep = (index, field, value) => {
    const newSteps = [...plan.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setPlan({ ...plan, steps: newSteps });
  };

  async function runJourney() {
    setEditingStepIndex(null);
    try {
      const payload = {
        name: plan.name, goal, objective: plan.objective || "",
        steps: plan.steps.map((s) => ({
          label: s.label, audience_kind: s.audience_kind, rules: s.rules || [],
          channel: s.channel, message: s.message || s.message_template, wait_label: s.wait_label || "",
        })),
      };
      const res = await api.agentRun(payload);
      setJourneyId(res.journey_id);
    } catch (e) { setError(e.message); }
  }

  useEffect(() => {
    if (!journeyId) return;
    const tick = async () => {
      try {
        const j = await api.agentJourney(journeyId);
        setJourney(j);
        if (j.status === "completed" && poll.current) clearInterval(poll.current);
      } catch { /* ignore */ }
    };
    tick();
    poll.current = setInterval(tick, 1500);
    return () => clearInterval(poll.current);
  }, [journeyId]);

  const steps = journey?.steps || plan?.steps || [];

  return (
    <div className="relative min-h-full">
      {/* Faded Background Cliparts */}
      <div className="fixed top-[5%] left-[25%] w-full max-w-[120px] pointer-events-none z-0">
        <BgSteamTall className="w-full h-auto text-[#77574d] opacity-[0.06]" />
      </div>
      <div className="fixed bottom-[30%] left-[22%] w-full max-w-[240px] opacity-[0.07] pointer-events-none z-0">
        <img src="/walking-pots.png" alt="" className="w-full h-auto object-contain" />
      </div>
      <div className="fixed top-[15%] right-[2%] w-full max-w-[340px] opacity-[0.06] pointer-events-none z-0">
        <img src="/clipart-heads.png" alt="" className="w-full h-auto object-contain" />
      </div>
      <div className="fixed bottom-0 right-[15%] w-full max-w-[200px] opacity-[0.08] pointer-events-none z-0 pb-8">
        <img src="/clipart-guy.png" alt="" className="w-full h-auto object-contain" />
      </div>

      <div className="max-w-4xl mx-auto py-6 relative z-10">
        {/* Header Section */}
        <header className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-tertiary-container rounded-full mb-6 shadow-sm">
          <span className="material-symbols-outlined text-on-tertiary-container text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
        </div>
        <h1 className="font-headline-xl text-headline-xl text-on-background mb-4">Autonomous agent</h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant max-w-xl mx-auto">
          Give one goal. The agent plans a multi-step journey and runs it itself.
        </p>
      </header>

      {/* Goal Input Area */}
      {!journeyId && (
        <section className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 mb-10 shadow-sm transition-all hover:shadow-md">
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  className="w-full bg-transparent border-none focus:ring-0 font-body-lg text-on-surface px-4 outline-none"
                  placeholder="Enter your campaign goal..."
                  type="text"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && makePlan()}
                />
              </div>
              <button
                onClick={() => makePlan()}
                disabled={planning}
                className="bg-on-surface text-surface px-8 py-3 rounded-lg font-label-md hover:opacity-90 transition-opacity flex items-center gap-2 group disabled:opacity-50"
              >
                {planning ? (
                  <span className="material-symbols-outlined animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined group-hover:rotate-12 transition-transform">bolt</span>
                )}
                {planning ? "Planning..." : "Plan journey"}
              </button>
            </div>
            {!plan && !planning && (
              <div className="flex flex-wrap gap-2 px-4">
                {EXAMPLES.map((ex) => (
                  <button key={ex} onClick={() => makePlan(ex)} className="text-xs bg-surface-container-low hover:bg-surface-container-high border border-outline-variant px-3 py-1.5 rounded-full transition-colors text-left text-on-surface-variant">
                    {ex}
                  </button>
                ))}
              </div>
            )}
            {error && <div className="text-error text-sm px-4 mt-2">⚠ {error}</div>}
          </div>
        </section>
      )}

      {/* Proposed Journey Section */}
      {(plan || journey) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <section className="bg-surface-container-low border border-outline-variant rounded-xl overflow-hidden relative">
            <div className="p-8">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
                <span className="font-label-sm text-primary uppercase tracking-wider">
                  {journey ? "Agent journey" : "Proposed by gemini-2.5-flash"}
                </span>
                {journey && (
                  <span className={clsx("ml-auto text-xs px-3 py-1 rounded-full font-bold", 
                    journey.status === "completed" ? "bg-primary-container text-on-primary-container" : "bg-tertiary-container text-on-tertiary-container animate-pulse"
                  )}>
                    {journey.status === "completed" ? "Completed" : "Running"}
                  </span>
                )}
              </div>
              <h2 className="font-headline-lg text-headline-lg text-on-background mb-1">{(journey || plan).name}</h2>
              <p className="text-on-surface-variant font-body-md mb-8">{(journey || plan).objective}</p>
              
              <div className="space-y-6 relative">
                {steps.map((s, i) => {
                  const channelKey = s.channel || "email";
                  const IconName = CHANNEL_ICON[channelKey] || "alternate_email";
                  const OuterIconName = CHANNEL_SYMBOL[channelKey] || "mail";
                  const st = journey ? s.status : "planned";
                  const isEditing = !journey && editingStepIndex === i;

                  return (
                    <div key={i} className={clsx("relative pl-12 group", i > 0 && "pt-4")}>
                      <div className="absolute left-0 top-4 w-10 h-10 bg-surface-container-highest border border-outline-variant rounded-lg flex items-center justify-center z-10">
                        {st === "sent" ? (
                          <span className="material-symbols-outlined text-primary">check_circle</span>
                        ) : st === "running" ? (
                          <span className="material-symbols-outlined text-tertiary animate-spin">sync</span>
                        ) : (
                          <span className="material-symbols-outlined text-on-surface-variant">{OuterIconName}</span>
                        )}
                      </div>
                      
                      <div className={clsx("bg-surface rounded-lg p-6 border border-outline-variant shadow-sm transition-colors",
                          !journey && "group-hover:border-primary",
                          st === "sent" && "border-primary/30 bg-primary-container/5",
                          st === "running" && "border-tertiary/30 bg-tertiary-container/5",
                          st === "skipped" && "opacity-60"
                        )}>
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-label-md text-on-background text-lg font-bold">{s.label}</h3>
                            <div className="flex items-center gap-1.5 text-on-surface-variant opacity-70">
                              <span className="material-symbols-outlined text-sm">{IconName}</span>
                              <span className="text-sm capitalize">{s.channel}</span>
                            </div>
                          </div>
                          {!journey && (
                            <button 
                              onClick={() => setEditingStepIndex(isEditing ? null : i)}
                              className={clsx("font-label-md px-3 py-1 border rounded transition-colors",
                                isEditing ? "text-surface bg-primary border-primary hover:bg-primary/90" : "text-primary border-primary/20 hover:bg-primary/5"
                              )}
                            >
                              {isEditing ? "Save" : "Edit"}
                            </button>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-3 mt-4">
                            <select 
                              value={s.channel} 
                              onChange={(e) => updateStep(i, "channel", e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-sm focus:border-primary outline-none"
                            >
                              {Object.keys(CHANNEL_ICON).map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <textarea 
                              value={s.message || s.message_template} 
                              onChange={(e) => updateStep(i, "message", e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 min-h-[80px] resize-y text-sm focus:border-primary outline-none"
                            />
                            {i > 0 && (
                              <input 
                                type="text" 
                                value={s.wait_label || ""} 
                                onChange={(e) => updateStep(i, "wait_label", e.target.value)} 
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded p-2 text-sm focus:border-primary outline-none" 
                                placeholder="Wait time (e.g. 3 days)..."
                              />
                            )}
                          </div>
                        ) : (
                          <p className="text-on-surface-variant font-body-md mb-2">{s.message || s.message_template}</p>
                        )}
                        
                        {/* Status / Audience Footers */}
                        {!journey && s.audience_kind === "initial" && s.estimated_count != null && (
                          <span className="text-xs font-medium text-secondary italic opacity-60">~{s.estimated_count} shoppers to start</span>
                        )}
                        {journey && st === "skipped" && (
                          <span className="text-xs font-medium text-on-surface-variant italic opacity-60">Skipped — no one matched this step.</span>
                        )}
                        {journey && s.campaign_id && (
                          <div className="flex flex-wrap gap-4 mt-4 pt-3 border-t border-outline-variant/30">
                            <Stat label="Audience" value={s.audience_count} />
                            <Stat label="Sent" value={s.stats?.sent ?? 0} />
                            <Stat label="Opened" value={s.stats?.opened ?? 0} />
                            <Stat label="Clicked" value={s.stats?.clicked ?? 0} />
                            <Stat label="Orders" value={s.stats?.orders_attributed ?? 0} highlight />
                          </div>
                        )}
                      </div>

                      {/* Connector Line */}
                      {i < steps.length - 1 && (
                        <>
                          <div className="absolute left-5 top-14 bottom-[-24px] w-0.5 bg-outline-variant opacity-50 z-0"></div>
                          <div className="absolute left-3.5 -bottom-5 flex flex-col items-center gap-0.5 bg-surface-container-low z-10 px-1 py-2">
                            <span className="material-symbols-outlined text-on-surface-variant text-xs">schedule</span>
                            <span className="text-[10px] text-on-surface-variant font-bold">
                              {steps[i + 1].wait_label || "next"}
                            </span>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Run Button */}
            {!journeyId && (
              <div className="bg-surface p-6 border-t border-outline-variant">
                <button
                  onClick={runJourney} 
                  className="w-full bg-on-surface text-surface font-headline-md py-4 rounded-xl flex items-center justify-center gap-3 hover:bg-on-surface/90 transition-all active:scale-[0.99]"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  Run this journey autonomously
                </button>
              </div>
            )}
            {journey && journey.status !== "completed" && (
              <div className="bg-surface p-4 border-t border-outline-variant flex items-center justify-center gap-2 text-on-surface-variant font-label-md">
                <span className="material-symbols-outlined animate-spin text-tertiary">sync</span>
                <span>The agent is waiting between steps, then re-targeting non-responders...</span>
              </div>
            )}
          </section>
        </motion.div>
      )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-on-surface-variant opacity-70">{label}</span>
      <span className={clsx("font-bold text-lg leading-tight", highlight ? "text-primary" : "text-on-background")}>
        {value}
      </span>
    </div>
  );
}
