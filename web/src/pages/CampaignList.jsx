import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { SteamingCup, Cup, SteamWisp } from "../components/CoffeeDoodles";

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const load = () => {
      api.campaigns().then(setCampaigns).catch(() => setCampaigns([]));
    };
    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <span className="bg-sage/15 text-sage px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-sage/20 shadow-sm">Sent</span>;
      case 'sending':
        return <span className="bg-warning/10 text-warning px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-warning/20 flex items-center gap-1.5 w-fit shadow-sm"><SteamWisp className="w-3 h-3 text-warning" /> Sending</span>;
      case 'scheduled':
        return <span className="bg-primary/10 text-primary px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-primary/20 flex items-center gap-1.5 w-fit shadow-sm"><span className="w-1.5 h-1.5 bg-primary rounded-full"></span> Scheduled</span>;
      case 'draft':
        return <span className="bg-surface-container-highest text-on-surface-variant px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-outline-variant/30 shadow-sm">Draft</span>;
      default:
        return <span className="bg-surface-container-highest text-on-surface-variant px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-outline-variant/30 capitalize shadow-sm">{status}</span>;
    }
  };

  const getChannelBadge = (channel) => {
    return <span className="bg-white border border-outline-variant/30 text-on-surface px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider capitalize shadow-sm">{channel}</span>;
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
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Campaigns</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Create, manage, and monitor your personalized marketing campaigns.
            </p>
          </div>
          <button onClick={() => navigate("/crema")} className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">auto_awesome</span> New with Crema
          </button>
        </section>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm glass-effect overflow-hidden">
          {/* Content */}
          {campaigns === null ? (
            <div className="p-20 flex flex-col items-center justify-center text-on-surface-variant space-y-4">
              <SteamingCup className="w-16 h-16 text-primary/60" />
              <p className="font-label-md">Brewing campaigns...</p>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="p-20 flex flex-col items-center justify-center text-center text-on-surface-variant">
              <Cup className="w-20 h-20 text-primary/20 mb-4" />
              <p className="font-label-md">No campaigns yet — start one with Crema.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-surface-container-low text-on-surface-variant font-label-sm border-b border-outline-variant/20">
                  <tr>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">Campaign</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">Channel</th>
                    <th className="px-6 py-4 font-medium uppercase tracking-wider">Status</th>
                    <th className="px-6 py-4"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/5">
                  {campaigns.map(c => (
                    <tr key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)} className="group hover:bg-surface-container-low transition-colors cursor-pointer">
                      <td className="px-6 py-5">
                        <div className="font-headline-sm text-on-surface">{c.name}</div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-2">
                          {getChannelBadge(c.channel)}
                          {c.has_ab_test && (
                            <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider bg-tertiary/10 px-2 py-0.5 rounded border border-tertiary/20">A/B Test</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        {getStatusBadge(c.status)}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <span className="material-symbols-outlined text-outline group-hover:text-primary transition-colors">chevron_right</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
