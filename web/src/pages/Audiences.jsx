import { useState, useEffect } from "react";
import { api } from "../api";
import { Plus, Trash2, Users, Save, Database } from "lucide-react";

const FIELDS = [
  "total_spent", "order_count", "avg_days_between_orders",
  "lifecycle_stage", "city", "channel_pref", "days_since_last_order"
];

const OPS = ["eq", "gt", "lt", "gte", "lte"];

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
    // Debounce preview
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
    // Basic validation to avoid 500s on incomplete rules
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
    if (rule.field === "lifecycle_stage") {
      return (
        <select value={rule.value} onChange={(e) => updateRule(index, "value", e.target.value)} className="input-field py-2">
          {LIFECYCLE_STAGES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      );
    }
    if (rule.field === "channel_pref") {
      return (
        <select value={rule.value} onChange={(e) => updateRule(index, "value", e.target.value)} className="input-field py-2">
          {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      );
    }
    return (
      <input 
        type="text" 
        value={rule.value} 
        onChange={(e) => updateRule(index, "value", e.target.value)}
        className="input-field py-2"
        placeholder="Value"
      />
    );
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-mocha-dark">Audiences</h1>
          <p className="text-text/60 mt-1">Build and manage your customer segments.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Col: Builder */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-serif font-bold mb-4">Segment Builder</h2>
            
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-mocha mb-1.5">Segment Name</label>
                  <input value={name} onChange={e => setName(e.target.value)} className="input-field py-2" placeholder="e.g. VIP Shoppers" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-mocha mb-1.5">Description (Optional)</label>
                  <input value={description} onChange={e => setDescription(e.target.value)} className="input-field py-2" placeholder="..." />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-mocha mb-1.5">Rules</label>
              {rules.map((rule, i) => (
                <div key={i} className="flex gap-2 items-center bg-surface p-2 rounded-xl border border-border">
                  <select 
                    value={rule.field} 
                    onChange={(e) => updateRule(i, "field", e.target.value)}
                    className="input-field py-2 flex-1"
                  >
                    {FIELDS.map(f => <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>)}
                  </select>
                  <select 
                    value={rule.op} 
                    onChange={(e) => updateRule(i, "op", e.target.value)}
                    className="input-field py-2 w-24"
                  >
                    {OPS.map(op => <option key={op} value={op}>{op}</option>)}
                  </select>
                  <div className="flex-1">
                    {renderValueInput(rule, i)}
                  </div>
                  <button onClick={() => removeRule(i)} disabled={rules.length === 1} className="p-2 text-text/40 hover:text-error disabled:opacity-50">
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
            
            <div className="mt-4 flex justify-between items-center pt-4 border-t border-border">
              <button onClick={addRule} className="text-sm font-medium text-caramel flex items-center gap-1 hover:underline">
                <Plus className="w-4 h-4" /> Add Rule
              </button>
              <button onClick={handleSave} disabled={saving} className="btn-primary flex items-center gap-2">
                <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Segment"}
              </button>
            </div>
          </div>

          <div className="card">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-serif font-bold">Sample Data</h2>
              <div className="text-sm text-text/50 flex items-center gap-1">
                <Database className="w-4 h-4" /> Live from DB
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-surface text-text/60">
                  <tr>
                    <th className="px-4 py-2 rounded-l-lg">Name</th>
                    <th className="px-4 py-2">Email</th>
                    <th className="px-4 py-2">Stage</th>
                    <th className="px-4 py-2 rounded-r-lg">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.sample.length > 0 ? preview.sample.map(s => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 font-medium">{s.name}</td>
                      <td className="px-4 py-3 text-text/60">{s.email}</td>
                      <td className="px-4 py-3 capitalize">
                        <span className="bg-surface px-2 py-1 rounded-md text-xs border border-border">{s.lifecycle_stage}</span>
                      </td>
                      <td className="px-4 py-3">₹{s.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-text/50">
                        {loading ? "Loading..." : "No sample data available."}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Col: Preview & List */}
        <div className="space-y-6">
          <div className="card bg-mocha-dark text-white border-0">
            <h2 className="text-sm font-medium text-surface-white/70 mb-2">Live Preview Estimate</h2>
            <div className="flex items-end gap-3">
              <div className="text-5xl font-serif font-bold text-caramel">
                {loading ? <span className="animate-pulse">...</span> : preview.estimated_count.toLocaleString()}
              </div>
              <div className="pb-1 text-surface-white/60">shoppers matched</div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-lg font-serif font-bold mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-caramel" /> Saved Segments
            </h2>
            <div className="space-y-3">
              {segments.length > 0 ? segments.map(s => (
                <div key={s.id} className="p-3 bg-surface rounded-xl border border-border">
                  <h3 className="font-medium text-mocha-dark mb-1">{s.name}</h3>
                  {s.description && <p className="text-xs text-text/60 mb-2">{s.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {s.rules?.map((r, i) => (
                      <span key={i} className="text-[10px] bg-white border border-border px-1.5 py-0.5 rounded text-text/70 uppercase">
                        {r.field} {r.op} {r.value}
                      </span>
                    ))}
                  </div>
                </div>
              )) : (
                <div className="text-sm text-text/50 text-center py-4">No saved segments.</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
