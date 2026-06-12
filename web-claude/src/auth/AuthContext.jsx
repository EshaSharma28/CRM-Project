import { createContext, useContext, useEffect, useState } from "react";

// Lightweight demo gate — NOT real auth (a conscious scope cut). One demo
// marketer account, persisted in localStorage. Swappable for real SSO later.
const DEMO_USER = { email: "marketer@brewhaus.coffee", name: "Aanya Rao" };
const DEMO_PASSWORD = "brewhaus";

const AuthContext = createContext(null);
const KEY = "brewhaus.session";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  }, [user]);

  function login(email, password) {
    if (email.trim().toLowerCase() === DEMO_USER.email && password === DEMO_PASSWORD) {
      setUser(DEMO_USER);
      return { ok: true };
    }
    return { ok: false, error: "Invalid credentials. Use the demo login." };
  }

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, logout, demo: { email: DEMO_USER.email, password: DEMO_PASSWORD } }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
