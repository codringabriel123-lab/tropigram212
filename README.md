import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

const ROLES = ["Civil", "Politie", "Mecanic", "Pompier", "Medic"];

const inp = {
  width: "100%",
  display: "block",
  background: "#111",
  border: "1px solid #2a2a2a",
  borderRadius: 10,
  padding: "11px 14px",
  color: "#fff",
  fontSize: 14,
  marginBottom: 10,
  fontFamily: "inherit",
  boxSizing: "border-box",
};

export default function AuthPage() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", displayName: "", password: "", role: "Civil" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.username.trim()) return setError("Completează username-ul");
    if (!form.password.trim()) return setError("Completează parola");
    if (mode === "register" && !form.displayName.trim()) return setError("Completează numele afișat");
    if (mode === "register" && form.password.length < 6) return setError("Parola trebuie să aibă minim 6 caractere");

    setLoading(true);
    try {
      if (mode === "login") {
        await login(form.username, form.password);
      } else {
        await register({
          username: form.username,
          displayName: form.displayName,
          password: form.password,
          role: form.role,
        });
      }
      navigate("/");
    } catch (err) {
      const msg = err.response?.data?.message;
      if (msg === "Username sau parolă greșite") {
        setError("Username sau parolă incorecte. Verifică și încearcă din nou.");
      } else if (msg === "Username-ul este deja folosit") {
        setError("Acest username este deja folosit. Alege altul.");
      } else if (msg?.includes("banat")) {
        setError(msg);
      } else {
        setError(msg || "A apărut o eroare. Încearcă din nou.");
      }
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

          <input
            placeholder="Username"
            value={form.username}
            onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
            style={inp}
            autoComplete="username"
          />

          {mode === "register" && (
            <input
              placeholder="Nume afișat (ex: Andrei)"
              value={form.displayName}
              onChange={e => setForm(p => ({ ...p, displayName: e.target.value }))}
              style={inp}
            />
          )}

          {/* Parolă cu show/hide */}
          <div style={{ position: "relative", marginBottom: 10 }}>
            <input
              placeholder="Parolă"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handleSubmit()}
              style={{ ...inp, marginBottom: 0, paddingRight: 44 }}
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#666", cursor: "pointer", fontSize: 16, padding: 0 }}
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {mode === "register" && (
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))} style={{ ...inp, color: "#fff" }}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          )}

          {error && (
            <div style={{ background: "#2a1a1a", border: "1px solid #e91e8c44", borderRadius: 8, padding: "10px 12px", marginBottom: 12 }}>
              <p style={{ color: "#e91e8c", fontSize: 13, margin: 0, textAlign: "center" }}>⚠️ {error}</p>
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, fontSize: 15, cursor: "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Se încarcă..." : mode === "login" ? "Conectează-te" : "Creează cont"}
          </button>

          {mode === "login" && (
            <div style={{ marginTop: 14, textAlign: "center", background: "#111", borderRadius: 8, padding: "10px 14px", border: "1px solid #2a2a2a" }}>
              <p style={{ fontSize: 12, color: "#555", margin: 0 }}>
                🔑 Ai uitat parola? Contactează un <span style={{ color: "#e91e8c" }}>admin</span> pe Discord sau în joc — el îți poate reseta parola din panelul de administrare.
              </p>
            </div>
          )}

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
