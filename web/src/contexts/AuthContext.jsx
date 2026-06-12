import { createContext, useContext, useState, useEffect } from "react";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(
    localStorage.getItem("brewhaus_auth") === "true"
  );

  const login = (email, password) => {
    // Demo login validation
    if (email === "marketer@brewhaus.coffee" && password === "brewhaus") {
      setIsAuthenticated(true);
      localStorage.setItem("brewhaus_auth", "true");
      return true;
    }
    return false;
  };

  const logout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem("brewhaus_auth");
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
