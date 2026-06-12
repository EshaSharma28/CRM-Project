import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  Send,
  UserRound,
  Activity,
  LogOut,
  Menu,
  Coffee,
} from "lucide-react";
import { useAuth } from "../auth/AuthContext";

const NAV = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/copilot", label: "Campaign co-pilot", icon: Sparkles, star: true },
  { to: "/audiences", label: "Audiences", icon: Users },
  { to: "/campaigns", label: "Campaigns", icon: Send },
  { to: "/shoppers", label: "Shoppers", icon: UserRound },
  { to: "/activity", label: "Channel activity", icon: Activity },
];

const TITLES = {
  "/": ["Dashboard", "Your shopper base at a glance"],
  "/copilot": ["Campaign co-pilot", "Describe a goal — the AI does the rest"],
  "/audiences": ["Audiences", "Carve out shoppers by behaviour & attributes"],
  "/campaigns": ["Campaigns", "Every send and how it performed"],
  "/shoppers": ["Shoppers", "Browse and understand individual customers"],
  "/activity": ["Channel activity", "Live delivery & engagement events"],
};

export default function Layout() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const key = pathname.startsWith("/campaigns/") ? "/campaigns" : pathname;
  const [title, sub] = TITLES[key] || ["", ""];
  const initials = (user?.name || "U").split(" ").map((s) => s[0]).join("").slice(0, 2);

  return (
    <div className="shell">
      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand">
          <div className="brand-mark">☕</div>
          <div>
            <div className="brand-name">Brewhaus</div>
            <div className="brand-sub">AI-NATIVE CRM</div>
          </div>
        </div>

        <div className="nav-section">Workspace</div>
        {NAV.map(({ to, label, icon: Icon, end, star }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            onClick={() => setOpen(false)}
          >
            <Icon size={18} />
            <span>{label}</span>
            {star && <Sparkles size={13} style={{ marginLeft: "auto", color: "#be7e50" }} />}
          </NavLink>
        ))}

        <div className="nav-spacer" />
        <div className="user-card">
          <div className="avatar">{initials}</div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#f3e7d8" }}>{user?.name}</div>
            <div className="tiny" style={{ color: "#b39f8c", overflow: "hidden", textOverflow: "ellipsis" }}>
              {user?.email}
            </div>
          </div>
          <button className="signout" title="Sign out" onClick={logout}>
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <div className="main">
        <header className="topbar">
          <div className="row">
            <button className="signout menu-btn" onClick={() => setOpen(true)} style={{ color: "#4a3525" }}>
              <Menu size={20} />
            </button>
            <div className="page-title">
              <h1>{title}</h1>
              {sub && <p>{sub}</p>}
            </div>
          </div>
          <div className="row small muted">
            <Coffee size={15} /> Brewhaus Coffee Co.
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
