import { useState } from "react";
import { api } from "../api";
import ProposalCard from "./ProposalCard";

const EXAMPLES = [
  "Win back high-value regulars who went quiet in the last couple of months",
  "Reach loyal subscribers with a thank-you perk",
  "Re-engage one-time buyers who never came back",
  "Nudge new shoppers who just placed their first order",
];

// The chat-first surface: marketer states a goal, AI returns a full proposal.
export default function CopilotChat({ onLaunched }) {
  const [goal, setGoal] = useState("");
  const [proposal, setProposal] = useState(null);
  const [thinking, setThinking] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");

  async function propose(g) {
    const text = (g ?? goal).trim();
    if (!text) return;
    setGoal(text);
    setError("");
    setProposal(null);
    setThinking(true);
    try {
      setProposal(await api.propose(text));
    } catch (e) {
      setError(e.message);
    } finally {
      setThinking(false);
    }
  }

  async function launch(payload) {
    setLaunching(true);
    setError("");
    try {
      const res = await api.launch(payload);
      onLaunched(res.campaign_id);
      setProposal(null);
      setGoal("");
    } catch (e) {
      setError(e.message);
    } finally {
      setLaunching(false);
    }
  }

  return (
    <section className="copilot">
      <div className="copilot-intro">
        <h2>Campaign co-pilot</h2>
        <p className="muted">
          Describe who you want to reach, in plain English. The co-pilot finds the
          audience, drafts the message, and launches it.
        </p>
      </div>

      <div className="composer">
        <textarea
          value={goal}
          placeholder="e.g. Win back high-value regulars who haven't ordered in a while…"
          onChange={(e) => setGoal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) propose();
          }}
          rows={3}
        />
        <button className="ask-btn" onClick={() => propose()} disabled={thinking}>
          {thinking ? "Thinking…" : "Ask the co-pilot"}
        </button>
      </div>

      {!proposal && !thinking && (
        <div className="examples">
          <span className="muted small">Try:</span>
          {EXAMPLES.map((ex) => (
            <button key={ex} className="example" onClick={() => propose(ex)}>
              {ex}
            </button>
          ))}
        </div>
      )}

      {error && <div className="error">⚠ {error}</div>}

      {thinking && (
        <div className="thinking">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
          <span className="muted">drafting your audience & message…</span>
        </div>
      )}

      {proposal && (
        <ProposalCard proposal={proposal} onLaunch={launch} launching={launching} />
      )}
    </section>
  );
}
