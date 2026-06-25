import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLES = ["Civil", "Politie", "Mecanic", "Pompier", "Medic"];
const inp = { width: "100%", display: "block", background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: "11px 14px", color: "#fff", fontSize: 14, marginBottom: 10, fontFamily: "inherit" };

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", displayName: "", password: "", role: "Civil" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        await register({ username: form.username, displayName: form.displayName, password: form.password, role: form.role });
      }
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.message || "A apărut o eroare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d0d", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <div style={{ fontSize: 52, marginBottom: 8 }}>🌴</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: "#fff", letterSpacing: -1 }}>TROPICAL</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#e91e8c", letterSpacing: 4 }}>ROMÂNIA ROLEPLAY</div>
          <div style={{ fontSize: 13, color: "#555", marginTop: 6 }}>Comunitatea ta de roleplay</div>
        </div>

        <div style={{ background: "#1a1a1a", borderRadius: 16, padding: "2rem", border: "1px solid #2a2a2a" }}>
          <div style={{ display: "flex", gap: 0, marginBottom: "1.5rem", background: "#111", borderRadius: 10, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }}
                style={{ flex: 1, padding: "9px 0", borderRadius: 8, border: "none", background: mode === m ? "#e91e8c" : "transparent", color: mode === m ? "#fff" : "#666", fontWeight: 600, cursor: "pointer", fontSize: 14 }}>
                {m === "login" ? "Conectare" : "Înregistrare"}
              </button>
            ))}
          </div>

          <input placeholder="Username" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} style={inp} autoComplete="username" />

          {mode === "register" && (
            <input placeholder="Nume afișat (ex: Andrei)" value={form.displayName} onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))} style={inp} />
          )}

          <input placeholder="Parolă" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handleSubmit()} style={inp} autoComplete="current-password" />

          {mode === "register" && (
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ ...inp, color: "#fff" }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}

          {error && <p style={{ color: "#e91e8c", fontSize: 13, marginBottom: 10, textAlign: "center" }}>{error}</p>}

          <button onClick={handleSubmit} disabled={loading}
            style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Se încarcă..." : mode === "login" ? "Conectează-te" : "Creează cont"}
          </button>

          {mode === "register" && (
            <p style={{ fontSize: 11, color: "#444", textAlign: "center", marginTop: 12 }}>
              Primul cont creat primește automat drepturi de admin 👑
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
