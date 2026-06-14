import { useState } from "react";
import { motion } from "framer-motion";

export default function Settings() {
  const [saving, setSaving] = useState(false);

  const handleSave = () => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      alert("Settings saved successfully!");
    }, 800);
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 pb-20">
      <section className="border-b border-outline-variant/30 pb-6">
        <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Settings</h1>
        <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
          Manage your workspace preferences, lifecycle thresholds, and integrations.
        </p>
      </section>

      <div className="space-y-8">
        {/* Lifecycle Thresholds */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-xl shadow-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">timeline</span>
            Lifecycle & CRM Thresholds
          </h2>
          <p className="text-sm text-on-surface-variant mb-6">Define how many days it takes for a customer's status to downgrade.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">"At Risk" Threshold (Days)</label>
              <input type="number" defaultValue={60} className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 focus:border-primary focus:outline-none font-bold text-on-surface" />
              <p className="text-xs text-on-surface-variant mt-1.5">Customers without orders in this timeframe become 'At Risk'.</p>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">"Churned" Threshold (Days)</label>
              <input type="number" defaultValue={120} className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 focus:border-primary focus:outline-none font-bold text-on-surface" />
              <p className="text-xs text-on-surface-variant mt-1.5">Customers without orders in this timeframe become 'Churned'.</p>
            </div>
          </div>
        </div>

        {/* General Settings */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-xl shadow-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">tune</span>
            Workspace Preferences
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Timezone</label>
              <select className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-on-surface">
                <option>Asia/Kolkata (IST)</option>
                <option>America/New_York (EST)</option>
                <option>Europe/London (GMT)</option>
              </select>
            </div>
            <div>
              <label className="block font-label-md text-label-md text-on-surface-variant mb-1.5">Currency</label>
              <select className="w-full bg-surface border border-outline-variant/50 rounded-lg py-2 px-3 focus:border-primary focus:outline-none text-on-surface">
                <option>INR (₹)</option>
                <option>USD ($)</option>
                <option>EUR (€)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div className="bg-surface-container-lowest border border-outline-variant/30 p-6 rounded-xl shadow-sm">
          <h2 className="font-headline-md text-headline-md text-on-surface mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">extension</span>
            Integrations
          </h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[36px] text-[#95bf47]">storefront</span>
                <div>
                  <h3 className="font-bold text-on-surface text-sm">Shopify E-Commerce</h3>
                  <p className="text-xs text-on-surface-variant">Sync orders, products, and abandoned carts.</p>
                </div>
              </div>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Connected</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 hover:border-primary/30 transition-colors cursor-pointer">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[36px] text-[#25D366]">forum</span>
                <div>
                  <h3 className="font-bold text-on-surface text-sm">WhatsApp Business API</h3>
                  <p className="text-xs text-on-surface-variant">Send campaigns and automations directly via WhatsApp.</p>
                </div>
              </div>
              <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-widest">Connected</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-lg border border-outline-variant/20 hover:border-primary/30 transition-colors cursor-pointer opacity-70">
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-[36px] text-outline">mark_email_unread</span>
                <div>
                  <h3 className="font-bold text-on-surface text-sm">Mailchimp</h3>
                  <p className="text-xs text-on-surface-variant">Email campaign delivery and templates.</p>
                </div>
              </div>
              <button className="bg-primary text-on-primary text-xs font-bold px-4 py-1.5 rounded-full hover:brightness-110">Connect</button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button onClick={handleSave} disabled={saving} className="bg-primary text-on-primary px-8 py-3 rounded-full font-bold flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm">
          <span className="material-symbols-outlined text-[20px]">save</span> 
          {saving ? "Saving..." : "Save Preferences"}
        </button>
      </div>

    </div>
  );
}
