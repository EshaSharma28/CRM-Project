import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { LonelyBean } from "../components/CoffeeDoodles";

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex items-center gap-2">
      <span className="text-on-surface-variant">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`bg-surface-container border rounded-lg px-2.5 py-1.5 text-on-surface focus:outline-none focus:border-primary/50 ${value ? "border-primary/40 text-primary" : "border-outline-variant/30"}`}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </label>
  );
}

export default function Shoppers() {
  const [shoppers, setShoppers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [stageFilter, setStageFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  const [rfmFilter, setRfmFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");
  const [sort, setSort] = useState("spend");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 50;
  
  const startIdx = page === 1 ? 0 : (page - 1) * limit + 1;
  const endIdx = page * limit;
  
  // Drawer
  const [selectedId, setSelectedId] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const loadShoppers = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      if (stageFilter) query.append("lifecycle_stage", stageFilter);
      if (cityFilter) query.append("city", cityFilter);
      if (rfmFilter) query.append("rfm_segment", rfmFilter);
      if (channelFilter) query.append("channel_pref", channelFilter);
      if (genderFilter) query.append("gender", genderFilter);
      query.append("sort", sort);
      query.append("limit", limit.toString());
      query.append("offset", ((page - 1) * limit).toString());

      const res = await api.customers(`?${query.toString()}`);
      setShoppers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, cityFilter, rfmFilter, channelFilter, genderFilter, sort, page]);

  useEffect(() => {
    setPage(1);
  }, [stageFilter, cityFilter, rfmFilter, channelFilter, genderFilter, sort]);

  // Combined debounce for all filters to avoid stale closures
  useEffect(() => {
    const timeout = setTimeout(() => {
      loadShoppers();
    }, 300);
    return () => clearTimeout(timeout);
  }, [loadShoppers]);

  const openDrawer = async (id) => {
    setSelectedId(id);
    setLoadingDetails(true);
    try {
      const [userRes, ordersRes] = await Promise.all([
        api.customer(id),
        api.orders(`?customer_id=${id}`)
      ]);
      setSelectedUser(userRes);
      setOrders(ordersRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingDetails(false);
    }
  };

  const closeDrawer = () => {
    setSelectedId(null);
    setSelectedUser(null);
    setOrders([]);
  };

  return (
    <div className="relative min-h-full">
      <div className="p-8 max-w-7xl mx-auto space-y-8 relative z-10">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-outline-variant/30 pb-6">
          <div>
            <h1 className="font-headline-xl text-headline-xl text-on-surface mb-2">Shoppers</h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">View and filter your customer base.</p>
          </div>
          <Link to="/import" className="bg-primary text-on-primary px-6 py-2.5 rounded-full font-label-md flex items-center gap-2 hover:opacity-90 active:scale-95 transition-all shadow-sm">
            <span className="material-symbols-outlined text-[20px]">upload</span> Import Data
          </Link>
        </section>

        <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-xl shadow-sm glass-effect overflow-hidden">
          <div className="p-4 bg-surface-container-lowest/50 border-b border-outline-variant/20 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full max-w-md">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-on-surface-variant/50">search</span>
              <input 
                type="text" 
                placeholder="Search by name or city..." 
                value={cityFilter}
                onChange={e => setCityFilter(e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-lg pl-10 pr-4 py-2 text-on-surface text-[14px] focus:outline-none focus:border-primary/50 transition-colors" 
              />
            </div>
            <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
              {[
                { id: "", label: "All" },
                { id: "new", label: "New" },
                { id: "active", label: "Active" },
                { id: "at_risk", label: "At Risk" },
                { id: "lapsed", label: "Lapsed" },
                { id: "churned", label: "Churned" }
              ].map(stage => (
                <button
                  key={stage.id}
                  onClick={() => setStageFilter(stage.id)}
                  className={`px-4 py-1.5 font-label-md rounded-full border transition-all whitespace-nowrap ${
                    stageFilter === stage.id 
                      ? "bg-tertiary/10 border-tertiary/30 text-tertiary" 
                      : "bg-surface-container border-outline-variant/20 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
                  }`}
                >
                  {stage.label}
                </button>
              ))}
            </div>
          </div>

          {/* Marketer filters */}
          <div className="px-4 py-3 border-b border-outline-variant/20 flex items-center gap-4 text-[14px]">
            <button 
              onClick={() => setShowFilters(!showFilters)} 
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-label-md transition-colors border ${showFilters ? "bg-surface-container-high border-outline-variant/50 text-on-surface shadow-sm" : "bg-surface-container-lowest border-outline-variant/30 hover:bg-surface-container-low text-on-surface-variant hover:text-on-surface"}`}
            >
              <span className="material-symbols-outlined text-[18px]">filter_list</span> More Filters
            </button>
            <div className="h-6 w-px bg-outline-variant/30"></div>
            <span className="font-label-md text-on-surface-variant font-bold text-[14px]">
              Showing {startIdx}-{endIdx} Customers
            </span>
            
            {(rfmFilter || channelFilter || genderFilter || stageFilter) && (
              <button onClick={() => { setRfmFilter(""); setChannelFilter(""); setGenderFilter(""); setStageFilter(""); }}
                className="ml-auto text-primary font-medium hover:underline text-[13px]">Clear Filters</button>
            )}
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-b border-outline-variant/20 bg-surface-container-low/30">
                <div className="px-4 py-4 flex flex-wrap items-center gap-3 text-[13px]">
                  <FilterSelect label="RFM" value={rfmFilter} onChange={setRfmFilter}
                    options={[["", "Any segment"], ["Champions", "Champions"], ["Loyal", "Loyal"], ["Potential Loyalist", "Potential Loyalist"], ["At Risk", "At Risk"], ["Can't Lose Them", "Can't Lose Them"], ["Hibernating", "Hibernating"], ["Lost", "Lost"]]} />
                  <FilterSelect label="Channel" value={channelFilter} onChange={setChannelFilter}
                    options={[["", "Any channel"], ["whatsapp", "WhatsApp"], ["email", "Email"], ["sms", "SMS"]]} />
                  <FilterSelect label="Gender" value={genderFilter} onChange={setGenderFilter}
                    options={[["", "Any gender"], ["female", "Female"], ["male", "Male"], ["other", "Other"]]} />
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-on-surface-variant">Sort</span>
                    <select value={sort} onChange={(e) => setSort(e.target.value)}
                      className="bg-surface-container border border-outline-variant/30 rounded-lg px-2.5 py-1.5 text-on-surface focus:outline-none focus:border-primary/50">
                      <option value="spend">Top spend</option>
                      <option value="orders">Most orders</option>
                      <option value="recent">Most recent</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-container-low text-on-surface-variant font-label-sm border-b border-outline-variant/20">
                <tr>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Name</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Contact</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider">Stage</th>
                  <th className="px-6 py-4 font-medium uppercase tracking-wider text-right">Total Spent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {loading ? (
                  <tr><td colSpan="4" className="px-6 py-12 text-center font-label-md text-on-surface-variant">Loading...</td></tr>
                ) : shoppers.length > 0 ? shoppers.map(s => (
                  <tr 
                    key={s.id} 
                    onClick={() => openDrawer(s.id)}
                    className="hover:bg-surface-container-low transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="font-headline-sm text-on-surface">{s.name}</div>
                      <div className="font-label-sm text-on-surface-variant mt-1 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span> {s.city}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-body-md text-on-surface-variant">{s.email}</div>
                      <div className="font-label-sm text-on-surface-variant/70 mt-1">{s.phone}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wider shadow-sm">{s.lifecycle_stage}</span>
                    </td>
                    <td className="px-6 py-4 text-right font-headline-sm text-on-surface">
                      ₹{s.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="px-6 py-20">
                      <div className="flex flex-col items-center justify-center text-on-surface-variant">
                        <LonelyBean className="w-16 h-16 text-primary/30 mb-4" />
                        <p className="font-label-md">No shoppers found.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="p-4 border-t border-outline-variant/20 flex items-center justify-center gap-6 bg-surface-container-low/30">
            <button 
              disabled={page === 1}
              onClick={() => setPage(p => Math.max(1, p - 1))}
              className="px-3 py-1 bg-surface-container border border-outline-variant/30 rounded-lg disabled:opacity-50 font-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              &lt;&lt;
            </button>
            <span className="font-label-md text-on-surface-variant font-bold">
              {startIdx}-{endIdx}
            </span>
            <button 
              disabled={shoppers.length < limit}
              onClick={() => setPage(p => p + 1)}
              className="px-3 py-1 bg-surface-container border border-outline-variant/30 rounded-lg disabled:opacity-50 font-label-md text-on-surface transition-colors hover:bg-surface-container-high"
            >
              &gt;&gt;
            </button>
          </div>
        </div>

        {/* Drawer */}
        <AnimatePresence>
          {selectedId && (
            <>
              <motion.div 
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                onClick={closeDrawer}
                className="fixed inset-0 bg-scrim/20 backdrop-blur-sm z-40"
              />
              <motion.div 
                initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-surface-container-lowest border-l border-outline-variant/30 shadow-2xl z-50 flex flex-col"
              >
                <div className="p-6 border-b border-outline-variant/20 flex justify-between items-center bg-surface-container-lowest">
                  <h2 className="font-headline-md text-headline-md text-on-surface">Shopper Profile</h2>
                  <button onClick={closeDrawer} className="p-2 hover:bg-surface-container-low rounded-full transition-colors text-on-surface-variant hover:text-on-surface flex items-center justify-center">
                    <span className="material-symbols-outlined text-[22px]">close</span>
                  </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-8">
                  {loadingDetails || !selectedUser ? (
                    <div className="animate-pulse space-y-6">
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full bg-surface-container-highest"></div>
                        <div className="space-y-3 flex-1"><div className="h-5 bg-surface-container-highest rounded w-1/2"></div><div className="h-4 bg-surface-container-highest rounded w-1/3"></div></div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Header */}
                      <div className="flex items-start gap-5">
                        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center font-headline-xl text-3xl shrink-0">
                          {selectedUser.name.charAt(0)}
                        </div>
                        <div>
                          <h3 className="font-headline-lg text-headline-lg text-on-surface">{selectedUser.name}</h3>
                          <p className="font-label-md text-on-surface-variant flex items-center gap-1 mt-1"><span className="material-symbols-outlined text-[16px]">location_on</span> {selectedUser.city}</p>
                          <div className="flex gap-2 mt-3">
                             <span className="text-[10px] font-bold uppercase tracking-wider bg-sage/15 text-sage border border-sage/20 px-2 py-0.5 rounded shadow-sm">{selectedUser.lifecycle_stage}</span>
                             <span className="text-[10px] font-bold uppercase tracking-wider bg-surface-container-highest border border-outline-variant/30 text-on-surface-variant px-2 py-0.5 rounded shadow-sm">{selectedUser.persona}</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-surface-container-low/50 p-5 rounded-xl border border-outline-variant/20 shadow-sm">
                          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Total Spent</p>
                          <p className="font-headline-md text-headline-md text-on-surface">₹{selectedUser.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="bg-surface-container-low/50 p-5 rounded-xl border border-outline-variant/20 shadow-sm">
                          <p className="font-label-sm text-on-surface-variant uppercase tracking-wider mb-2">Orders</p>
                          <p className="font-headline-md text-headline-md text-on-surface">{selectedUser.order_count}</p>
                        </div>
                      </div>

                      {/* Order History */}
                      <div>
                        <h4 className="font-headline-sm text-headline-sm text-on-surface mb-4 flex items-center gap-2">
                          <span className="material-symbols-outlined text-primary">local_mall</span> Order History
                        </h4>
                        <div className="space-y-3">
                          {orders.length > 0 ? orders.map(order => (
                            <div key={order.id} className="bg-surface-container-lowest border border-outline-variant/30 p-4 rounded-xl shadow-sm flex justify-between items-center glass-effect">
                              <div>
                                <p className="font-headline-sm text-on-surface text-[15px]">{order.product}</p>
                                <p className="font-label-sm text-on-surface-variant mt-1 flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[14px]">calendar_today</span> {new Date(order.ordered_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-headline-sm text-on-surface">₹{order.amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                                {order.is_subscription && <span className="text-[10px] bg-success/15 text-success px-1.5 py-0.5 rounded ml-1 font-bold uppercase tracking-wider shadow-sm">Sub</span>}
                              </div>
                            </div>
                          )) : (
                            <p className="font-label-md text-on-surface-variant">No orders found.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
