import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, BarChart2 } from "lucide-react";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useNavigate, useLocation } from "react-router-dom";
import { MascotFace, SteamingCup } from "./CoffeeDoodles";

const CremaIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    {/* Heart Steam centered at x=10 */}
    <path d="M15 4.5C15 3.11929 13.8807 2 12.5 2C11.433 2 10.523 2.6685 10.1614 3.60682C9.7997 2.6685 8.88972 2 7.82276 2C6.44205 2 5.32275 3.11929 5.32275 4.5C5.32275 6.0967 6.7471 7.6432 9.3621 9.9407C9.7937 10.3201 10.4552 10.3201 10.8867 9.9407C13.5017 7.6432 14.9261 6.0967 15.0361 4.5H15Z" />
    {/* Cup Base */}
    <path d="M4 11H16V14C16 17.3137 13.3137 20 10 20C6.68629 20 4 17.3137 4 14V11Z" />
    {/* Handle */}
    <path d="M16 11V15H17.5C18.8807 15 20 13.8807 20 12.5C20 11.1193 18.8807 10 17.5 10H16V11Z" />
    {/* Saucer */}
    <path d="M2 21C2 20.4477 2.44772 20 3 20H17C17.5523 20 18 20.4477 18 21C18 21.5523 17.5523 22 17 22H3C2.44772 22 2 21.5523 2 21Z" />
  </svg>
);

