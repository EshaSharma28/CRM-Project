import { useState, useEffect, useCallback } from "react";
import { api } from "../api";
import { Search, Filter, X, User, ShoppingBag, Calendar, MapPin } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function Shoppers() {
  const [shoppers, setShoppers] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [stageFilter, setStageFilter] = useState("");
  const [cityFilter, setCityFilter] = useState("");
  
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
      query.append("limit", "50");
      
      const res = await api.customers(`?${query.toString()}`);
      setShoppers(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [stageFilter, cityFilter]);

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
    <div className="max-w-6xl mx-auto relative">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-serif font-bold text-mocha-dark">Shoppers</h1>
          <p className="text-text/60 mt-1">View and filter your customer base.</p>
        </div>
      </div>

      <div className="card p-0 overflow-hidden mb-6">
        <div className="p-4 border-b border-border bg-surface flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-sm font-medium text-mocha">
            <Filter className="w-4 h-4" /> Filters:
          </div>
          
          <select 
            value={stageFilter} 
            onChange={e => setStageFilter(e.target.value)}
            className="input-field py-1.5 w-auto text-sm"
          >
            <option value="">All Lifecycle Stages</option>
            <option value="new">New</option>
            <option value="active">Active</option>
            <option value="at_risk">At Risk</option>
            <option value="lapsed">Lapsed</option>
            <option value="churned">Churned</option>
          </select>
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text/40" />
            <input 
              type="text" 
              placeholder="Filter by city..." 
              value={cityFilter}
              onChange={e => setCityFilter(e.target.value)}
              className="input-field pl-9 py-1.5 text-sm" 
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface/30 text-text/60 text-xs uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4 font-medium">Name</th>
                <th className="px-6 py-4 font-medium">Contact</th>
                <th className="px-6 py-4 font-medium">Stage</th>
                <th className="px-6 py-4 font-medium text-right">Total Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-text/50">Loading...</td></tr>
              ) : shoppers.length > 0 ? shoppers.map(s => (
                <tr 
                  key={s.id} 
                  onClick={() => openDrawer(s.id)}
                  className="hover:bg-surface/50 cursor-pointer transition-colors group"
                >
                  <td className="px-6 py-4">
                    <div className="font-medium text-mocha-dark">{s.name}</div>
                    <div className="text-text/50 text-xs mt-0.5">{s.city}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-text/80">{s.email}</div>
                    <div className="text-text/50 text-xs mt-0.5">{s.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="capitalize bg-surface border border-border px-2 py-1 rounded-md text-xs">{s.lifecycle_stage}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-medium">
                    ₹{s.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="px-6 py-8 text-center text-text/50">No shoppers found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Drawer */}
      <AnimatePresence>
        {selectedId && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={closeDrawer}
              className="fixed inset-0 bg-mocha-dark/20 backdrop-blur-sm z-40"
            />
            <motion.div 
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-full max-w-md bg-background border-l border-border shadow-2xl z-50 flex flex-col"
            >
              <div className="p-6 border-b border-border flex justify-between items-center bg-surface-white">
                <h2 className="font-serif font-bold text-xl">Shopper Profile</h2>
                <button onClick={closeDrawer} className="p-2 hover:bg-surface rounded-full transition-colors text-text/50 hover:text-text">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6">
                {loadingDetails || !selectedUser ? (
                  <div className="animate-pulse space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-surface"></div>
                      <div className="space-y-2 flex-1"><div className="h-4 bg-surface rounded w-1/2"></div><div className="h-3 bg-surface rounded w-1/3"></div></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-8">
                    {/* Header */}
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-caramel/10 text-caramel flex items-center justify-center text-2xl font-serif font-bold">
                        {selectedUser.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-mocha-dark">{selectedUser.name}</h3>
                        <p className="text-text/60 text-sm flex items-center gap-1 mt-1"><MapPin className="w-3 h-3" /> {selectedUser.city}</p>
                        <div className="flex gap-2 mt-2">
                           <span className="text-xs bg-sage/10 text-sage border border-sage/20 px-2 py-0.5 rounded capitalize">{selectedUser.lifecycle_stage}</span>
                           <span className="text-xs bg-surface border border-border px-2 py-0.5 rounded capitalize">{selectedUser.persona}</span>
                        </div>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <p className="text-xs text-text/60 mb-1">Total Spent</p>
                        <p className="text-xl font-bold font-serif text-mocha-dark">₹{selectedUser.total_spent.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                      </div>
                      <div className="bg-surface p-4 rounded-xl border border-border">
                        <p className="text-xs text-text/60 mb-1">Orders</p>
                        <p className="text-xl font-bold font-serif text-mocha-dark">{selectedUser.order_count}</p>
                      </div>
                    </div>

                    {/* Order History */}
                    <div>
                      <h4 className="font-serif font-bold text-lg mb-4 flex items-center gap-2">
                        <ShoppingBag className="w-5 h-5 text-caramel" /> Order History
                      </h4>
                      <div className="space-y-3">
                        {orders.length > 0 ? orders.map(order => (
                          <div key={order.id} className="bg-white border border-border p-3 rounded-xl shadow-sm flex justify-between items-center">
                            <div>
                              <p className="font-medium text-mocha-dark text-sm">{order.product}</p>
                              <p className="text-xs text-text/50 mt-0.5 flex items-center gap-1">
                                <Calendar className="w-3 h-3" /> {new Date(order.ordered_at).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-sm">₹{order.amount.toLocaleString("en-IN", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                              {order.is_subscription && <span className="text-[10px] bg-success/10 text-success px-1.5 py-0.5 rounded ml-1">Sub</span>}
                            </div>
                          </div>
                        )) : (
                          <p className="text-sm text-text/50">No orders found.</p>
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
  );
}
