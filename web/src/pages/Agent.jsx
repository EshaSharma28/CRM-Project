import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { Bot, Sparkles, Play, Mail, MessageSquare, Smartphone, Clock, Users, CheckCircle2, Loader2, ArrowDown } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

const EXAMPLES = [
  "Win back lapsed high-value customers, and keep nudging the ones who ignore us",
  "Re-engage one-time buyers across multiple channels until they respond",
  "Drive repeat orders from Potential Loyalists this month",
];

const CHANNEL_ICON = { email: Mail, sms: MessageSquare, whatsapp: Smartphone, rcs: MessageSquare };

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
          channel: s.channel, message: s.message, wait_label: s.wait_label || "",
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
    <div className="max-w-3xl mx-auto py-6 space-y-6">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-mocha to-caramel text-white mb-4 shadow-md">
          <Bot className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-mocha-dark">Autonomous agent</h1>
        <p className="text-text/60 mt-1">Give one goal. The agent plans a multi-step journey and runs it itself.</p>
      </div>

      {/* Goal input */}
      {!journeyId && (
        <div className="card">
          <div className="flex gap-2">
            <input
              value={goal} onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && makePlan()}
              placeholder="e.g. Win back lapsed VIPs and keep nudging non-responders…"
              className="input-field flex-1"
            />
            <button onClick={() => makePlan()} disabled={planning} className="btn-primary px-6 flex items-center gap-2">
              <Sparkles className="w-4 h-4" /> {planning ? "Planning…" : "Plan journey"}
            </button>
          </div>
          {!plan && (
            <div className="flex flex-wrap gap-2 mt-3">
              {EXAMPLES.map((ex) => (
                <button key={ex} onClick={() => makePlan(ex)} className="text-xs bg-surface hover:bg-caramel/10 border border-border hover:border-caramel/30 px-3 py-1.5 rounded-full transition-colors text-left">
                  {ex}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {error && <div className="card border-error/30 bg-error/5 text-error text-sm">⚠ {error}</div>}

      {planning && (
        <div className="card flex items-center gap-3"><Loader2 className="w-5 h-5 text-caramel animate-spin" /><span className="text-caramel font-medium">Designing a multi-step plan…</span></div>
      )}

      {/* Plan / live journey */}
      {(plan || journey) && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-start justify-between mb-1">
            <div>
              <div className="flex items-center gap-2 text-xs text-caramel font-medium mb-1">
                <Sparkles className="w-3.5 h-3.5" /> {journey ? "Agent journey" : "Proposed by gemini-2.5-flash"}
              </div>
              <h2 className="text-xl font-serif font-bold text-mocha-dark">{(journey || plan).name}</h2>
              <p className="text-sm text-text/60 mt-1">{(journey || plan).objective}</p>
            </div>
            {journey && (
              <span className={clsx("text-xs px-3 py-1.5 rounded-full font-medium border whitespace-nowrap",
                journey.status === "completed" ? "bg-success/10 text-success border-success/20" : "bg-warning/10 text-warning border-warning/20")}>
                {journey.status === "completed" ? "Completed" : "● Running"}
              </span>
            )}
          </div>

          {/* Steps timeline */}
          <div className="mt-5 space-y-1">
            {steps.map((s, i) => {
              const Icon = CHANNEL_ICON[s.channel] || Mail;
              const st = journey ? s.status : "planned";
              const isEditing = !journey && editingStepIndex === i;

              return (
                <div key={i}>
                  {i > 0 && (
                    <div className="flex items-center gap-2 text-text/40 text-xs pl-5 py-1">
                      <ArrowDown className="w-3.5 h-3.5" />
                      <Clock className="w-3 h-3" /> 
                      {isEditing ? (
                        <input 
                          type="text" 
                          value={s.wait_label || ""} 
                          onChange={(e) => updateStep(i, "wait_label", e.target.value)} 
                          className="bg-transparent border-b border-border outline-none text-text focus:border-caramel px-1" 
                          placeholder="Wait time..."
                        />
                      ) : (
                        <span>{s.wait_label || "next"}</span>
                      )}
                      {" "}· re-targets {labelKind(s.audience_kind)}
                    </div>
                  )}
                  <div className={clsx("rounded-xl border p-4 flex gap-3 transition-colors",
                    isEditing ? "border-caramel bg-caramel/5 shadow-sm" :
                    st === "sent" ? "border-success/30 bg-success/5" :
                    st === "running" ? "border-warning/40 bg-warning/5" :
                    st === "skipped" ? "border-border bg-surface/40 opacity-60" : "border-border bg-surface/40")}>
                    <div className="mt-0.5">
                      <StepIcon status={st} Icon={Icon} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <h3 className="font-medium text-mocha-dark">{s.label}</h3>
                        
                        {!journey && (
                          <button 
                            onClick={() => setEditingStepIndex(isEditing ? null : i)}
                            className={clsx("text-xs font-medium px-2.5 py-1 rounded-full transition-colors", 
                              isEditing ? "bg-caramel text-white" : "bg-white border border-border text-text hover:text-caramel"
                            )}
                          >
                            {isEditing ? "Save" : "Edit"}
                          </button>
                        )}
                      </div>
                      
                      {isEditing ? (
                        <div className="space-y-3 mt-2">
                          <select 
                            value={s.channel} 
                            onChange={(e) => updateStep(i, "channel", e.target.value)}
                            className="input-field py-1.5 text-sm w-fit capitalize"
                          >
                            {Object.keys(CHANNEL_ICON).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <textarea 
                            value={s.message || s.message_template} 
                            onChange={(e) => updateStep(i, "message", e.target.value)}
                            className="input-field min-h-[80px] resize-y text-sm bg-white"
                          />
                        </div>
                      ) : (
                        <>
                          <span className="text-xs text-text/50 capitalize flex items-center gap-1 mb-1">
                            <Icon className="w-3.5 h-3.5" /> {s.channel}
                          </span>
                          <p className="text-sm text-text/60 line-clamp-2">{s.message || s.message_template}</p>
                        </>
                      )}

                      {/* live stats once running */}
                      {journey && s.campaign_id && (
                        <div className="flex flex-wrap gap-3 mt-2 text-xs">
                          <Stat icon={Users} label="audience" value={s.audience_count} />
                          <Stat label="sent" value={s.stats?.sent ?? 0} />
                          <Stat label="opened" value={s.stats?.opened ?? 0} />
                          <Stat label="clicked" value={s.stats?.clicked ?? 0} />
                          <Stat label="orders" value={s.stats?.orders_attributed ?? 0} highlight />
                        </div>
                      )}
                      {journey && st === "skipped" && <p className="text-xs text-text/40 mt-2">Skipped — no one matched this step.</p>}
                      {!journey && s.audience_kind === "initial" && s.estimated_count != null && (
                        <p className="text-xs text-sage mt-2 font-medium">~{s.estimated_count} shoppers to start</p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Run button */}
          {!journeyId && (
            <button onClick={runJourney} className="btn-primary w-full mt-5 py-3 flex items-center justify-center gap-2">
              <Play className="w-5 h-5" /> Run this journey autonomously
            </button>
          )}
          {journey && journey.status !== "completed" && (
            <p className="text-center text-xs text-text/50 mt-4 flex items-center justify-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> The agent is waiting between steps, then re-targeting non-responders…
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
}

function StepIcon({ status, Icon }) {
  if (status === "sent") return <div className="bg-success/15 text-success p-2 rounded-lg"><CheckCircle2 className="w-4 h-4" /></div>;
  if (status === "running") return <div className="bg-warning/15 text-warning p-2 rounded-lg"><Loader2 className="w-4 h-4 animate-spin" /></div>;
  return <div className="bg-surface text-text/50 p-2 rounded-lg border border-border"><Icon className="w-4 h-4" /></div>;
}

function Stat({ icon: Icon, label, value, highlight }) {
  return (
    <span className={clsx("flex items-center gap-1", highlight ? "text-sage font-semibold" : "text-text/60")}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      <b className={highlight ? "text-sage" : "text-mocha-dark"}>{value}</b> {label}
    </span>
  );
}

function labelKind(kind) {
  return kind === "non_clickers_of_previous" ? "non-clickers" : kind === "non_openers_of_previous" ? "non-openers" : "audience";
}
