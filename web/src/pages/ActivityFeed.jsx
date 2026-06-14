import { useState, useEffect, useRef } from "react";
import { api } from "../api";
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
      case 'delivered': return <span className="material-symbols-outlined text-[16px] text-success">check_circle</span>;
      case 'opened': return <span className="material-symbols-outlined text-[16px] text-caramel">visibility</span>;
      case 'read': return <span className="material-symbols-outlined text-[16px] text-sage">done_all</span>;
      case 'clicked': return <span className="material-symbols-outlined text-[16px] text-warning">ads_click</span>;
      case 'failed': return <span className="material-symbols-outlined text-[16px] text-error">cancel</span>;
      default: return <span className="material-symbols-outlined text-[16px] text-white/50">timeline</span>;
    }
  };

  const getChannelIcon = (channel) => {
    switch (channel) {
      case 'email': return <span className="material-symbols-outlined text-[14px] text-white/40">mail</span>;
      case 'sms': return <span className="material-symbols-outlined text-[14px] text-white/40">sms</span>;
      case 'whatsapp': return <span className="material-symbols-outlined text-[14px] text-white/40">smartphone</span>;
      default: return null;
    }
  };

  return (
    <div className="relative min-h-full">
      <div className="p-8 max-w-5xl mx-auto space-y-8 relative z-10">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2 flex items-center gap-3">
              <span className="material-symbols-outlined text-[32px] text-primary">timeline</span> Channel Activity
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">
              Live webhook events from the channel service.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {reconResult && (
              <span className={`font-label-md ${reconResult.error ? "text-error" : "text-sage"}`}>
                {reconResult.error
                  ? `⚠ ${reconResult.error}`
                  : `Recovered ${reconResult.recovered} lost event${reconResult.recovered === 1 ? "" : "s"} (checked ${reconResult.checked})`}
              </span>
            )}
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              title="Recover any communications whose callbacks were lost"
              className="flex items-center gap-2 font-label-md text-on-surface bg-surface-container-low hover:bg-surface-container border border-outline-variant/30 px-4 py-2 rounded-full transition-all shadow-sm disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[18px] ${reconciling ? "animate-spin" : ""}`}>sync</span> Reconcile lost events
            </button>
            <div className="flex items-center gap-2 font-label-md uppercase tracking-wider font-bold text-success bg-success/15 px-4 py-2 rounded-full border border-success/30 shadow-sm">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
              Listening
            </div>
          </div>
        </section>

        <div className="bg-[#1A1A1A] border border-outline-variant/30 rounded-2xl shadow-xl overflow-hidden glass-effect min-h-[600px] flex flex-col">
          <div className="p-4 bg-black/40 border-b border-white/10 font-mono text-[12px] text-white/50 flex justify-between">
            <span>{'>'} tail -f /var/log/channel-webhooks.log</span>
            <span>{events.length} events buffered</span>
          </div>
          
          <div className="flex-1 overflow-hidden relative">
            {events.length === 0 ? (
               <div className="absolute inset-0 flex items-center justify-center text-white/30 font-mono text-[13px]">
                 Waiting for events... Start a campaign to see activity.
               </div>
            ) : (
              <div className="absolute inset-0 p-5 overflow-y-auto flex flex-col-reverse space-y-reverse space-y-3">
                <AnimatePresence initial={false}>
                  {events.map((ev) => (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: -20, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: 'auto' }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                      className="flex items-center gap-4 p-4 rounded-xl bg-[#2A2A2A] border border-white/5 shadow-sm"
                    >
                      <div className="bg-white/5 p-2.5 rounded-lg flex items-center justify-center">
                        {getEventIcon(ev.type)}
                      </div>
                      
                      <div className="flex-1 flex items-center justify-between min-w-0">
                        <div className="truncate">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`text-[11px] font-bold uppercase tracking-wider ${
                              ev.type === 'delivered' ? 'text-success' :
                              ev.type === 'opened' ? 'text-caramel' :
                              ev.type === 'read' ? 'text-sage' :
                              ev.type === 'clicked' ? 'text-warning' : 'text-error'
                            }`}>
                              {ev.type}
                            </span>
                            <span className="text-white/40 text-[10px]">•</span>
                            <span className="text-white/90 text-[15px] font-medium truncate">{ev.campaignName}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-[12px] text-white/50 font-medium">
                            {getChannelIcon(ev.channel)}
                            <span className="capitalize">{ev.channel}</span>
                          </div>
                        </div>
                        
                        <div className="text-[12px] text-white/30 font-mono">
                          {ev.timestamp.toLocaleTimeString([], { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}.{ev.timestamp.getMilliseconds().toString().padStart(3, '0')}
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
    </div>
  );
}
