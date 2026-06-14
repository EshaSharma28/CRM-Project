import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import FloatingAgent from "./FloatingAgent";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navCategories = [
    {
      title: "Main Menu",
      items: [
        { to: "/", icon: "dashboard", label: "Dashboard" },
        { to: "/analytics", icon: "analytics", label: "Analytics Studio" },
      ]
    },
    {
      title: "Intelligence",
      items: [
        { to: "/crema", icon: "smart_toy", label: "Goal with crema" },
        { to: "/agent", icon: "precision_manufacturing", label: "Autonomous Agent" },
      ]
    },
    {
      title: "Growth",
      items: [
        { to: "/automations", icon: "settings_suggest", label: "Automations" },
        { to: "/audiences", icon: "groups", label: "Audiences" },
        { to: "/campaigns", icon: "campaign", label: "Campaigns" },
        { to: "/shoppers", icon: "shopping_basket", label: "Shoppers" },
        { to: "/activity", icon: "history", label: "Activity" },
      ]
    }
  ];

  return (
    <>
      <AnimatePresence>
        {location.state?.fromLogin && (
          <motion.div
            initial={{ opacity: 1 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeInOut", delay: 0.2 }}
            onAnimationComplete={() => {
              window.history.replaceState({}, document.title);
            }}
            className="fixed inset-0 z-[100] bg-[#3E2723] pointer-events-none"
          />
        )}
      </AnimatePresence>
      <div className="flex h-screen bg-background overflow-hidden text-on-surface">
        {/* Sidebar */}
        <aside className="w-64 flex-shrink-0 bg-surface-container-low border-r border-outline-variant flex flex-col transition-all z-50">
          {/* Brand Header */}
          <div className="flex flex-col p-6 gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-container flex items-center justify-center rounded-lg">
                <span className="material-symbols-outlined text-on-primary-container font-bold">coffee</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-md text-headline-md font-bold text-primary tracking-tight">Brewhaus</span>
              </div>
            </div>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 overflow-y-auto px-4 scrollbar-hide space-y-1">
            {navCategories.map((cat, idx) => (
              <div key={idx} className="mb-4">
                <p className="px-4 py-2 font-label-sm text-label-sm text-outline uppercase tracking-wider">{cat.title}</p>
                {cat.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      clsx(
                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group relative",
                        isActive
                          ? "bg-secondary-container text-on-secondary-container font-bold sidebar-item-active shadow-sm"
                          : "text-on-surface-variant hover:bg-surface-container-high"
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <span 
                          className={clsx("material-symbols-outlined", !isActive && "group-hover:text-primary")}
                          style={isActive ? { fontVariationSettings: "'FILL' 1" } : {}}
                        >
                          {item.icon}
                        </span>
                        <span className="font-label-md text-label-md">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            ))}
          </nav>

          {/* Footer Section */}
          <div className="p-4 border-t border-outline-variant bg-surface-container mt-auto">
            <div className="flex flex-col gap-1 mb-4">
              <button className="flex items-center gap-3 px-4 py-2 text-on-surface-variant hover:bg-surface-container-high rounded-lg transition-all group w-full text-left">
                <span className="material-symbols-outlined text-lg">settings</span>
                <span className="font-label-md text-label-md">Settings</span>
              </button>
            </div>
            
            {/* Profile Info */}
            <div className="flex items-center justify-between p-2 bg-surface-container-lowest rounded-xl border border-outline-variant/30">
              <div className="flex items-center gap-3">
                <div className="flex flex-col ml-2">
                  <span className="font-label-md text-label-md font-bold text-on-surface">Marketer</span>
                  <span className="font-label-sm text-[10px] text-outline truncate w-24">marketer@brewhaus.com</span>
                </div>
              </div>
              <button onClick={handleLogout} className="p-2 hover:bg-error-container hover:text-on-error-container rounded-lg transition-colors group" title="Sign Out">
                <span className="material-symbols-outlined text-lg">logout</span>
              </button>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
          <div className="flex-1 overflow-y-auto bg-background">
            <AnimatePresence mode="wait">
              <motion.div
                key={location.pathname}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.2 }}
                className="min-h-full"
              >
                <Outlet />
              </motion.div>
            </AnimatePresence>
          </div>
        </main>

        <FloatingAgent />
      </div>
    </>
  );
}
