import { createContext, useContext, useState, useEffect } from "react";
import api from "../api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("trp_user")); } catch { return null; }
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("trp_token");
    if (token) {
      api.get("/auth/me")
        .then(res => {
          setUser(res.data);
          localStorage.setItem("trp_user", JSON.stringify(res.data));
        })
        .catch(() => {
          // Token expirat sau invalid — curăță și rămâi pe pagina curentă
          localStorage.removeItem("trp_token");
          localStorage.removeItem("trp_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // 🟢 Ping lastSeen la fiecare 2 minute cât timp userul e logat
  useEffect(() => {
    if (!user) return;
    const ping = () => api.post("/users/me/ping").catch(() => {});
    ping(); // immediate
    const interval = setInterval(ping, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?._id]);

  const login = async (username, password) => {
    const res = await api.post("/auth/login", { username, password });
    // 🔐 Dacă userul are 2FA activat, backend-ul nu trimite token-ul final,
    // ci doar un tempToken — pasul 2 se face cu verify2FALogin()
    if (res.data.requires2FA) {
      return { requires2FA: true, tempToken: res.data.tempToken };
    }
    localStorage.setItem("trp_token", res.data.token);
    localStorage.setItem("trp_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  // 🔐 Pasul 2 al login-ului cu 2FA: trimite codul din aplicația de autentificare (sau un cod de backup)
  const verify2FALogin = async (tempToken, code) => {
    const res = await api.post("/auth/2fa/verify-login", { tempToken, code });
    localStorage.setItem("trp_token", res.data.token);
    localStorage.setItem("trp_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const register = async (data) => {
    const res = await api.post("/auth/register", data);
    localStorage.setItem("trp_token", res.data.token);
    localStorage.setItem("trp_user", JSON.stringify(res.data.user));
    setUser(res.data.user);
    return res.data.user;
  };

  const logout = () => {
    localStorage.removeItem("trp_token");
    localStorage.removeItem("trp_user");
    setUser(null);
  };

  const updateUser = (data) => {
    const updated = { ...user, ...data };
    setUser(updated);
    localStorage.setItem("trp_user", JSON.stringify(updated));
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, updateUser, verify2FALogin }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
