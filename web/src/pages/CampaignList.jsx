import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { Megaphone, Search, ArrowRight } from "lucide-react";

export default function CampaignList() {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.campaigns().then(res => {
      setCampaigns(res);
      setLoading(false);
    }).catch(console.error);
  }, []);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'sent':
        return <span className="bg-success/10 text-success px-2.5 py-1 rounded-full text-xs font-medium border border-success/20">Sent</span>;
      case 'sending':
        return <span className="bg-warning/10 text-warning px-2.5 py-1 rounded-full text-xs font-medium border border-warning/20 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-warning rounded-full animate-pulse"></span> Sending</span>;
      default:
        return <span className="bg-surface text-text/70 px-2.5 py-1 rounded-full text-xs font-medium border border-border capitalize">{status}</span>;
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-serif font-bold text-mocha-dark">Campaigns</h1>
          <p className="text-text/60 mt-1">Manage and track your outreach efforts.</p>
        </div>
        <Link to="/copilot" className="btn-primary py-2 flex items-center gap-2">
          <Megaphone className="w-4 h-4" /> New Campaign
        </Link>
      </div>

      <div className="card p-0 overflow-hidden">
        <div className="p-4 border-b border-border bg-surface/50 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text/40" />
            <input type="text" placeholder="Search campaigns..." className="w-full bg-white border border-border rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-caramel/50" />
          </div>
        </div>
        
        <table className="w-full text-left text-sm">
          <thead className="bg-surface/30 text-text/60 text-xs uppercase tracking-wider">
            <tr>
              <th className="px-6 py-4 font-medium">Name</th>
              <th className="px-6 py-4 font-medium">Channel</th>
              <th className="px-6 py-4 font-medium">Status</th>
              <th className="px-6 py-4 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading ? (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-text/50">Loading campaigns...</td>
              </tr>
            ) : campaigns.length > 0 ? campaigns.map(c => (
              <tr key={c.id} className="hover:bg-surface/50 transition-colors group">
                <td className="px-6 py-4">
                  <div className="font-medium text-mocha-dark">{c.name}</div>
                  <div className="text-text/50 text-xs mt-0.5">ID: {c.id}</div>
                </td>
                <td className="px-6 py-4">
                  <span className="capitalize">{c.channel}</span>
                </td>
                <td className="px-6 py-4">
                  {getStatusBadge(c.status)}
                </td>
                <td className="px-6 py-4 text-right">
                  <Link to={`/campaigns/${c.id}`} className="inline-flex items-center gap-1 text-caramel font-medium hover:underline opacity-0 group-hover:opacity-100 transition-opacity">
                    View Details <ArrowRight className="w-4 h-4" />
                  </Link>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="4" className="px-6 py-8 text-center text-text/50">No campaigns found. Start one with the Co-pilot.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
