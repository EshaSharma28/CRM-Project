import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { Sparkles, ChevronRight, Loader2 } from "lucide-react";

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
        return <span className="bg-[#EEF1EB] text-[#4F6C4E] px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-[#DEE6DA]">Sent</span>;
      case 'sending':
        return <span className="bg-warning/10 text-warning px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-warning/20 flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></span> Sending</span>;
      case 'scheduled':
        return <span className="bg-caramel/10 text-caramel px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-caramel/20 flex items-center gap-1.5 w-fit"><span className="w-1.5 h-1.5 bg-caramel rounded-full"></span> Scheduled</span>;
      case 'draft':
        return <span className="bg-surface text-text/60 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-border">Draft</span>;
      default:
        return <span className="bg-surface text-text/60 px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border border-border capitalize">{status}</span>;
    }
  };

  const getChannelBadge = (channel) => {
    return <span className="bg-white border border-border text-mocha-dark px-2.5 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider capitalize shadow-sm">{channel}</span>;
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="card p-0 overflow-hidden shadow-sm border border-border bg-white rounded-2xl">
        
        {/* Card Header */}
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h3 className="text-xl font-serif font-bold text-mocha-dark">All campaigns</h3>
          <button onClick={() => navigate("/copilot")} className="bg-[#BE7E50] hover:bg-[#A66C44] text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm">
            <Sparkles className="w-4 h-4" /> New with co-pilot
          </button>
        </div>

        {/* Content */}
        {campaigns === null ? (
          <div className="p-16 flex flex-col items-center justify-center text-text/40 space-y-4">
            <div className="flex gap-2">
              <div className="w-2 h-2 bg-caramel/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-caramel/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-caramel/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        ) : campaigns.length === 0 ? (
          <div className="p-16 text-center text-text/50">
            <p className="text-sm">No campaigns yet — start one with the co-pilot.</p>
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-[#F7F4F0] text-text/50 text-[10px] uppercase tracking-widest border-b border-border">
              <tr>
                <th className="px-6 py-4 font-bold">Campaign</th>
                <th className="px-6 py-4 font-bold">Channel</th>
                <th className="px-6 py-4 font-bold">Status</th>
                <th className="px-6 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns.map(c => (
                <tr key={c.id} onClick={() => navigate(`/campaigns/${c.id}`)} className="hover:bg-[#F7F4F0]/50 transition-colors cursor-pointer group">
                  <td className="px-6 py-4">
                    <div className="font-bold text-mocha-dark text-[15px]">{c.name}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getChannelBadge(c.channel)}
                      {c.has_ab_test && (
                        <span className="text-[10px] font-bold text-caramel uppercase tracking-wider">A/B Test</span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(c.status)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <ChevronRight className="w-5 h-5 text-text/30 group-hover:text-caramel transition-colors inline-block" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
