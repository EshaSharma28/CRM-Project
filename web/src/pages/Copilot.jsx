import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Bot, Sparkles, Send, Mail, MessageSquare, Smartphone, Users, FlaskConical, Rocket, User } from "lucide-react";
import { motion } from "framer-motion";
import clsx from "clsx";

const EXAMPLES = [
  "Win back lapsed high-value customers",
  "Reward our Champions with a thank-you perk",
  "Re-engage one-time buyers who never came back",
  "Welcome shoppers who just placed their first order",
];

const CHANNELS = [
  { id: "email", icon: Mail },
  { id: "sms", icon: MessageSquare },
  { id: "whatsapp", icon: Smartphone },
];

export default function Copilot() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [proposal, setProposal] = useState(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [campaignName, setCampaignName] = useState("");
  const [abEnabled, setAbEnabled] = useState(false);
  const [variantB, setVariantB] = useState("");
  const [draftingB, setDraftingB] = useState(false);
  const [launching, setLaunching] = useState(false);
  const threadRef = useRef(null);

  useEffect(() => {
    threadRef.current?.scrollTo({ top: threadRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function send(text) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    setError("");
    setInput("");
    const next = [...messages, { role: "user", content }];
    setMessages(next);
    setSending(true);
    try {
      const res = await api.chat(next, proposal);
      setMessages([...next, { role: "assistant", content: res.reply }]);
      setProposal(res.proposal);
      if (!campaignName) setCampaignName(res.proposal.segment_name || "AI Campaign");
    } catch (e) {
      setError(e.message);
      setMessages(next);
    } finally {
      setSending(false);
    }
  }

  const setChannel = (c) => setProposal((p) => ({ ...p, suggested_channel: c }));
  const setMessage = (m) => setProposal((p) => ({ ...p, message_draft: m }));

  async function generateVariantB() {
    setDraftingB(true);
    try {
      const r = await api.draft(`${proposal.segment_description}. A DIFFERENT angle from the main message, for an A/B test.`, proposal.suggested_channel);
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
      });
      navigate(`/campaigns/${res.campaign_id}`);
    } catch (e) { setError(e.message); setLaunching(false); }
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-5">
        <div className="bg-gradient-to-tr from-caramel to-warning text-white p-2.5 rounded-xl shadow-sm"><Bot className="w-6 h-6" /></div>
        <div>
          <h1 className="text-2xl font-serif font-bold text-mocha-dark">Campaign co-pilot</h1>
          <p className="text-sm text-text/60">Describe a goal, then refine it in conversation. The proposal updates as you chat.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Chat */}
        <div className="card flex flex-col h-[600px]">
          <div ref={threadRef} className="flex-1 overflow-y-auto space-y-3 pr-1">
            {messages.length === 0 && (
              <div className="h-full flex flex-col items-center justify-center text-center gap-4 text-text/50">
                <Sparkles className="w-8 h-8 text-caramel/40" />
                <p className="text-sm">Tell me who you want to reach.</p>
                <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                  {EXAMPLES.map((ex) => (
                    <button key={ex} onClick={() => send(ex)} className="text-xs bg-surface hover:bg-caramel/10 border border-border hover:border-caramel/30 px-3 py-1.5 rounded-full transition-colors">
                      {ex}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => (
              <Bubble key={i} role={m.role} content={m.content} />
            ))}
            {sending && <Bubble role="assistant" content={<span className="inline-flex gap-1 items-center text-text/50"><Sparkles className="w-3.5 h-3.5 animate-pulse" /> thinking…</span>} />}
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              placeholder={proposal ? "Refine it… e.g. 'only Mumbai', 'shorter message', 'use SMS'" : "Describe your goal…"}
              className="input-field flex-1"
            />
            <button onClick={() => send()} disabled={sending} className="btn-primary px-5 flex items-center gap-2">
              <Send className="w-4 h-4" />
            </button>
          </div>
          {error && <p className="text-error text-sm mt-2">⚠ {error}</p>}
        </div>

        {/* Working proposal */}
        {proposal ? (
          <motion.div initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} className="card space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-xs text-sage font-medium flex items-center gap-1 mb-1"><Sparkles className="w-3 h-3" /> Working proposal</div>
                <input value={campaignName} onChange={(e) => setCampaignName(e.target.value)} className="font-serif font-bold text-lg text-mocha-dark bg-transparent outline-none border-b border-transparent focus:border-border w-full" />
              </div>
              <div className="text-right shrink-0 ml-3">
                <div className="text-3xl font-serif font-bold text-sage leading-none">{proposal.estimated_count}</div>
                <div className="text-[11px] text-text/50">shoppers</div>
              </div>
            </div>

            <p className="text-sm text-text/60">{proposal.segment_description}</p>

            <div className="flex flex-wrap gap-1.5">
              {proposal.rules.map((r, i) => (
                <span key={i} className="text-xs bg-surface border border-border px-2 py-1 rounded-lg">
                  <span className="font-medium text-mocha-dark">{r.field}</span>{" "}
                  <span className="text-text/40">{r.op}</span>{" "}
                  <span className="text-caramel font-medium">{Array.isArray(r.value) ? r.value.join(", ") : String(r.value)}</span>
                </span>
              ))}
            </div>

            <div>
              <label className="block text-xs font-medium text-text/60 mb-1.5">Channel</label>
              <div className="flex bg-surface p-1 rounded-lg border border-border w-fit">
                {CHANNELS.map(({ id, icon: Icon }) => (
                  <button key={id} onClick={() => setChannel(id)}
                    className={clsx("px-3 py-1.5 text-sm font-medium rounded-md capitalize flex items-center gap-1.5",
                      proposal.suggested_channel === id ? "bg-white shadow-sm text-mocha-dark" : "text-text/60")}>
                    <Icon className="w-4 h-4" /> {id}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-text/60 mb-1.5">Message</label>
              <textarea value={proposal.message_draft} onChange={(e) => setMessage(e.target.value)} className="input-field min-h-[90px] resize-y text-sm" />
              <Preview channel={proposal.suggested_channel} text={proposal.message_draft} />
            </div>

            {/* A/B */}
            <div className="border-t border-border pt-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={abEnabled} onChange={(e) => setAbEnabled(e.target.checked)} className="w-4 h-4 accent-caramel" />
                <span className="text-sm font-medium text-mocha-dark flex items-center gap-1.5"><FlaskConical className="w-4 h-4 text-caramel" /> A/B test a second message</span>
              </label>
              {abEnabled && (
                <div className="mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-text/60">Variant B</span>
                    <button onClick={generateVariantB} disabled={draftingB} className="text-xs text-caramel font-medium flex items-center gap-1 hover:underline">
                      <Sparkles className="w-3 h-3" /> {draftingB ? "Drafting…" : "Generate with AI"}
                    </button>
                  </div>
                  <textarea value={variantB} onChange={(e) => setVariantB(e.target.value)} placeholder="Alternative message to test…" className="input-field min-h-[70px] resize-y text-sm" />
                </div>
              )}
            </div>

            <button onClick={launch} disabled={launching || proposal.estimated_count === 0} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <Rocket className="w-5 h-5" /> {launching ? "Launching…" : proposal.estimated_count === 0 ? "No shoppers match" : `Launch to ${proposal.estimated_count} shoppers`}
            </button>
          </motion.div>
        ) : (
          <div className="card h-[600px] flex items-center justify-center text-center text-text/40">
            <div>
              <Users className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Your audience & message will appear here<br />as you chat with the co-pilot.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ role, content }) {
  const isUser = role === "user";
  return (
    <div className={clsx("flex gap-2", isUser ? "justify-end" : "justify-start")}>
      {!isUser && <div className="bg-caramel/15 text-caramel p-1.5 rounded-lg h-fit"><Bot className="w-4 h-4" /></div>}
      <div className={clsx("max-w-[80%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed",
        isUser ? "bg-caramel text-white rounded-tr-sm" : "bg-surface border border-border text-mocha-dark rounded-tl-sm")}>
        {content}
      </div>
      {isUser && <div className="bg-sage/20 text-sage p-1.5 rounded-lg h-fit"><User className="w-4 h-4" /></div>}
    </div>
  );
}

function Preview({ channel, text }) {
  const parts = String(text || "").split(/(\{.*?\})/).map((p, i) =>
    /^\{.*\}$/.test(p) ? <span key={i} className="text-caramel font-medium bg-caramel/10 px-1 rounded">{p}</span> : p
  );
  if (channel === "email") {
    return <div className="mt-2 bg-white border border-border rounded-lg p-3 text-sm text-mocha-dark whitespace-pre-wrap">{parts}</div>;
  }
  return (
    <div className="mt-2 bg-[#E5DDD5] p-3 rounded-lg">
      <div className="bg-white p-2.5 rounded-xl rounded-tl-sm shadow-sm text-sm whitespace-pre-wrap inline-block max-w-[90%]">{parts}</div>
    </div>
  );
}
