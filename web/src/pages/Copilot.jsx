import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { Bot, Sparkles, Mail, MessageSquare, Smartphone, Users, FlaskConical, Rocket, Info, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import CountUp from "../components/CountUp";

const CHANNELS = [
  { id: "email", icon: Mail },
  { id: "sms", icon: MessageSquare },
  { id: "whatsapp", icon: Smartphone },
];

const EXAMPLES = [
  "Win back lapsed high-value customers",
  "Reward our Champions with a thank-you perk",
  "Re-engage one-time buyers who never came back",
  "Welcome shoppers who just placed their first order",
];

const inrCompact = (n) =>
  n == null ? "—" : n >= 1e5 ? `₹${(n / 1e5).toFixed(1)}L` : `₹${Math.round(n).toLocaleString("en-IN")}`;

export default function Copilot() {
  const navigate = useNavigate();
  const location = useLocation();
  const [goal, setGoal] = useState("");
  const [sending, setSending] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [sample, setSample] = useState([]);
  const [error, setError] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [abEnabled, setAbEnabled] = useState(false);
  const [variantB, setVariantB] = useState("");
  const [channelB, setChannelB] = useState("");
  const [draftingB, setDraftingB] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");

  const step = proposal ? (proposal.suggested_channel ? 3 : 2) : 1;
  const showLaunch = proposal && proposal.message_draft;

  useEffect(() => {
    if (location.state?.initialGoal && !sending && !proposal) {
      setGoal(location.state.initialGoal);
      submitGoal(location.state.initialGoal);
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  async function submitGoal(textOverride) {
    const text = (textOverride ?? goal).trim();
    if (!text || sending) return;
    setError("");
    setSending(true);
    try {
      const nextMsg = [{ role: "user", content: text }];
      const res = await api.chat(nextMsg, null);
      setProposal(res.proposal);
      if (!campaignName) setCampaignName(res.proposal.segment_name || "AI Campaign");
      
      if (res.proposal.rules && res.proposal.rules.length > 0) {
        try {
          const preview = await api.previewSegment(res.proposal.rules);
          setSample(preview.sample || []);
        } catch (e) {
          console.error("Preview failed", e);
        }
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setSending(false);
    }
  }

  const setChannel = (c) => setProposal((p) => ({ ...p, suggested_channel: c }));
  const setMessage = (m) => setProposal((p) => ({ ...p, message_draft: m }));

  async function generateVariantB() {
    setDraftingB(true);
    try {
      const targetChannel = channelB || proposal.suggested_channel;
      const r = await api.draft(`${proposal.segment_description}. A DIFFERENT angle from the main message, for an A/B test.`, targetChannel);
      setVariantB(r.message_draft || "");
    } catch (e) { setError(e.message); }
    finally { setDraftingB(false); }
  }

  async function launch() {
    setLaunching(true);
    setError("");
    try {
      const res = await api.launch({
        name: campaignName || proposal.segment_name,
        description: proposal.segment_description,
        rules: proposal.rules,
        channel: proposal.suggested_channel,
        message_template: proposal.message_draft,
        message_template_b: abEnabled && variantB.trim() ? variantB : null,
        channel_b: abEnabled && channelB && channelB !== proposal.suggested_channel ? channelB : null,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      navigate(`/campaigns/${res.campaign_id}`);
    } catch (e) { setError(e.message); setLaunching(false); }
  }

  return (
    <div className="max-w-4xl mx-auto pb-20">
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-serif font-bold text-mocha-dark">Campaign co-pilot</h1>
            <p className="text-text/60 mt-1 text-sm">Describe a goal — the AI does the rest</p>
          </div>
          <div className="flex items-center gap-1.5 text-text/50 text-sm">
            <Bot className="w-4 h-4" /> Brewhaus Coffee Co.
          </div>
        </div>

        <div className="flex items-center gap-3 border-b border-border/50 pb-4">
          <StepperPill active={true} label="Goal" />
          <StepperPill active={step >= 2} label="AI audience" />
          <StepperPill active={step >= 3} label="AI message" />
          <StepperPill active={launching} label="Launch" outline={!showLaunch} />
        </div>
      </div>

      <div className="space-y-6">
        <div className="card shadow-sm border border-border">
          <div className="flex items-start gap-3 mb-4">
            <div className="bg-caramel/15 text-caramel p-2 rounded-lg"><Sparkles className="w-5 h-5" /></div>
            <div>
              <h2 className="text-lg font-serif font-bold text-mocha-dark">What do you want to achieve?</h2>
              <p className="text-xs text-text/50">Describe your goal in plain English.</p>
            </div>
          </div>
          
          <div className="relative">
            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  submitGoal();
                }
              }}
              placeholder="e.g. Reward our most loyal subscribers with a thank-you perk"
              className="w-full bg-white border border-border rounded-xl p-4 min-h-[120px] pb-16 text-mocha-dark focus:border-caramel/50 focus:ring-2 focus:ring-caramel/10 outline-none resize-y shadow-inner text-sm"
            />
            <div className="absolute bottom-4 left-4 text-[10px] text-text/40 font-mono">
              ⌘/Ctrl + Enter to send
            </div>
            <div className="absolute bottom-4 right-4">
              <button 
                onClick={() => submitGoal()} 
                disabled={sending || !goal.trim()} 
                className="bg-[#BE7E50] hover:bg-[#A66C44] text-white px-5 py-2.5 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-caramel/20"
              >
                <Sparkles className="w-4 h-4" /> {sending ? "Thinking..." : "Ask the co-pilot"}
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button 
                key={ex} 
                onClick={() => { setGoal(ex); submitGoal(ex); }} 
                className="text-[11px] bg-surface hover:bg-caramel/10 border border-border text-text/60 hover:text-caramel px-3 py-1.5 rounded-full transition-colors font-medium text-left"
              >
                {ex}
              </button>
            ))}
          </div>
          {error && <p className="text-error text-xs mt-3 bg-error/10 p-2 rounded">⚠ {error}</p>}
        </div>

        <AnimatePresence>
          {proposal && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-mocha-dark" />
                  <h2 className="text-lg font-serif font-bold text-mocha-dark">AI built your audience</h2>
                </div>
                <div className="text-[10px] bg-sage/20 text-sage px-2 py-1 rounded-full font-bold flex items-center gap-1 uppercase tracking-wider">
                  <Sparkles className="w-3 h-3" /> gemini-2.5-flash
                </div>
              </div>

              <div className="flex justify-between items-start mb-6">
                <div className="max-w-[70%]">
                  <h3 className="text-xs font-bold text-caramel uppercase tracking-widest mb-1.5">{proposal.segment_name}</h3>
                  <p className="text-mocha-dark text-sm leading-relaxed">{proposal.segment_description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-4xl font-serif font-bold text-[#BE7E50] leading-none">
                    <CountUp value={proposal.estimated_count} />
                  </div>
                  <div className="text-[10px] text-text/50 mt-1 uppercase tracking-wider font-medium">matched shoppers</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                {proposal.rules.map((r, i) => (
                  <span key={i} className="text-[11px] bg-[#F7F4F0] border border-[#EBE4D9] px-2.5 py-1.5 rounded-lg text-mocha-dark">
                    <span className="font-bold text-caramel">{r.field}</span> <span className="text-text/50 px-0.5">{r.op}</span> <span className="font-medium">{Array.isArray(r.value) ? r.value.join(",") : String(r.value)}</span>
                  </span>
                ))}
              </div>

              <button className="text-[10px] text-[#BE7E50] flex items-center gap-1 hover:underline font-medium mb-6">
                <Info className="w-3.5 h-3.5" /> How the AI chose these rules
              </button>

              {sample && sample.length > 0 && (
                <div className="border-t border-border/60 pt-5">
                  <p className="text-[11px] text-text/50 mb-3 font-medium uppercase tracking-wider">A few who match:</p>
                  <div className="flex flex-wrap gap-2">
                    {sample.map(c => (
                      <div key={c.id} className="bg-white border border-[#EBE4D9] rounded-lg px-3 py-1.5 text-xs text-mocha-dark shadow-sm">
                        {c.name} <span className="text-caramel font-bold ml-1">· {inrCompact(c.total_spent)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {proposal && proposal.message_draft && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card shadow-sm border border-border">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-mocha-dark" />
                  <h2 className="text-lg font-serif font-bold text-mocha-dark">AI drafted your message</h2>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-bold text-mocha-dark uppercase tracking-wider mb-2">Channel</label>
                <div className="flex bg-surface p-1 rounded-lg border border-border w-fit">
                  {CHANNELS.map(({ id, icon: Icon }) => (
                    <button key={id} onClick={() => setChannel(id)}
                      className={clsx("px-4 py-2 text-sm font-medium rounded-md capitalize flex items-center gap-2 transition-colors",
                        proposal.suggested_channel === id ? "bg-white shadow-sm text-caramel font-bold border border-caramel/20" : "text-text/60 hover:text-mocha-dark")}>
                      <Icon className="w-4 h-4" /> {id}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-mocha-dark uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Message Copy</span>
                  <span className="text-text/40 font-normal lowercase tracking-normal">Editable</span>
                </label>
                <textarea 
                  value={proposal.message_draft} 
                  onChange={(e) => setMessage(e.target.value)} 
                  className="w-full bg-white border border-border rounded-xl p-4 min-h-[120px] text-mocha-dark focus:border-caramel/50 focus:ring-2 focus:ring-caramel/10 outline-none resize-y text-sm shadow-inner leading-relaxed" 
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLaunch && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card shadow-sm border border-border bg-gradient-to-br from-surface to-white">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-sm font-bold text-mocha-dark flex items-center gap-1.5">
                    <FlaskConical className="w-4 h-4 text-caramel" /> A/B Test Variants (Optional)
                  </h3>
                  <p className="text-xs text-text/60 mt-1">Test a second message variant to optimize engagement.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={abEnabled} onChange={(e) => setAbEnabled(e.target.checked)} className="sr-only peer" />
                  <div className="w-10 h-6 bg-border rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-caramel"></div>
                </label>
              </div>
              
              {abEnabled && (
                <div className="mb-6 p-4 bg-white border border-caramel/20 rounded-xl">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-xs font-bold text-mocha-dark uppercase tracking-wider">Variant B Message</span>
                    <button onClick={generateVariantB} disabled={draftingB} className="text-xs bg-surface border border-border text-mocha-dark px-3 py-1.5 rounded-lg hover:bg-white transition-colors font-medium flex items-center gap-1.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 text-caramel" /> {draftingB ? "Drafting…" : "Auto-Generate B"}
                    </button>
                  </div>
                  
                  <div className="mb-3">
                    <label className="block text-[10px] font-bold text-mocha-dark uppercase tracking-wider mb-1.5">Variant B Channel</label>
                    <div className="flex bg-surface p-1 rounded-lg border border-border w-fit">
                      {CHANNELS.map(({ id, icon: Icon }) => {
                        const isSelected = channelB === id || (!channelB && proposal.suggested_channel === id);
                        return (
                          <button key={`b-${id}`} onClick={() => setChannelB(id)}
                            className={clsx("px-3 py-1.5 text-[11px] font-medium rounded-md capitalize flex items-center gap-1.5 transition-colors",
                              isSelected ? "bg-white shadow-sm text-caramel font-bold border border-caramel/20" : "text-text/60 hover:text-mocha-dark")}>
                            <Icon className="w-3.5 h-3.5" /> {id}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <textarea value={variantB} onChange={(e) => setVariantB(e.target.value)} placeholder="Type a completely different angle..." className="w-full bg-surface/30 border border-border rounded-lg p-3 min-h-[90px] text-sm outline-none focus:border-caramel/50 resize-y" />
                </div>
              )}

              <div className="mb-4 space-y-3">
                <div className="flex gap-2">
                  <button onClick={() => setIsScheduled(false)} className={clsx("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors", !isScheduled ? "bg-mocha-dark text-white border-mocha-dark" : "bg-white text-text/60 border-border hover:border-mocha-dark/30")}>Send Now</button>
                  <button onClick={() => setIsScheduled(true)} className={clsx("flex-1 py-2.5 rounded-lg border text-sm font-medium transition-colors", isScheduled ? "bg-mocha-dark text-white border-mocha-dark" : "bg-white text-text/60 border-border hover:border-mocha-dark/30")}>Schedule for Later</button>
                </div>
                <AnimatePresence>
                  {isScheduled && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full input-field py-2.5" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={launch} disabled={launching || proposal.estimated_count === 0 || (isScheduled && !scheduledAt)} className="w-full bg-mocha-dark hover:bg-mocha text-white py-4 rounded-xl font-bold text-lg flex items-center justify-center gap-2 shadow-lg transition-colors disabled:opacity-50">
                <Rocket className="w-5 h-5 text-caramel" /> 
                {launching ? "Processing…" : proposal.estimated_count === 0 ? "No shoppers match" : isScheduled ? `Schedule for ${proposal.estimated_count.toLocaleString()} shoppers` : `Launch to ${proposal.estimated_count.toLocaleString()} shoppers`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StepperPill({ active, label, outline }) {
  if (outline) {
    return (
      <div className="flex items-center gap-2 bg-transparent border border-border px-4 py-2 rounded-full text-text/40 text-sm font-medium">
        {label}
      </div>
    );
  }
  return (
    <div className={clsx("flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold transition-all", 
      active ? "bg-[#EEF1EB] text-[#4F6C4E] border border-[#DEE6DA]" : "bg-surface border border-border text-text/40")}>
      <div className={clsx("w-3.5 h-3.5 rounded-full flex items-center justify-center", active ? "bg-white text-sage" : "bg-white/50")}>
      </div>
      {label}
    </div>
  );
}
