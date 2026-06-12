import { CHANNEL_META } from "../lib/format";

// Renders a message in a channel-styled preview, highlighting {tokens}.
export default function MessagePreview({ channel, text }) {
  const parts = String(text || "").split(/(\{[a-z_]+\})/gi);
  const body = parts.map((p, i) =>
    /^\{[a-z_]+\}$/i.test(p) ? (
      <span className="token" key={i}>{p}</span>
    ) : (
      <span key={i}>{p}</span>
    )
  );

  if (channel === "email") {
    return (
      <div className="email-preview">
        <div className="email-bar">
          From: Brewhaus &lt;hello@brewhaus.coffee&gt; · To: you
        </div>
        <div className="email-body">{body}</div>
      </div>
    );
  }

  // whatsapp / sms / rcs -> bubble
  const meta = CHANNEL_META[channel] || CHANNEL_META.whatsapp;
  return (
    <div className="phone-preview">
      <div className="row small" style={{ marginBottom: 10, color: "#5a4a3c", gap: 7 }}>
        <span className="dot" style={{ background: meta.color }} /> {meta.label}
      </div>
      <div className={`bubble ${channel === "whatsapp" ? "wa" : ""}`}>{body}</div>
    </div>
  );
}
