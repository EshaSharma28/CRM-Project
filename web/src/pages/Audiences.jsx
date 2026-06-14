import { useState, useEffect } from "react";
import { api } from "../api";

const FIELDS = [
  "total_spent", "order_count", "avg_days_between_orders",
  "lifecycle_stage", "city", "channel_pref", "days_since_last_order"
];

const OPS = ["eq", "gt", "lt", "gte", "lte"];
const OP_MAP = { eq: "=", gt: ">", lt: "<", gte: "≥", lte: "≤" };

const LIFECYCLE_STAGES = ["new", "active", "at_risk", "lapsed", "churned"];
const CHANNELS = ["email", "sms", "whatsapp"];

export default function Audiences() {
  const [segments, setSegments] = useState([]);
  const [rules, setRules] = useState([{ field: "total_spent", op: "gt", value: "100" }]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState({ estimated_count: 0, sample: [] });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSegments();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      loadPreview();
    }, 500);
    return () => clearTimeout(timeout);
  }, [rules]);

  const loadSegments = async () => {
    try {
      setSegments(await api.segments());
    } catch (e) {
      console.error(e);
    }
  };

  const loadPreview = async () => {
    if (rules.some(r => !r.value)) return;
    
    setLoading(true);
    try {
      const res = await api.segmentsPreview(rules);
      setPreview(res);
    } catch (e) {
      console.error(e);
      setPreview({ estimated_count: 0, sample: [] });
    } finally {
      setLoading(false);
    }
  };

  const addRule = () => {
    setRules([...rules, { field: "order_count", op: "gt", value: "1" }]);
  };

  const removeRule = (index) => {
    if (rules.length > 1) {
      const newRules = [...rules];
      newRules.splice(index, 1);
      setRules(newRules);
    }
  };

  const updateRule = (index, field, val) => {
    const newRules = [...rules];
    newRules[index][field] = val;
    setRules(newRules);
  };

  const handleSave = async () => {
    if (!name.trim()) return alert("Please enter a segment name");
    setSaving(true);
    try {
      await api.createSegment({ name, description, rules });
      await loadSegments();
      setName("");
      setDescription("");
      alert("Segment saved successfully!");
    } catch (e) {
      console.error(e);
      alert("Failed to save segment");
    } finally {
      setSaving(false);
    }
  };

  const renderValueInput = (rule, index) => {
    const baseClasses = "w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary transition-colors";
    
    if (rule.field === "lifecycle_stage") {
      return (
        <select value={rule.value} onChange={(e) => updateRule(index, "value", e.target.value)} className={baseClasses}>
          {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    }
    if (rule.field === "channel_pref") {
      return (
        <select value={rule.value} onChange={(e) => updateRule(index, "value", e.target.value)} className={baseClasses}>
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      );
    }
    return (
      <input 
        type="text" 
        value={rule.value} 
        onChange={(e) => updateRule(index, "value", e.target.value)}
        className={baseClasses}
        placeholder="Value"
      />
    );
  };

  return (
    <div className="relative min-h-full">
      {/* Faded Background Cliparts */}
      <div className="fixed bottom-[2%] right-[5%] w-full max-w-[350px] opacity-[0.06] pointer-events-none z-0">
        <img src="/audience-bg-bottom.png" alt="" className="w-full h-auto object-contain" />
      </div>

      <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
        {/* Header Section */}
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Audiences</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Build and manage your customer segments for personalized targeting.
            </p>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Col: Builder & Smart Cohorts */}
          <div className="lg:col-span-2 space-y-8">
            
            {/* Smart Cohorts */}
            <div className="bg-[#f8f3e8] border border-[#bcc9cc] p-6 rounded-xl shadow-sm">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
                <span className="material-symbols-outlined text-[#12b1c5]">auto_awesome</span>
                Smart Cohorts
              </h2>
              <p className="text-sm text-on-surface-variant mb-4">Click any pre-generated AI cohort to load it into the builder.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button 
                  onClick={() => {
                    setName("High-Value Churn Risk");
                    setDescription("Top spenders who are showing signs of churning.");
                    setRules([{ field: "total_spent", op: "gt", value: "5000" }, { field: "lifecycle_stage", op: "eq", value: "at_risk" }]);
                  }}
                  className="bg-white border border-[#bcc9cc] hover:border-[#12b1c5] hover:shadow-sm text-left p-4 rounded-xl transition-all group"
                >
                  <h3 className="font-bold text-on-surface group-hover:text-[#006875] text-sm mb-1">High-Value Churn Risk</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2">Spenders &gt; ₹5k currently at risk.</p>
                </button>
                <button 
                  onClick={() => {
                    setName("Recent VIPs");
                    setDescription("Loyal shoppers who bought recently.");
                    setRules([{ field: "order_count", op: "gt", value: "5" }, { field: "days_since_last_order", op: "lt", value: "30" }]);
                  }}
                  className="bg-white border border-[#bcc9cc] hover:border-[#12b1c5] hover:shadow-sm text-left p-4 rounded-xl transition-all group"
                >
                  <h3 className="font-bold text-on-surface group-hover:text-[#006875] text-sm mb-1">Recent VIPs</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2">&gt; 5 orders and bought in last 30 days.</p>
                </button>
                <button 
                  onClick={() => {
                    setName("One-Timers to Nudge");
                    setDescription("Bought once a long time ago.");
                    setRules([{ field: "order_count", op: "eq", value: "1" }, { field: "days_since_last_order", op: "gt", value: "60" }]);
                  }}
                  className="bg-white border border-[#bcc9cc] hover:border-[#12b1c5] hover:shadow-sm text-left p-4 rounded-xl transition-all group"
                >
                  <h3 className="font-bold text-on-surface group-hover:text-[#006875] text-sm mb-1">One-Timers to Nudge</h3>
                  <p className="text-xs text-on-surface-variant line-clamp-2">Only 1 order, &gt; 60 days ago.</p>
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-xl shadow-sm glass-effect">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">filter_alt</span>
                Segment Builder
              </h2>
              
              <div className="space-y-4 mb-8">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Segment Name</label>
                    <input 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                      placeholder="e.g. VIP Shoppers" 
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Description (Optional)</label>
                    <input 
                      value={description} 
                      onChange={e => setDescription(e.target.value)} 
                      className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary transition-colors" 
                      placeholder="e.g. Spent over ₹100" 
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Rules</label>
                {rules.map((rule, i) => (
                  <div key={i} className="flex gap-3 items-center bg-surface-container-low p-3 rounded-lg border border-outline-variant/20">
                    <select 
                      value={rule.field} 
                      onChange={(e) => updateRule(i, "field", e.target.value)}
                      className="w-1/3 bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    >
                      {FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                    </select>
                    <select 
                      value={rule.op} 
                      onChange={(e) => updateRule(i, "op", e.target.value)}
                      className="w-24 bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 text-sm focus:outline-none focus:border-primary transition-colors"
                    >
                      {OPS.map(op => <option key={op} value={op}>{OP_MAP[op] || op}</option>)}
                    </select>
                    <div className="flex-1">
                      {renderValueInput(rule, i)}
                    </div>
                    <button 
                      onClick={() => removeRule(i)} 
                      disabled={rules.length === 1} 
                      className="p-2 text-outline hover:text-error transition-colors disabled:opacity-50 flex items-center justify-center"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="mt-8 flex justify-between items-center pt-6 border-t border-outline-variant/20">
                <button onClick={addRule} className="font-label-md text-primary flex items-center gap-1 hover:underline">
                  <span className="material-symbols-outlined text-[18px]">add</span> Add Rule
                </button>
                <button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all">
                  <span className="material-symbols-outlined text-[20px]">save</span> 
                  {saving ? "Saving..." : "Save Segment"}
                </button>
              </div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 overflow-hidden flex flex-col">
              <div className="p-6 border-b border-outline-variant/10 flex justify-between items-center">
                <h2 className="font-headline-md text-headline-md text-on-surface">Sample Data</h2>
                <div className="text-xs text-green-600 font-bold uppercase tracking-widest mt-1 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                  Live from DB
                </div>
              </div>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left">
                  <thead className="bg-surface-container-low text-on-surface-variant font-label-sm border-b border-outline-variant/20">
                    <tr>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider">Stage</th>
                      <th className="px-6 py-3 font-medium uppercase tracking-wider text-right">Spent</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/5">
                    {preview.sample.length > 0 ? preview.sample.map(s => (
                      <tr key={s.id} className="group hover:bg-surface-container-low transition-colors">
                        <td className="py-4 px-6 font-medium text-on-surface text-sm">{s.name}</td>
                        <td className="py-4 px-6 text-on-surface-variant text-sm">{s.email}</td>
                        <td className="py-4 px-6">
                          <span className="px-2.5 py-1 rounded-md bg-surface-container-highest text-on-surface-variant text-[10px] font-bold uppercase">
                            {s.lifecycle_stage}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right text-sm font-medium text-on-surface">
                          ₹{s.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="4" className="py-12 px-6 text-center text-on-surface-variant text-sm">
                          {loading ? "Calculating sample..." : "No sample data available."}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Right Col: Preview & List */}
          <div className="space-y-8">
            <div className="bg-primary text-on-primary rounded-xl p-8 border border-primary-fixed/20 shadow-md">
              <h2 className="font-label-md text-primary-fixed mb-4 uppercase tracking-wider font-bold">Live Preview Estimate</h2>
              <div className="flex items-end gap-3">
                <div className="text-6xl font-headline-xl font-bold">
                  {loading ? <span className="animate-pulse">...</span> : preview.estimated_count.toLocaleString()}
                </div>
              </div>
              <div className="mt-2 font-label-md text-primary-fixed-dim">shoppers matched</div>
            </div>

            <div className="bg-surface-container-lowest rounded-xl border border-outline-variant/20 p-6">
              <h2 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center gap-2">
                <span className="material-symbols-outlined text-tertiary">groups</span> 
                Saved Segments
              </h2>
              <div className="space-y-4">
                {segments.length > 0 ? segments.map(s => (
                  <div key={s.id} className="p-4 bg-surface-container-low rounded-xl border border-outline-variant/10 hover:border-primary/30 transition-colors">
                    <h3 className="font-label-md text-on-surface font-bold mb-1">{s.name}</h3>
                    {s.description && <p className="font-label-sm text-on-surface-variant mb-3">{s.description}</p>}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {s.rules?.map((r, i) => (
                        <span key={i} className="text-[10px] bg-white border border-outline-variant/30 px-2 py-0.5 rounded text-on-surface-variant uppercase font-medium">
                          {r.field.replace(/_/g, ' ')} {OP_MAP[r.op] || r.op} {r.value}
                        </span>
                      ))}
                    </div>
                  </div>
                )) : (
                  <div className="text-sm text-on-surface-variant text-center py-6 border border-dashed border-outline-variant/30 rounded-xl">
                    No saved segments.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
