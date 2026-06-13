import { useState, useEffect, useRef } from "react";
import { api } from "../api";
import { Activity, Mail, MessageSquare, Smartphone, CheckCircle2, CheckCheck, Eye, MousePointerClick, XCircle, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MAX_EVENTS = 50;

export default function ActivityFeed() {
  const [events, setEvents] = useState([]);
  const [reconciling, setReconciling] = useState(false);
  const [reconResult, setReconResult] = useState(null);

  async function handleReconcile() {
    setReconciling(true);
    setReconResult(null);
    try {
      const r = await api.reconcile();
      setReconResult(r);
      setTimeout(() => setReconResult(null), 7000);
    } catch (e) {
      setReconResult({ error: e.message });
    } finally {
      setReconciling(false);
    }
  }

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const rawEvents = await api.events(MAX_EVENTS);
        const parsed = rawEvents.map(e => ({
          ...e,
          timestamp: new Date(e.timestamp)
        }));
        setEvents(parsed);
      } catch (e) {
        console.error("Feed polling error", e);
      }
    };

    fetchEvents();
    const pollInterval = setInterval(fetchEvents, 2000);
    return () => clearInterval(pollInterval);
  }, []);

  const getEventIcon = (type) => {
    switch (type) {
      case 'delivered': return <CheckCircle2 className="w-4 h-4 text-success" />;
      case 'opened': return <Eye className="w-4 h-4 text-caramel" />;
      case 'read': return <CheckCheck className="w-4 h-4 text-sage" />;
      case 'clicked': return <MousePointerClick className="w-4 h-4 text-warning" />;
      case 'failed': return <XCircle className="w-4 h-4 text-error" />;
      default: return <Activity className="w-4 h-4 text-text/50" />;
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <Mail className="w-3 h-3 text-text/40" />;
      case 'sms': return <MessageSquare className="w-3 h-3 text-text/40" />;
      case 'whatsapp': return <Smartphone className="w-3 h-3 text-text/40" />;
      default: return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-mocha-dark flex items-center gap-3">
            <Activity className="w-8 h-8 text-caramel" /> Channel Activity
          </h1>
          <p className="text-text/60 mt-1">Live webhook events from the channel service.</p>
        </div>
        <div className="flex items-center gap-3">
          {reconResult && (
            <span className={`text-sm font-medium ${reconResult.error ? "text-error" : "text-sage"}`}>
              {reconResult.error
                ? `⚠ ${reconResult.error}`
                : `Recovered ${reconResult.recovered} lost event${reconResult.recovered === 1 ? "" : "s"} (checked ${reconResult.checked})`}
            </span>
          )}
          <button
            onClick={handleReconcile}
            disabled={reconciling}
            title="Recover any communications whose callbacks were lost"
            className="flex items-center gap-2 text-sm font-medium text-mocha-dark bg-surface hover:bg-caramel/10 border border-border hover:border-caramel/30 px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${reconciling ? "animate-spin" : ""}`} /> Reconcile lost events
          </button>
          <div className="flex items-center gap-2 text-sm font-medium text-success bg-success/10 px-3 py-1.5 rounded-full border border-success/20">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
            Listening
          </div>
        </div>
      </div>

      <div className="card p-0 overflow-hidden bg-mocha-dark text-surface-white border-0 shadow-lg min-h-[600px] flex flex-col">
        <div className="p-3 bg-black/20 border-b border-white/10 text-xs font-mono text-white/50 flex justify-between">
          <span>{'>'} tail -f /var/log/channel-webhooks.log</span>
          <span>{events.length} events buffered</span>
        </div>
        
        <div className="flex-1 overflow-hidden relative">
          {events.length === 0 ? (
             <div className="absolute inset-0 flex items-center justify-center text-white/30 font-mono text-sm">
               Waiting for events... Start a campaign to see activity.
             </div>
          ) : (
            <div className="absolute inset-0 p-4 overflow-y-auto flex flex-col-reverse space-y-reverse space-y-2">
              <AnimatePresence initial={false}>
                {events.map((ev) => (
                  <motion.div
                    key={ev.id}
                    initial={{ opacity: 0, x: -20, height: 0 }}
                    animate={{ opacity: 1, x: 0, height: 'auto' }}
                    exit={{ opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/5 font-sans"
                  >
                    <div className="bg-white/10 p-2 rounded-md">
                      {getEventIcon(ev.type)}
                    </div>
                    
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <div className="truncate">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className={`text-xs font-bold uppercase tracking-wider ${
                            ev.type === 'delivered' ? 'text-success' :
                            ev.type === 'opened' ? 'text-caramel' :
                            ev.type === 'read' ? 'text-sage' :
                            ev.type === 'clicked' ? 'text-warning' : 'text-error'
                          }`}>
                            {ev.type}
                          </span>
                          <span className="text-white/40 text-xs">•</span>
                          <span className="text-white/80 text-sm font-medium truncate">{ev.campaignName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-white/40">
                          {getChannelIcon(ev.channel)}
                          <span className="capitalize">{ev.channel}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs text-white/30 font-mono">
                        {ev.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}.{ev.timestamp.getMilliseconds()}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
