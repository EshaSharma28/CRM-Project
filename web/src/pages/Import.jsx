import { useState } from "react";
import { api } from "../api";

export default function Import() {
  return (
    <div className="relative min-h-full">
      <div className="p-8 max-w-4xl mx-auto space-y-8 relative z-10">
        <section className="border-b border-outline-variant/30 pb-6">
          <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Smart Data Import</h1>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
            Bring in your shoppers and orders in a single CSV file. Our AI will automatically figure out your column names and map them to the correct fields.
          </p>
        </section>

        <div className="max-w-2xl mx-auto space-y-6">
          <Dropzone
            title="Smart Unified Import"
            icon="auto_awesome"
            sample="customers"
            columns="Any CSV with emails, names, order amounts, products, etc."
            onUpload={api.ingestSmart}
            renderResult={(r) => `${r.created_customers} customers created, ${r.updated_customers} updated, ${r.created_orders} orders added.`}
          />

          <div className="bg-surface-container-low/50 border border-outline-variant/20 p-6 rounded-xl shadow-sm">
            <p className="font-body-md text-on-surface-variant">
              <b className="text-on-surface font-bold">How it works:</b> Upload a spreadsheet combining your users and their order history. The AI reads the headers and maps them directly to the CRM's internal models. We recompute lifecycle stages and RFM segments instantly!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function Dropzone({ title, icon, sample, columns, onUpload, renderResult }) {
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
    <div className="bg-surface-container-lowest border border-outline-variant/30 p-8 rounded-xl shadow-sm glass-effect">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 text-primary p-2 rounded-xl"><span className="material-symbols-outlined text-[20px]">{icon}</span></div>
          <h2 className="font-headline-md text-headline-md text-on-surface">{title}</h2>
        </div>
        <a
          href={api.sampleUrl(sample)}
          download={`brewhaus-${sample}-sample.csv`}
          className="font-label-sm text-primary hover:text-primary-fixed flex items-center gap-1.5 transition-colors uppercase tracking-wider font-bold"
        >
          <span className="material-symbols-outlined text-[16px]">download</span> Sample CSV
        </a>
      </div>

      <label
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
        className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-xl py-12 cursor-pointer transition-all ${
          dragOver ? "border-primary bg-primary/5" : "border-outline-variant/30 hover:border-primary/50 hover:bg-surface-container-low/30"
        }`}
      >
        <span className="material-symbols-outlined text-[32px] text-on-surface-variant/50">upload</span>
        <span className="font-label-md text-on-surface-variant">
          {busy ? "Uploading…" : "Drop CSV here or click to browse"}
        </span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </label>

      <p className="font-label-sm text-on-surface-variant/70 mt-4 flex items-start gap-1.5">
        <span className="material-symbols-outlined text-[16px] flex-shrink-0 mt-0.5">description</span>
        <span>{columns}</span>
      </p>

      {result && (
        <div className="mt-6 flex items-start gap-3 bg-sage/15 border border-sage/20 rounded-xl p-4 shadow-sm">
          <span className="material-symbols-outlined text-sage text-[20px] flex-shrink-0 mt-0.5">check_circle</span>
          <div>
            <p className="font-label-md text-sage">{renderResult(result)}</p>
            {result.errors?.length > 0 && (
              <p className="font-label-sm text-warning mt-1">{result.errors.length} row(s) skipped: {result.errors[0]}</p>
            )}
          </div>
        </div>
      )}
      {error && (
        <div className="mt-6 flex items-center gap-3 bg-error/15 border border-error/20 rounded-xl p-4 shadow-sm">
          <span className="material-symbols-outlined text-error text-[20px]">error</span>
          <span className="font-label-md text-error">{error}</span>
        </div>
      )}
    </div>
  );
}
