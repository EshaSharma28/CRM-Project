import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { Coffee, LayoutDashboard, Users, Megaphone, Activity, Bot, LogOut, Upload, Search, Sparkles, TrendingUp, Zap } from "lucide-react";
import clsx from "clsx";
import FloatingAgent from "./FloatingAgent";

export default function Layout() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const navItems = [
    { to: "/", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/analytics", icon: TrendingUp, label: "Analytics Studio", showcase: true },
    { to: "/copilot", icon: Bot, label: "Copilot", showcase: true },
    { to: "/agent", icon: Sparkles, label: "Autonomous agent", showcase: true },
    { to: "/automations", icon: Zap, label: "Automations", showcase: true },
    { to: "/audiences", icon: Users, label: "Audiences" },
    { to: "/campaigns", icon: Megaphone, label: "Campaigns" },
    { to: "/shoppers", icon: Users, label: "Shoppers" },
    { to: "/activity", icon: Activity, label: "Activity" },
  ];

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 flex-shrink-0 bg-surface-white border-r border-border flex flex-col transition-all">
        <div className="p-6 flex items-center gap-3 border-b border-border">
          <div className="text-caramel bg-caramel/10 p-2 rounded-xl">
            <Coffee className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-serif font-bold text-lg text-mocha-dark leading-tight">Brewhaus</h1>
            <p className="text-xs text-sage">CRM</p>
          </div>
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors relative",
                  isActive
                    ? "bg-caramel/10 text-caramel"
                    : "text-text hover:bg-surface"
                )
              }
            >
              <item.icon className="w-5 h-5" />
              {item.label}
              {item.showcase && (
                <span className="ml-auto text-xs bg-gradient-to-r from-caramel to-warning text-white px-2 py-0.5 rounded-full font-bold shadow-sm flex items-center gap-1">
                  <span className="text-[10px]">✦</span> AI
                </span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className="bg-surface rounded-xl p-3 flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-sage/20 flex items-center justify-center text-sage font-bold text-xs">
                M
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-medium truncate">Marketer</p>
                <p className="text-xs text-text/60 truncate">Demo Account</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center gap-2 text-error hover:bg-error/10 py-2 rounded-lg text-sm font-medium transition-colors mt-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-background p-6">
          <Outlet />
        </div>
      </main>

      <FloatingAgent />
    </div>
  );
}
