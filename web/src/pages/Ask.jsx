import { useState } from "react";
import { api } from "../api";
import { Sparkles, Search, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

const EXAMPLES = [
  "Which city has the most at-risk shoppers?",
  "Revenue by product",
  "How many orders in the last 30 days?",
  "Total revenue over time by month",
  "Average order value by lifecycle stage",
  "How many Champions do we have?",
];

const METRIC_LABEL = {
  count: "shoppers",
  sum_spend: "total spend (₹)",
  avg_spend: "avg spend (₹)",
  order_count: "orders",
  revenue: "revenue (₹)",
  avg_order_value: "avg order value (₹)",
};
const CURRENCY_METRICS = new Set(["sum_spend", "avg_spend", "revenue", "avg_order_value"]);
const fmt = (metric, v) =>
  (CURRENCY_METRICS.has(metric) ? "₹" : "") + Math.round(v).toLocaleString("en-IN");

export default function Ask() {
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  async function run(question) {
    const text = (question ?? q).trim();
    if (!text) return;
    setQ(text);
    setBusy(true);
    setError("");
    setResult(null);
    try {
      setResult(await api.ask(text));
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-6 space-y-6">
      <div className="text-center mb-2">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-tr from-sage to-success text-white mb-4 shadow-md">
          <Sparkles className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-serif font-bold text-mocha-dark">Ask your data</h1>
        <p className="text-text/60 mt-1">Ask a question in plain English. The AI queries your shoppers and answers.</p>
      </div>

      <div className="card">
        <div className="flex gap-2">
          <div className="flex items-center gap-2 flex-1 bg-surface border border-border rounded-xl px-3">
            <Search className="w-4 h-4 text-text/40" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && run()}
              placeholder="e.g. Which city has the most Champions?"
              className="flex-1 bg-transparent py-3 outline-none text-sm"
            />
          </div>
          <button onClick={() => run()} disabled={busy} className="btn-primary px-6 flex items-center gap-2">
            <Sparkles className="w-4 h-4" /> {busy ? "Thinking…" : "Ask"}
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {EXAMPLES.map((ex) => (
            <button key={ex} onClick={() => run(ex)} className="text-xs bg-surface hover:bg-sage/10 border border-border hover:border-sage/40 px-3 py-1.5 rounded-full transition-colors">
              {ex}
            </button>
          ))}
        </div>
      </div>

      {error && <div className="card border-error/30 bg-error/5 text-error text-sm">⚠ {error}</div>}

      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card">
          <div className="flex items-center gap-2 text-xs text-sage font-medium mb-3">
            <Sparkles className="w-3.5 h-3.5" /> {result.interpretation}
          </div>

          {result.group_by ? (
            <>
              <div className="h-72 mt-2">
                <ResponsiveContainer>
                  <BarChart data={result.rows.slice(0, 10)} margin={{ top: 5, right: 16, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EADFD2" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#978573" }} interval={0} angle={-15} textAnchor="end" height={50} />
                    <YAxis tick={{ fontSize: 11, fill: "#978573" }} />
                    <Tooltip cursor={{ fill: "rgba(143,165,135,0.08)" }} formatter={(v) => fmt(result.metric, v)} />
                    <Bar dataKey="value" fill="#8FA587" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <p className="text-sm text-text/60 mt-3">
                Top: <b className="text-mocha-dark">{result.rows[0]?.label}</b> with{" "}
                <b className="text-mocha-dark">{fmt(result.metric, result.rows[0]?.value || 0)}</b>{" "}
                {METRIC_LABEL[result.metric]}, across {result.rows.length} {result.group_by.replace("_", " ")}s.
              </p>
            </>
          ) : (
            <div className="flex items-center gap-4 py-6">
              <div className="bg-sage/10 text-sage p-3 rounded-2xl"><TrendingUp className="w-8 h-8" /></div>
              <div>
                <div className="text-5xl font-serif font-bold text-mocha-dark">{fmt(result.metric, result.value)}</div>
                <div className="text-sm text-text/50 mt-1">{METRIC_LABEL[result.metric]}</div>
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
