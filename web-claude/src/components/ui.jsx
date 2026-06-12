import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

export function Card({ children, className = "", pad = false }) {
  return <div className={`card ${pad ? "card-pad" : ""} ${className}`}>{children}</div>;
}

export function Stat({ icon, value, label }) {
  return (
    <div className="stat">
      {icon && <div className="ico">{icon}</div>}
      <div className="stat-num count-up">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

export function Badge({ children, color, bg }) {
  return (
    <span className="badge" style={bg ? { background: bg, color } : undefined}>
      {color && <span className="dot" style={{ background: color }} />}
      {children}
    </span>
  );
}

export function AiPill({ children = "AI" }) {
  return <span className="ai-pill">✦ {children}</span>;
}

export function Spinner({ size = 16 }) {
  return <Loader2 size={size} className="spin" />;
}

export function Thinking({ label }) {
  return (
    <span className="row" style={{ gap: 9 }}>
      <span className="thinking">
        <span />
        <span />
        <span />
      </span>
      {label && <span className="muted small">{label}</span>}
    </span>
  );
}

export function Skeleton({ h = 16, w = "100%", style }) {
  return <div className="skeleton" style={{ height: h, width: w, ...style }} />;
}

export function Empty({ children }) {
  return <div className="empty">{children}</div>;
}

// Smoothly animate a number from 0 -> value on mount/change.
export function CountUp({ value, duration = 700 }) {
  const [n, setN] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const start = performance.now();
    const a = from.current;
    const b = value || 0;
    let raf;
    const tick = (t) => {
      const p = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - p, 3);
      setN(Math.round(a + (b - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = b;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <span className="count-up">{n.toLocaleString("en-IN")}</span>;
}
