import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, Send, Info, RefreshCw, Rocket, Check, Wand2, Users2,
} from "lucide-react";
import { api, MODEL_NAME } from "../api";
import { Card, AiPill, Thinking, CountUp, Spinner } from "../components/ui";
import RuleChips from "../components/RuleChips";
import MessagePreview from "../components/MessagePreview";
import { CHANNEL_META } from "../lib/format";

const EXAMPLES = [
  "Win back high-value regulars who went quiet in the last couple of months",
  "Reward our most loyal subscribers with a thank-you perk",
  "Re-engage one-time buyers who never came back",
  "Welcome new shoppers who just placed their first order",
];

const STEPS = ["Goal", "AI audience", "AI message", "Launch"];

export default function Copilot() {
  const navigate = useNavigate();
  const [goal, setGoal] = useState("");
  const [thinking, setThinking] = useState(false);
  const [proposal, setProposal] = useState(null);
  const [sample, setSample] = useState([]);
  const [channel, setChannel] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [regenerating, setRegenerating] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const [showGround, setShowGround] = useState(false);

  const step = !proposal ? 0 : 2; // 0 = goal; once proposed we show audience+message

  async function propose(g) {
    const text = (g ?? goal).trim();
    if (!text) return;
    setGoal(text);
    setError("");
    setProposal(null);
    setSample([]);
    setThinking(true);
    try {
      const p = await api.propose(text);
      setProposal(p);
      setChannel(p.suggested_channel);
      setMessage(p.message_draft);
      // pull a real sample of matched shoppers for proof
      api.segmentsPreview(p.rules).then((r) => setSample(r.sample || [])).catch(() => {});
    } catch (e) {
      setError(e.message);
    } finally {
      setThinking(false);
    }
  }

  async function regenerate() {
    setRegenerating(true);
    try {
      const p = await api.propose(goal);
      setMessage(p.message_draft);
    } catch (e) {
      setError(e.message);
    } finally {
      setRegenerating(false);
    }
  }

  async function launch() {
    setLaunching(true);
    setError("");
    try {
      const res = await api.launch({
        name: proposal.segment_name,
        description: proposal.segment_description,
        rules: proposal.rules,
        channel,
        message_template: message,
      });
      navigate(`/campaigns/${res.campaign_id}`);
    } catch (e) {
      setError(e.message);
      setLaunching(false);
    }
  }

  const empty = proposal?.estimated_count === 0;

  return (
    <div className="stack" style={{ gap: 20, maxWidth: 880 }}>
      {/* stepper */}
      <div className="stepper">
        {STEPS.map((s, i) => {
          const state = step >= 2 ? (i < 3 ? "done" : "current") : i === 0 ? "current" : "";
          const cls = step >= 2 && i < 3 ? "done" : i === step ? "current" : "";
          return (
            <div className={`step ${cls}`} key={s}>
              <span className="step-num">{cls === "done" ? <Check size={12} /> : i + 1}</span>
              {s}
            </div>
          );
        })}
      </div>

      {/* STEP 1 — goal */}
      <Card pad>
        <div className="row" style={{ gap: 9, marginBottom: 10 }}>
          <span className="ico" style={{ width: 32, height: 32, background: "#f3ece1", color: "#a9683b", borderRadius: 9, display: "grid", placeItems: "center" }}>
            <Wand2 size={17} />
          </span>
          <div>
            <h3 style={{ fontSize: 16 }}>What do you want to achieve?</h3>
            <div className="muted small">Describe your goal in plain English.</div>
          </div>
        </div>
        <textarea
          className="textarea"
          rows={3}
          value={goal}
          placeholder="e.g. Win back high-value regulars who haven't ordered in a while…"
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) propose(); }}
        />
        <div className="between" style={{ marginTop: 12 }}>
          <span className="tiny muted">⌘/Ctrl + Enter to send</span>
          <button className="btn btn-primary" onClick={() => propose()} disabled={thinking}>
            {thinking ? <Thinking /> : <><Sparkles size={16} /> Ask the co-pilot</>}
          </button>
        </div>

        {!proposal && !thinking && (
          <div className="grid cols-2" style={{ marginTop: 16, gap: 10 }}>
            {EXAMPLES.map((ex) => (
              <button key={ex} className="example-chip" onClick={() => propose(ex)}>
                <Sparkles size={15} style={{ color: "#be7e50", flexShrink: 0 }} /> {ex}
              </button>
            ))}
          </div>
        )}
      </Card>

      {error && <div className="error-banner">⚠ {error}</div>}

      {thinking && (
        <Card pad>
          <div className="row" style={{ gap: 12 }}>
            <Spinner size={18} />
            <div>
              <div style={{ fontWeight: 600 }}>The co-pilot is working…</div>
              <div className="muted small">Reading your data, building the audience, drafting a message.</div>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2 + 3 */}
      <AnimatePresence>
        {proposal && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="stack"
            style={{ gap: 20 }}
          >
            {/* audience */}
            <Card>
              <div className="card-head between">
                <div className="row" style={{ gap: 9 }}>
                  <Users2 size={18} style={{ color: "#a9683b" }} />
                  <h3>AI built your audience</h3>
                </div>
                <AiPill>{MODEL_NAME}</AiPill>
              </div>
              <div className="card-pad">
                <div className="between" style={{ alignItems: "flex-start", gap: 16 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="eyebrow">{proposal.segment_name}</div>
                    <p className="soft" style={{ margin: "6px 0 14px", fontSize: 14 }}>
                      {proposal.segment_description}
                    </p>
                    <RuleChips rules={proposal.rules} />
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div className="serif" style={{ fontSize: 38, color: empty ? "#c9695e" : "#a9683b", lineHeight: 1 }}>
                      <CountUp value={proposal.estimated_count} />
                    </div>
                    <div className="tiny muted">matched shoppers</div>
                  </div>
                </div>

                <button className="row tiny accent" style={{ marginTop: 14, background: "none", border: "none", padding: 0 }} onClick={() => setShowGround((s) => !s)}>
                  <Info size={13} /> How the AI chose these rules
                </button>
                {showGround && (
                  <div className="demo-hint" style={{ marginTop: 8 }}>
                    The goal is converted to <b>structured filters over a safe whitelist</b> (never raw SQL),
                    with thresholds <b>grounded on your live data</b> (real spend percentiles & lifecycle mix).
                    Invalid filters are <b>auto-corrected</b> before they run.
                  </div>
                )}

                {sample.length > 0 && (
                  <>
                    <div className="divider" />
                    <div className="tiny muted" style={{ marginBottom: 8 }}>A few who match:</div>
                    <div className="row wrap" style={{ gap: 8 }}>
                      {sample.slice(0, 5).map((s) => (
                        <span className="chip" key={s.id}>
                          {s.name} · <b>₹{Math.round(s.total_spent).toLocaleString("en-IN")}</b>
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Card>

            {/* message */}
            <Card>
              <div className="card-head between">
                <div className="row" style={{ gap: 9 }}>
                  <Send size={17} style={{ color: "#a9683b" }} />
                  <h3>AI drafted your message</h3>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={regenerate} disabled={regenerating}>
                  {regenerating ? <Spinner /> : <><RefreshCw size={14} /> Regenerate</>}
                </button>
              </div>
              <div className="card-pad grid cols-2" style={{ gap: 18 }}>
                <div>
                  <label className="field-label">Channel</label>
                  <div className="row wrap" style={{ gap: 7, marginBottom: 14 }}>
                    {Object.keys(CHANNEL_META).map((c) => (
                      <button
                        key={c}
                        className={`chip ${channel === c ? "" : ""}`}
                        style={channel === c ? { borderColor: "#be7e50", background: "rgba(190,126,80,0.1)", color: "#a9683b", fontWeight: 600 } : {}}
                        onClick={() => setChannel(c)}
                      >
                        {CHANNEL_META[c].label}
                      </button>
                    ))}
                  </div>
                  <label className="field-label">Message (editable)</label>
                  <textarea className="textarea" rows={6} value={message} onChange={(e) => setMessage(e.target.value)} />
                  <div className="tiny muted" style={{ marginTop: 6 }}>
                    <span className="token">{"{first_name}"}</span> is personalised per shopper at send time.
                  </div>
                </div>
                <div>
                  <label className="field-label">Live preview</label>
                  <MessagePreview channel={channel} text={message} />
                </div>
              </div>
            </Card>

            {/* launch */}
            <Card pad className="between" style={{ background: "linear-gradient(135deg,#fbf7f2,#f3ece1)" }}>
              <div className="small soft">
                Ready to send to <b>{proposal.estimated_count}</b> shoppers via{" "}
                <b>{CHANNEL_META[channel].label}</b>.
              </div>
              <button className="btn btn-primary" onClick={launch} disabled={empty || launching}>
                {launching ? <Spinner /> : <><Rocket size={16} /> Launch campaign</>}
              </button>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
