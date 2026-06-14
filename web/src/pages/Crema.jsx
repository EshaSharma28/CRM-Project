import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { api } from "../api";
import { Mail, MessageSquare, Smartphone, Users, FlaskConical, Rocket, Info, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import CountUp from "../components/CountUp";

const CremaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15 4.5C15 3.11929 13.8807 2 12.5 2C11.433 2 10.523 2.6685 10.1614 3.60682C9.7997 2.6685 8.88972 2 7.82276 2C6.44205 2 5.32275 3.11929 5.32275 4.5C5.32275 6.0967 6.7471 7.6432 9.3621 9.9407C9.7937 10.3201 10.4552 10.3201 10.8867 9.9407C13.5017 7.6432 14.9261 6.0967 15.0361 4.5H15Z" />
    <path d="M4 11H16V14C16 17.3137 13.3137 20 10 20C6.68629 20 4 17.3137 4 14V11Z" />
    <path d="M16 11V15H17.5C18.8807 15 20 13.8807 20 12.5C20 11.1193 18.8807 10 17.5 10H16V11Z" />
    <path d="M2 21C2 20.4477 2.44772 20 3 20H17C17.5523 20 18 20.4477 18 21C18 21.5523 17.5523 22 17 22H3C2.44772 22 2 21.5523 2 21Z" />
  </svg>
);

const BgSteamTall = ({ className }) => (
  <svg viewBox="0 0 100 200" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M40 180 C 10 160, 20 120, 30 90 C 40 60, 10 40, 20 10 C 25 -5, 40 5, 30 20" />
    <path d="M60 190 C 50 150, 80 120, 60 80 C 40 40, 60 20, 80 40 C 90 50, 80 70, 70 60" />
    <path d="M20 140 C 0 120, 50 100, 35 60" />
  </svg>
);

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

