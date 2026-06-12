import { useState } from "react";

const CHANNELS = ["whatsapp", "email", "sms"];

// Renders the AI's proposal: editable so the human stays in control before launch.
export default function ProposalCard({ proposal, onLaunch, launching }) {
  const [channel, setChannel] = useState(proposal.suggested_channel);
  const [message, setMessage] = useState(proposal.message_draft);

  const empty = proposal.estimated_count === 0;

  return (
    <div className="proposal">
      <div className="proposal-head">
        <div>
          <div className="eyebrow">AI proposed audience</div>
          <h3>{proposal.segment_name}</h3>
        </div>
        <div className={`count ${empty ? "count-empty" : ""}`}>
          <span className="count-num">{proposal.estimated_count}</span>
          <span className="count-label">shoppers</span>
        </div>
      </div>

      <p className="muted">{proposal.segment_description}</p>

      <div className="chips">
        {proposal.rules.map((r, i) => (
          <span className="chip" key={i}>
            <b>{r.field}</b> {opLabel(r.op)} {formatValue(r.value)}
          </span>
        ))}
      </div>

      <label className="field-label">Channel</label>
      <div className="seg-toggle">
        {CHANNELS.map((c) => (
          <button
            key={c}
            className={channel === c ? "active" : ""}
            onClick={() => setChannel(c)}
          >
            {c}
          </button>
        ))}
      </div>

      <label className="field-label">Message (editable)</label>
      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={4}
      />

      <button
        className="launch-btn"
        disabled={empty || launching}
        onClick={() =>
          onLaunch({
            name: proposal.segment_name,
            description: proposal.segment_description,
            rules: proposal.rules,
            channel,
            message_template: message,
          })
        }
      >
        {launching
          ? "Launching…"
          : empty
          ? "No shoppers match — adjust the goal"
          : `Launch to ${proposal.estimated_count} shoppers →`}
      </button>
    </div>
  );
}

function opLabel(op) {
  return { gt: ">", lt: "<", gte: "≥", lte: "≤", eq: "=", in: "is any of" }[op] || op;
}

function formatValue(value) {
  return Array.isArray(value) ? value.join(", ") : String(value);
}
