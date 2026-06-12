// Sidebar list of campaigns; selecting one drives the live stats panel.
export default function CampaignList({ campaigns, selected, onSelect }) {
  if (!campaigns.length) {
    return <p className="muted small">No campaigns yet.</p>;
  }
  return (
    <div className="campaign-list">
      {campaigns.map((c) => (
        <button
          key={c.id}
          className={`campaign-item ${selected === c.id ? "active" : ""}`}
          onClick={() => onSelect(c.id)}
        >
          <div className="campaign-name">{c.name}</div>
          <div className="campaign-meta">
            <span className={`status status-${c.status}`}>{c.status}</span>
            <span className="muted small">{c.channel}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
