import { useState, useRef, useEffect } from "react";
import { Sparkles, X, Send, Bot, User, BarChart2 } from "lucide-react";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";

export default function FloatingAgent() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "agent",
      text: "Hi! I'm your Universal Assistant. I can help you navigate, fetch data, or launch campaigns. How can I help?",
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
        navigate(res.action_payload?.path || "/");
      } else if (res.action === "propose_campaign") {
        navigate("/copilot", { state: { initialGoal: res.action_payload?.goal } });
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

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
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
                <Sparkles className="w-5 h-5 text-caramel" />
                <h3 className="font-serif font-bold">Data Agent</h3>
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
                    {msg.role === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
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
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-border text-text p-3 rounded-2xl rounded-tl-sm shadow-sm flex gap-1 items-center">
                    <span className="w-2 h-2 bg-caramel rounded-full animate-bounce"></span>
                    <span className="w-2 h-2 bg-caramel rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                    <span className="w-2 h-2 bg-caramel rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
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

      <button
        onClick={() => setIsOpen(!isOpen)}
        className={clsx(
          "w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-transform hover:scale-105 active:scale-95",
          isOpen ? "bg-mocha-dark" : "bg-gradient-to-tr from-caramel to-warning"
        )}
      >
        {isOpen ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </button>
    </div>
  );
}
