import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Grid3x3, Sparkles } from "lucide-react";

// Compact INR (Indian lakh/crore) for segment revenue.
function inrCompact(n) {
  if (n == null) return "—";
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

const SEGMENT_COLORS = {
  Champions: "#6FA471",
  Loyal: "#8FA587",
  "Potential Loyalist": "#B6C0A0",
  New: "#D6B884",
  Promising: "#C5A574",
  "Needs Attention": "#D69A52",
  "At Risk": "#CE8A5C",
  "Can't Lose Them": "#C9695E",
  Hibernating: "#B79B86",
  Lost: "#9A8576",
};

export default function RfmBoard() {
  const [data, setData] = useState(null);

  useEffect(() => {
    api_rfm();
    async function api_rfm() {
      try {
        const { api } = await import("../api");
        setData(await api.rfmSummary());
      } catch {
        setData({ order: [], segments: {}, grid: [], total: 0 });
      }
    }
  }, []);

  if (!data) return <div className="card h-72 shimmer-bg" />;

  const cell = (r, f) => data.grid.find((g) => g.r === r && g.f === f) || { count: 0, monetary: 0 };
  const maxCount = Math.max(1, ...data.grid.map((g) => g.count));
  const segments = (data.order || []).filter((name) => data.segments[name]?.count > 0);

  return (
    <div className="bg-surface-white p-6 rounded-2xl border border-[#bcc9cc] overflow-hidden">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h2 className="font-headline-md text-2xl font-bold text-on-surface flex items-center gap-2">
            <Grid3x3 className="w-6 h-6 text-[#006875]" /> RFM segmentation
          </h2>
          <p className="text-base font-label-md text-on-surface font-bold mt-1">
            Recency × Frequency × Monetary — the marketer's map of your base.
          </p>
        </div>
        <Link to="/crema" className="text-sm bg-[#12b1c5] text-[#001f24] px-5 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:brightness-110 transition-all whitespace-nowrap shadow-sm">
          <Sparkles className="w-4 h-4" /> Goal with crema
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
        {/* Heatmap */}
        <div>
          <div className="flex">
            <div className="flex flex-col justify-center pr-2">
              <span className="text-[10px] uppercase tracking-wider text-on-surface font-bold -rotate-90 origin-center whitespace-nowrap">
                Recency →
              </span>
            </div>
            <div className="flex-1">
              {[5, 4, 3, 2, 1].map((r) => (
                <div key={r} className="flex gap-1.5 mb-1.5">
                  <span className="w-4 text-[10px] text-gray-400 self-center text-right">{r}</span>
                  {[1, 2, 3, 4, 5].map((f) => {
                    const c = cell(r, f);
                    const intensity = c.count / maxCount;
                    const alpha = c.count === 0 ? 0.05 : 0.18 + intensity * 0.8;
                    return (
                      <div
                        key={f}
                        title={`R${r} · F${f} — ${c.count} shoppers · ${inrCompact(c.monetary)}`}
                        className="flex-1 aspect-square rounded-md flex items-center justify-center text-xs font-semibold transition-transform hover:scale-105 cursor-default"
                        style={{
                          backgroundColor: `rgba(0,104,117,${alpha})`,
                          color: intensity > 0.5 ? "#fff" : "#1d1c15",
                        }}
                      >
                        {c.count || ""}
                      </div>
                    );
                  })}
                </div>
              ))}
              <div className="flex gap-1.5 mt-1 pl-5">
                {[1, 2, 3, 4, 5].map((f) => (
                  <span key={f} className="flex-1 text-center text-[10px] text-gray-600 font-bold">{f}</span>
                ))}
              </div>
              <p className="text-[10px] uppercase tracking-wider text-on-surface font-bold text-center mt-2">
                Frequency →
              </p>
            </div>
          </div>
        </div>

        {/* Segment cards */}
        <div className="bg-[#ece8dd] border border-[#bcc9cc] rounded-2xl p-6 overflow-y-auto max-h-[420px] custom-scrollbar">
          <h3 className="font-headline-md text-xl font-bold text-on-surface mb-8">Segment Summary</h3>
          <div className="space-y-8">
            {segments.map((name) => {
              const s = data.segments[name];
              const color = SEGMENT_COLORS[name] || "#999";
              const totalCount = segments.reduce((acc, curr) => acc + data.segments[curr].count, 0);
              const percentage = totalCount > 0 ? ((s.count / totalCount) * 100).toFixed(1) : 0;
              return (
                <div key={name} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-headline-md text-lg font-bold" style={{ color: color }}>{name}</span>
                    <span className="font-headline-md text-lg text-on-surface-variant">{percentage}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-surface-white rounded-full overflow-hidden border border-[#bcc9cc]">
                    <div className="h-full rounded-full" style={{ width: `${percentage}%`, backgroundColor: color }}></div>
                  </div>
                  <p className="text-sm font-label-md text-on-surface-variant font-medium leading-relaxed">{s.action}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