export default function FloatingAgent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "Hi! I'm Crema. Sip your coffee, till I work for you. How can I help you today?",
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  async function handleAsk(e) {
    e?.preventDefault();
    const text = query.trim();
    if (!text || thinking) return;

    setQuery("");
    
    // Add user message to UI
    const userMsg = { role: "user", text };
    
    // Prepare history for API (only text messages)
    const historyForApi = messages
      .filter(m => m.text)
      .map(m => ({ role: m.role === "user" ? "user" : "assistant", content: m.text }));
      
    setMessages((prev) => [...prev, userMsg]);
    setThinking(true);

    try {
      const res = await api.assistant(historyForApi, text);
      
      const nextMessages = [];
      if (res.reply) {
        nextMessages.push({ role: "agent", text: res.reply });
      }

      if (res.action === "navigate") {
        // Guard against a hallucinated path rendering a blank page.
        const VALID = ["/", "/campaigns", "/shoppers", "/analytics", "/crema",
          "/agent", "/audiences", "/automations", "/import", "/activity", "/settings"];
        const path = res.action_payload?.path;
        navigate(VALID.includes(path) ? path : "/");
      } else if (res.action === "propose_campaign") {
        navigate("/crema", { state: { initialGoal: res.action_payload?.goal } });
      } else if (res.action === "ask_analytics") {
        // Automatically run the query
        const analyticsRes = await api.ask(res.action_payload?.question || text);
        nextMessages.push({
          role: "agent",
          interpretation: analyticsRes.interpretation,
          result: analyticsRes,
        });
      }
      
      setMessages(prev => [...prev, ...nextMessages]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        { role: "agent", text: "Oops, I ran into an error: " + err.message },
      ]);
    } finally {
      setThinking(false);
    }
  }

  const renderResult = (res) => {
    if (res.rows) {
      // Grouped result
      return (
        <div className="mt-2 space-y-1">
          {res.rows.map((row, i) => (
            <div key={i} className="flex justify-between items-center bg-white/50 px-2 py-1 rounded text-xs">
              <span className="font-medium text-text/80">{row.label}</span>
              <span className="font-mono text-mocha-dark">
                {res.metric === "revenue" || res.metric === "sum_spend" || res.metric === "avg_spend" || res.metric === "avg_order_value"
                  ? `₹${row.value.toLocaleString()}`
                  : row.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      );
    }

    // Scalar result
    const isCurrency =
      res.metric === "revenue" || res.metric === "sum_spend" || res.metric === "avg_spend" || res.metric === "avg_order_value";
    
    return (
      <div className="mt-2 text-2xl font-serif font-bold text-caramel">
        {isCurrency ? `₹${res.value.toLocaleString()}` : res.value.toLocaleString()}
      </div>
    );
  };

  if (location.pathname === "/crema") return null;

  return (
    <div id="tour-floating-agent" className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="mb-4 w-80 sm:w-96 bg-surface-white rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col"
            style={{ height: "500px", maxHeight: "calc(100vh - 120px)" }}
          >
            {/* Header */}
            <div className="bg-mocha-dark p-4 flex justify-between items-center shadow-md z-10">
              <div className="flex items-center gap-2 text-surface-white">
                <CremaIcon className="w-6 h-6 text-caramel" />
                <h3 className="font-serif font-bold">Crema AI Agent</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 bg-background/50 flex flex-col gap-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={clsx(
                    "flex gap-2 max-w-[85%]",
                    msg.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"
                  )}
                >
                  <div
                    className={clsx(
                      "flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                      msg.role === "user" ? "bg-caramel text-white" : "bg-mocha-dark text-caramel"
                    )}
                  >
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <MascotFace className="w-5 h-5" />}
                  </div>
                  <div
                    className={clsx(
                      "p-3 rounded-2xl text-sm shadow-sm",
                      msg.role === "user"
                        ? "bg-caramel text-white rounded-tr-sm"
                        : "bg-white border border-border text-text rounded-tl-sm"
                    )}
                  >
                    {msg.text && <p className="whitespace-pre-wrap">{msg.text}</p>}
                    
                    {msg.interpretation && (
                      <div className="mb-2 text-xs text-text/50 font-medium flex items-center gap-1">
                        <BarChart2 className="w-3 h-3" />
                        {msg.interpretation}
                      </div>
                    )}
                    
                    {msg.result && renderResult(msg.result)}
                  </div>
                </div>
              ))}
              
              {thinking && (
                <div className="flex gap-2 mr-auto max-w-[85%]">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-mocha-dark text-caramel flex items-center justify-center">
                    <MascotFace className="w-5 h-5" />
                  </div>
                  <div className="bg-white border border-border text-text p-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
                    <SteamingCup className="w-6 h-6 text-caramel/60" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form
              onSubmit={handleAsk}
              className="p-3 border-t border-border bg-white flex items-center gap-2"
            >
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask me to navigate, fetch data, or launch a campaign..."
                className="flex-1 bg-surface border border-border rounded-full px-4 py-2 text-sm focus:outline-none focus:border-caramel/50 transition-colors"
                disabled={thinking}
              />
              <button
                type="submit"
                disabled={!query.trim() || thinking}
                className="w-10 h-10 rounded-full bg-caramel text-white flex items-center justify-center hover:bg-caramel/90 transition-colors disabled:opacity-50 disabled:hover:bg-caramel flex-shrink-0 shadow-md"
              >
                <Send className="w-4 h-4 ml-0.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative flex items-center">
        {/* Floating Bubble Tag */}
        <AnimatePresence>
          {!isOpen && (
            <motion.div
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ delay: 0.5 }}
              className="absolute right-[70px] animate-bounce flex items-center z-10 pointer-events-none"
            >
              <div className="bg-white text-mocha-dark px-4 py-2.5 rounded-xl shadow-lg border border-border whitespace-nowrap font-bold text-sm tracking-wide">
                Ask Crema anything
              </div>
              <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[10px] border-l-white border-b-[8px] border-b-transparent drop-shadow-sm -ml-[1px]" />
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setIsOpen(!isOpen)}
          className={clsx(
            "w-16 h-16 rounded-full flex items-center justify-center text-white shadow-2xl transition-transform hover:scale-105 active:scale-95 z-20",
            isOpen ? "bg-mocha-dark" : "bg-[#77574d]"
          )}
        >
          {isOpen ? <X className="w-6 h-6" /> : <CremaIcon className="w-8 h-8" />}
        </button>
      </div>
    </div>
  );
}
