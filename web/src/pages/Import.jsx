import { useState } from "react";
import { api } from "../api";
import { Upload, Download, CheckCircle2, AlertCircle, Users, ShoppingBag, FileText } from "lucide-react";

export default function Import() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-mocha-dark">Import data</h1>
        <p className="text-text/60 mt-1">
          Bring in your own shoppers and orders by CSV. We recompute lifecycle stages
          and RFM segments automatically, so imported data behaves like the rest.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Dropzone
          title="Customers"
          icon={Users}
          sample="customers"
          columns="name, email, phone, city, channel_pref, signup_date"
          onUpload={api.ingestCustomers}
          renderResult={(r) => `${r.created} created, ${r.updated} updated`}
        />
        <Dropzone
          title="Orders"
          icon={ShoppingBag}
          sample="orders"
          columns="email, product, amount, ordered_at, is_subscription, used_discount"
          onUpload={api.ingestOrders}
          renderResult={(r) => `${r.created} orders added across ${r.customers_updated} customers`}
        />
      </div>

      <div className="card bg-surface/40 border-dashed">
        <p className="text-sm text-text/60">
          <b className="text-mocha-dark">Tip:</b> import customers first, then orders
          (orders link to customers by email). New emails create new customers;
          existing ones are updated. After any import, segments and RFM refresh instantly.
        </p>
      </div>
    </div>
  );
}

function Dropzone({ title, icon: Icon, sample, columns, onUpload, renderResult }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [dragOver, setDragOver] = useState(false);

  async function handleFile(file) {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    try {
      const r = await onUpload(file);
      setResult(r);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="bg-caramel/10 text-caramel p-2 rounded-lg"><Icon className="w-5 h-5" /></div>
          <h2 className="text-lg font-serif font-bold">{title}</h2>
        </div>
        <a
          href={api.sampleUrl(sample)}
          download={`brewhaus-${sample}-sample.csv`}
          className="text-xs text-caramel font-medium flex items-center gap-1 hover:underline"
        >
          <Download className="w-3.5 h-3.5" /> Sample CSV
        </a>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed rounded-xl py-8 cursor-pointer transition-colors ${
          dragOver ? "border-caramel bg-caramel/5" : "border-border hover:border-caramel/50"
        }`}
      >
        <Upload className="w-6 h-6 text-text/40" />
        <span className="text-sm text-text/60">
          {busy ? "Uploading…" : "Drop CSV here or click to browse"}
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>

      <p className="text-[11px] text-text/40 mt-2 flex items-start gap-1.5">
        <FileText className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
        <span className="font-mono">{columns}</span>
      </p>

      {result && (
        <div className="mt-3 flex items-start gap-2 text-sm text-success bg-success/5 border border-success/20 rounded-lg p-3">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">{renderResult(result)}</p>
            {result.errors?.length > 0 && (
              <p className="text-xs text-warning mt-1">{result.errors.length} row(s) skipped: {result.errors[0]}</p>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="mt-3 flex items-center gap-2 text-sm text-error bg-error/5 border border-error/20 rounded-lg p-3">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}
    </div>
  );
}