export default function Crema() {
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
  const [draftingA, setDraftingA] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imagePrompt, setImagePrompt] = useState("");
  const [genningImg, setGenningImg] = useState(false);

  async function generateImage() {
    setGenningImg(true);
    setError("");
    try {
      const r = await api.genImage(proposal.message_draft, proposal.suggested_channel);
      if (r.supported === false) { setImageUrl(""); setImagePrompt(""); }
      else { setImageUrl(r.image_url || ""); setImagePrompt(r.image_prompt || ""); }
    } catch (e) { setError(e.message); }
    finally { setGenningImg(false); }
  }

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

  async function regenerateMainMessage() {
    setDraftingA(true);
    try {
      const r = await api.draft(proposal.segment_description, proposal.suggested_channel);
      setProposal((p) => ({ ...p, message_draft: r.message_draft }));
    } catch (e) { setError(e.message); }
    finally { setDraftingA(false); }
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
        image_url: proposal.suggested_channel !== "sms" && imageUrl ? imageUrl : null,
        scheduled_at: isScheduled && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      });
      navigate(`/campaigns/${res.campaign_id}`);
    } catch (e) { setError(e.message); setLaunching(false); }
  }

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

      <div className="max-w-3xl mx-auto pb-48 pt-6 space-y-10 relative z-10">
      <div>
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-4xl font-headline-xl font-bold text-on-surface">Ask Crema</h1>
            <p className="text-on-surface-variant font-label-md mt-2 text-lg">Describe a goal — the AI does the rest</p>
          </div>
        </div>

        <div className="flex items-center gap-4 border-b border-[#bcc9cc] pb-8">
          <StepperPill active={true} label="Goal" />
          <StepperPill active={step >= 2} label="AI audience" />
          <StepperPill active={step >= 3} label="AI message" />
          <StepperPill active={launching} label="Launch" outline={!showLaunch} />
        </div>
      </div>

      <div className="space-y-8">
        <div className="bg-[#ece8dd] shadow-sm border border-[#bcc9cc] rounded-3xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="bg-[#12b1c5] text-[#001f24] p-3.5 rounded-xl shadow-md border border-[#346572]"><CremaIcon className="w-6 h-6 text-white" /></div>
            <div className="pt-1">
              <h2 className="text-2xl font-headline-md font-bold text-on-surface">What do you want to achieve?</h2>
              <p className="text-base text-on-surface-variant font-medium mt-1">Describe your goal in plain English.</p>
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
              className="w-full bg-surface-white border border-[#bcc9cc] rounded-2xl p-6 min-h-[160px] pb-24 text-on-surface focus:border-[#12b1c5] focus:ring-2 focus:ring-[#12b1c5]/20 outline-none resize-y shadow-inner text-lg font-medium placeholder:text-outline"
            />
            <div className="absolute bottom-6 left-6 text-sm text-outline font-bold">
              ⌘/Ctrl + Enter to send
            </div>
            <div className="absolute bottom-6 right-6">
              <button 
                onClick={() => submitGoal()} 
                disabled={sending || !goal.trim()} 
                className="bg-[#12b1c5] hover:brightness-110 text-[#001f24] px-8 py-3.5 rounded-full text-base font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md border border-[#346572]"
              >
                {sending ? "Thinking..." : "Ask Crema"}
              </button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            {EXAMPLES.map(ex => (
              <button 
                key={ex} 
                onClick={() => { setGoal(ex); submitGoal(ex); }} 
                className="text-sm bg-surface-white hover:bg-[#12b1c5]/10 border border-[#bcc9cc] hover:border-[#12b1c5] text-on-surface-variant hover:text-[#006875] px-4 py-2 rounded-full transition-colors font-bold text-left shadow-sm"
              >
                {ex}
              </button>
            ))}
          </div>
          {error && <p className="text-error text-sm mt-4 bg-error/10 border border-error/20 font-bold p-3 rounded-xl">⚠ {error}</p>}
        </div>

        <AnimatePresence>
          {proposal && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-surface-white rounded-3xl shadow-sm border border-[#bcc9cc] p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <Users className="w-7 h-7 text-[#77574d]" />
                  <h2 className="text-2xl font-headline-md font-bold text-on-surface">AI built your audience</h2>
                </div>
                <div className="text-xs bg-[#bf998d]/20 text-[#77574d] px-4 py-2 rounded-full font-bold flex items-center gap-2 uppercase tracking-wider">
                  <CremaIcon className="w-4 h-4" /> gemini-2.5-flash
                </div>
              </div>

              <div className="flex justify-between items-start mb-8">
                <div className="max-w-[70%]">
                  <h3 className="text-sm font-bold text-[#77574d] uppercase tracking-widest mb-2">{proposal.segment_name}</h3>
                  <p className="text-on-surface text-lg leading-relaxed font-medium">{proposal.segment_description}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-6xl font-headline-xl font-bold text-[#bf998d] leading-none drop-shadow-sm">
                    <CountUp value={proposal.estimated_count} />
                  </div>
                  <div className="text-sm text-on-surface-variant mt-3 uppercase tracking-wider font-bold">matched shoppers</div>
                </div>
              </div>

              <div className="flex flex-wrap gap-3 mb-6">
                {proposal.rules.map((r, i) => (
                  <span key={i} className="text-sm bg-[#bf998d]/10 border border-[#bf998d]/30 px-4 py-2 rounded-xl text-on-surface shadow-sm">
                    <span className="font-bold text-[#77574d]">{r.field}</span> <span className="text-on-surface-variant px-1.5 font-medium">{r.op}</span> <span className="font-bold">{Array.isArray(r.value) ? r.value.join(",") : String(r.value)}</span>
                  </span>
                ))}
              </div>

              <button className="text-sm text-[#77574d] flex items-center gap-1.5 hover:underline font-bold mb-8">
                <Info className="w-4 h-4" /> How the AI chose these rules
              </button>

              {sample && sample.length > 0 && (
                <div className="border-t border-[#bcc9cc]/60 pt-6">
                  <p className="text-xs text-on-surface-variant mb-4 font-bold uppercase tracking-wider">A few who match:</p>
                  <div className="flex flex-wrap gap-3">
                    {sample.map(c => (
                      <div key={c.id} className="bg-surface-container-low border border-[#bcc9cc] rounded-xl px-4 py-2 text-sm text-on-surface shadow-sm font-medium">
                        {c.name} <span className="text-[#bf998d] font-bold ml-1">· {inrCompact(c.total_spent)}</span>
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
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-surface-white rounded-3xl shadow-sm border border-[#bcc9cc] p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-7 h-7 text-[#346572]" />
                  <h2 className="text-2xl font-headline-md font-bold text-on-surface">AI drafted your message</h2>
                </div>
              </div>

              <div className="mb-8">
                <label className="block text-sm font-bold text-on-surface uppercase tracking-wider mb-3">Channel</label>
                <div className="flex bg-[#ece8dd] p-1.5 rounded-xl border border-[#bcc9cc] w-fit shadow-inner">
                  {CHANNELS.map(({ id, icon: Icon }) => (
                    <button key={id} onClick={() => setChannel(id)}
                      className={clsx("px-5 py-2.5 text-base font-bold rounded-lg capitalize flex items-center gap-2 transition-all",
                        proposal.suggested_channel === id ? "bg-surface-white shadow-sm text-[#346572] border border-[#bcc9cc]" : "text-on-surface-variant hover:text-on-surface")}>
                      <Icon className="w-5 h-5" /> {id}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-3">
                  <label className="text-sm font-bold text-on-surface uppercase tracking-wider">Message Copy</label>
                  <button onClick={regenerateMainMessage} disabled={draftingA} className="text-sm bg-[#ece8dd] border border-[#bcc9cc] text-on-surface px-4 py-2 rounded-xl hover:bg-surface-container-low transition-colors font-bold flex items-center gap-2 shadow-sm">
                    <CremaIcon className="w-4 h-4 text-[#346572]" /> {draftingA ? "Drafting…" : "Regenerate Message"}
                  </button>
                </div>
                <textarea 
                  value={proposal.message_draft} 
                  onChange={(e) => setMessage(e.target.value)} 
                  className="w-full bg-surface-container-low border border-[#bcc9cc] rounded-2xl p-6 min-h-[160px] text-on-surface font-medium focus:border-[#12b1c5] focus:ring-2 focus:ring-[#12b1c5]/20 outline-none resize-y text-lg shadow-inner leading-relaxed" 
                />
              </div>

              {/* AI rich-media image */}
              <div className="mt-6">
                <label className="block text-sm font-bold text-on-surface uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Rich-media image</span>
                  {proposal.suggested_channel === "sms"
                    ? <span className="text-outline font-medium lowercase tracking-normal">SMS is text-only</span>
                    : <button onClick={generateImage} disabled={genningImg}
                        className="text-sm bg-[#ece8dd] border border-[#bcc9cc] text-on-surface px-4 py-2 rounded-xl hover:bg-surface-container-low transition-colors font-bold flex items-center gap-2 shadow-sm lowercase-none">
                        <ImageIcon className="w-4 h-4 text-[#346572]" /> {genningImg ? "Generating…" : imageUrl ? "Regenerate" : "Generate with AI"}
                      </button>}
                </label>
                {proposal.suggested_channel !== "sms" && (
                  imageUrl ? (
                    <div className="rounded-2xl overflow-hidden border border-[#bcc9cc] shadow-sm bg-surface-container-low">
                      <img src={imageUrl} alt="AI generated" className="w-full h-auto object-contain"
                        onError={(e)=>{e.currentTarget.style.opacity=.3;}} />
                      {imagePrompt && <p className="text-xs text-on-surface-variant p-3 italic">✦ {imagePrompt}</p>}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-dashed border-[#bcc9cc] p-6 text-center text-on-surface-variant text-sm">
                      Generate a photo to attach (WhatsApp / RCS / Email show rich media).
                    </div>
                  )
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLaunch && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-[#ece8dd] rounded-3xl shadow-sm border border-[#bcc9cc] p-8">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h3 className="text-xl font-headline-md font-bold text-on-surface flex items-center gap-3">
                    <FlaskConical className="w-6 h-6 text-[#346572]" /> A/B Test Variants (Optional)
                  </h3>
                  <p className="text-base text-on-surface-variant mt-2 font-medium">Test a second message variant to optimize engagement.</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={abEnabled}
                  onClick={() => setAbEnabled(!abEnabled)}
                  className={clsx(
                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none shadow-inner",
                    abEnabled ? "bg-[#346572]" : "bg-[#bcc9cc]"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={clsx(
                      "pointer-events-none inline-block h-7 w-7 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out",
                      abEnabled ? "translate-x-6" : "translate-x-0"
                    )}
                  />
                </button>
              </div>
              
              {abEnabled && (
                <div className="mb-8 p-6 bg-surface-white border border-[#bcc9cc] rounded-2xl shadow-sm">
                  <div className="flex justify-between items-center mb-6">
                    <span className="text-sm font-bold text-on-surface uppercase tracking-wider">Variant B Message</span>
                    <button onClick={generateVariantB} disabled={draftingB} className="text-sm bg-[#ece8dd] border border-[#bcc9cc] text-on-surface px-4 py-2 rounded-xl hover:bg-surface-container-low transition-colors font-bold flex items-center gap-2 shadow-sm">
                      <CremaIcon className="w-4 h-4 text-[#346572]" /> {draftingB ? "Drafting…" : "Auto-Generate B"}
                    </button>
                  </div>
                  
                  <div className="mb-5">
                    <label className="block text-xs font-bold text-on-surface uppercase tracking-wider mb-3">Variant B Channel</label>
                    <div className="flex bg-[#ece8dd] p-1.5 rounded-xl border border-[#bcc9cc] w-fit shadow-inner">
                      {CHANNELS.map(({ id, icon: Icon }) => {
                        const isSelected = channelB === id || (!channelB && proposal.suggested_channel === id);
                        return (
                          <button key={`b-${id}`} onClick={() => setChannelB(id)}
                            className={clsx("px-4 py-2 text-sm font-bold rounded-lg capitalize flex items-center gap-1.5 transition-colors",
                              isSelected ? "bg-surface-white shadow-sm text-[#346572] border border-[#bcc9cc]" : "text-on-surface-variant hover:text-on-surface")}>
                            <Icon className="w-4 h-4" /> {id}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <textarea value={variantB} onChange={(e) => setVariantB(e.target.value)} placeholder="Type a completely different angle..." className="w-full bg-surface-container-low border border-[#bcc9cc] rounded-xl p-5 min-h-[120px] text-base font-medium outline-none focus:border-[#346572] resize-y shadow-inner leading-relaxed" />
                </div>
              )}

              <div className="mb-6 space-y-4">
                <div className="flex gap-4">
                  <button onClick={() => setIsScheduled(!isScheduled)} className={clsx("flex-1 py-4 rounded-xl border text-base font-bold transition-colors shadow-sm", isScheduled ? "bg-[#001f24] text-white border-[#001f24]" : "bg-surface-white text-on-surface-variant border-[#bcc9cc] hover:border-[#006875]")}>
                    {isScheduled ? "Cancel Schedule" : "Schedule for Later"}
                  </button>
                </div>
                <AnimatePresence>
                  {isScheduled && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="w-full bg-surface-white border border-[#bcc9cc] text-on-surface font-bold py-4 px-5 rounded-xl outline-none focus:border-[#12b1c5] shadow-inner text-base" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <button onClick={launch} disabled={launching || proposal.estimated_count === 0 || (isScheduled && !scheduledAt)} className="w-full bg-[#12b1c5] hover:brightness-110 text-[#001f24] py-5 rounded-2xl font-bold text-xl flex items-center justify-center gap-3 shadow-md transition-all disabled:opacity-50">
                <Rocket className="w-6 h-6" /> 
                {launching ? "Processing…" : proposal.estimated_count === 0 ? "No shoppers match" : isScheduled ? `Schedule for ${proposal.estimated_count.toLocaleString()} shoppers` : `Launch to ${proposal.estimated_count.toLocaleString()} shoppers`}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      </div>
    </div>
  );
}

function StepperPill({ active, label, outline }) {
  if (outline) {
    return (
      <div className="flex items-center gap-2 bg-transparent border border-[#bcc9cc] px-5 py-2.5 rounded-full text-on-surface-variant text-base font-bold">
        {label}
      </div>
    );
  }
  return (
    <div className={clsx("flex items-center gap-2 px-5 py-2.5 rounded-full text-base font-bold transition-all shadow-sm", 
      active ? "bg-[#12b1c5] text-[#001f24] border border-[#346572]" : "bg-surface-white border border-[#bcc9cc] text-on-surface-variant")}>
      <div className={clsx("w-4 h-4 rounded-full flex items-center justify-center", active ? "bg-[#001f24]/20" : "bg-surface-container-low border border-[#bcc9cc]")}>
      </div>
      {label}
    </div>
  );
}
