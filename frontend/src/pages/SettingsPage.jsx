import { useState } from "react";
import { useTheme, THEMES } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import api from "../api";

export default function SettingsPage() {
  const { theme, themeKey, setTheme } = useTheme();
  const { user, updateUser } = useAuth();
  const [saved, setSaved] = useState(false);
  const [notifSettings, setNotifSettings] = useState({
    notifLikes: user?.notifLikes !== false,
    notifComments: user?.notifComments !== false,
    notifFollows: user?.notifFollows !== false,
  });
  const [saving, setSaving] = useState(false);

  // 🔐 2FA
  const [twoFAEnabled, setTwoFAEnabled] = useState(!!user?.twoFactorEnabled);
  const [setup2FA, setSetup2FA] = useState(null); // { secret, qrCode } cât timp e în curs de activare
  const [confirmCode, setConfirmCode] = useState("");
  const [backupCodes, setBackupCodes] = useState(null); // codurile arătate o singură dată
  const [disablePassword, setDisablePassword] = useState("");
  const [showDisableBox, setShowDisableBox] = useState(false);
  const [twoFAError, setTwoFAError] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);

  const startSetup2FA = async () => {
    setTwoFAError("");
    setTwoFALoading(true);
    try {
      const res = await api.post("/auth/2fa/setup");
      setSetup2FA(res.data);
    } catch (err) {
      setTwoFAError(err.response?.data?.message || "Eroare la pornirea setup-ului");
    }
    setTwoFALoading(false);
  };

  const confirmEnable2FA = async () => {
    setTwoFAError("");
    if (!confirmCode.trim()) return setTwoFAError("Introdu codul generat de aplicație");
    setTwoFALoading(true);
    try {
      const res = await api.post("/auth/2fa/enable", { code: confirmCode.trim() });
      setBackupCodes(res.data.backupCodes);
      setTwoFAEnabled(true);
      updateUser({ twoFactorEnabled: true });
      setSetup2FA(null);
      setConfirmCode("");
    } catch (err) {
      setTwoFAError(err.response?.data?.message || "Cod incorect");
    }
    setTwoFALoading(false);
  };

  const disable2FA = async () => {
    setTwoFAError("");
    if (!disablePassword.trim()) return setTwoFAError("Introdu parola pentru confirmare");
    setTwoFALoading(true);
    try {
      await api.post("/auth/2fa/disable", { password: disablePassword.trim() });
      setTwoFAEnabled(false);
      updateUser({ twoFactorEnabled: false });
      setShowDisableBox(false);
      setDisablePassword("");
      setBackupCodes(null);
    } catch (err) {
      setTwoFAError(err.response?.data?.message || "Parolă incorectă");
    }
    setTwoFALoading(false);
  };

  const handleThemeChange = (key) => {
    setTheme(key);
    setSaved(false);
  };

  const handleSaveNotifs = async () => {
    setSaving(true);
    try {
      const res = await api.put("/users/me/settings", notifSettings);
      updateUser(notifSettings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {}
    setSaving(false);
  };

  const card = {
    background: theme.surface,
    border: `1px solid ${theme.border}`,
    borderRadius: 16,
    padding: "20px 24px",
    marginBottom: 16,
  };

  const sectionTitle = {
    fontWeight: 700,
    fontSize: 15,
    marginBottom: 16,
    color: theme.text,
    display: "flex",
    alignItems: "center",
    gap: 8,
  };

  return (
    <div style={{ padding: "20px 16px", maxWidth: 600, margin: "0 auto" }}>
      <h2 style={{ fontWeight: 800, fontSize: 20, marginBottom: 20, color: theme.text }}>
        ⚙️ Setări
      </h2>

      {/* THEME SELECTOR */}
      <div style={card}>
        <div style={sectionTitle}>🎨 Temă</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {Object.entries(THEMES).map(([key, t]) => {
            const active = themeKey === key;
            return (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "12px 14px",
                  borderRadius: 12,
                  border: active ? `2px solid ${t.accent}` : `2px solid ${theme.border}`,
                  background: active ? t.bg : theme.surface2,
                  cursor: "pointer",
                  transition: "all 0.18s",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                {/* mini preview */}
                <div style={{
                  width: 36,
                  height: 36,
                  borderRadius: 8,
                  background: t.bg,
                  border: `2px solid ${t.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 18,
                  flexShrink: 0,
                }}>
                  {t.emoji}
                </div>
                <div style={{ textAlign: "left" }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: active ? t.accent : theme.text }}>
                    {t.name}
                  </div>
                  <div style={{ width: 32, height: 4, borderRadius: 2, background: t.accent, marginTop: 4 }} />
                </div>
                {active && (
                  <div style={{
                    position: "absolute",
                    top: 6,
                    right: 8,
                    width: 18,
                    height: 18,
                    borderRadius: "50%",
                    background: t.accent,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 10,
                    color: "#fff",
                    fontWeight: 700,
                  }}>✓</div>
                )}
              </button>
            );
          })}
        </div>

        {/* Live preview */}
        <div style={{
          marginTop: 16,
          padding: "12px 16px",
          borderRadius: 12,
          background: theme.surface2,
          border: `1px solid ${theme.border}`,
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: theme.accent, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>👤</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 13, color: theme.text }}>Previzualizare temă</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>Aplicată instant ✓</div>
          </div>
          <button style={{ padding: "6px 14px", borderRadius: 20, background: theme.accent, border: "none", color: "#fff", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            Like
          </button>
        </div>
      </div>

      {/* NOTIFICĂRI */}
      <div style={card}>
        <div style={sectionTitle}>🔔 Notificări</div>
        {[
          { key: "notifLikes", label: "Notifică la like-uri", icon: "❤️" },
          { key: "notifComments", label: "Notifică la comentarii", icon: "💬" },
          { key: "notifFollows", label: "Notifică la urmăritori noi", icon: "👤" },
        ].map(({ key, label, icon }) => (
          <div key={key} style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 0",
            borderBottom: `1px solid ${theme.border}`,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: theme.text, fontSize: 14 }}>
              <span>{icon}</span> {label}
            </div>
            <div
              onClick={() => setNotifSettings(prev => ({ ...prev, [key]: !prev[key] }))}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                background: notifSettings[key] ? theme.accent : theme.surface2,
                border: `1px solid ${theme.border}`,
                cursor: "pointer",
                position: "relative",
                transition: "background 0.2s",
              }}
            >
              <div style={{
                position: "absolute",
                top: 3,
                left: notifSettings[key] ? 22 : 3,
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#fff",
                transition: "left 0.2s",
                boxShadow: "0 1px 4px #0003",
              }} />
            </div>
          </div>
        ))}
        <button
          onClick={handleSaveNotifs}
          disabled={saving}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "10px",
            borderRadius: 10,
            background: saved ? "#2ecc71" : theme.accent,
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            cursor: saving ? "not-allowed" : "pointer",
            transition: "background 0.3s",
          }}
        >
          {saved ? "✓ Salvat!" : saving ? "Se salvează..." : "Salvează preferințe"}
        </button>
      </div>

      {/* SECURITATE — 2FA */}
      <div style={card}>
        <div style={sectionTitle}>🔐 Securitate</div>

        {backupCodes ? (
          <div style={{ background: theme.surface2, border: `1px solid ${theme.accent}`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: theme.text, marginBottom: 6 }}>
              ✓ 2FA activat! Salvează aceste coduri de backup:
            </div>
            <div style={{ fontSize: 12, color: theme.textMuted, marginBottom: 10 }}>
              Fiecare cod poate fi folosit o singură dată, dacă îți pierzi accesul la aplicația de autentificare. Nu vor mai fi arătate din nou.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, fontFamily: "monospace", fontSize: 13, color: theme.accent }}>
              {backupCodes.map(c => (
                <div key={c} style={{ background: theme.surface, padding: "6px 8px", borderRadius: 6, textAlign: "center" }}>{c}</div>
              ))}
            </div>
            <button
              onClick={() => setBackupCodes(null)}
              style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 8, background: theme.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              Le-am salvat, ascunde
            </button>
          </div>
        ) : setup2FA ? (
          <div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
              Scanează codul QR cu Google Authenticator, Authy sau altă aplicație TOTP, apoi introdu codul generat pentru confirmare.
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
              <img src={setup2FA.qrCode} alt="QR 2FA" style={{ width: 160, height: 160, borderRadius: 8, background: "#fff", padding: 8 }} />
            </div>
            <div style={{ fontSize: 11, color: theme.textFaint, textAlign: "center", marginBottom: 12 }}>
              Nu poți scana? Introdu manual: <span style={{ fontFamily: "monospace", color: theme.text }}>{setup2FA.secret}</span>
            </div>
            <input
              placeholder="Cod din aplicație (6 cifre)"
              value={confirmCode}
              onChange={e => setConfirmCode(e.target.value)}
              style={{
                width: "100%", boxSizing: "border-box", textAlign: "center", letterSpacing: 4, fontSize: 16,
                background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px",
                color: theme.text, marginBottom: 10,
              }}
            />
            {twoFAError && <div style={{ color: "#e91e8c", fontSize: 12, marginBottom: 10, textAlign: "center" }}>⚠️ {twoFAError}</div>}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={confirmEnable2FA}
                disabled={twoFALoading}
                style={{ flex: 1, padding: "10px", borderRadius: 8, background: theme.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
              >
                {twoFALoading ? "Se verifică..." : "Confirmă și activează"}
              </button>
              <button
                onClick={() => { setSetup2FA(null); setConfirmCode(""); setTwoFAError(""); }}
                style={{ padding: "10px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Anulează
              </button>
            </div>
          </div>
        ) : twoFAEnabled ? (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2ecc71" }} />
              <span style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>2FA este activat pe contul tău</span>
            </div>
            {!showDisableBox ? (
              <button
                onClick={() => setShowDisableBox(true)}
                style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
              >
                Dezactivează 2FA
              </button>
            ) : (
              <div>
                <input
                  type="password"
                  placeholder="Parola curentă, pentru confirmare"
                  value={disablePassword}
                  onChange={e => setDisablePassword(e.target.value)}
                  style={{
                    width: "100%", boxSizing: "border-box",
                    background: theme.surface2, border: `1px solid ${theme.border}`, borderRadius: 10, padding: "10px 14px",
                    color: theme.text, marginBottom: 10, fontSize: 13,
                  }}
                />
                {twoFAError && <div style={{ color: "#e91e8c", fontSize: 12, marginBottom: 10 }}>⚠️ {twoFAError}</div>}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={disable2FA}
                    disabled={twoFALoading}
                    style={{ flex: 1, padding: "9px", borderRadius: 8, background: "#e74c3c", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                  >
                    {twoFALoading ? "Se dezactivează..." : "Confirmă dezactivarea"}
                  </button>
                  <button
                    onClick={() => { setShowDisableBox(false); setDisablePassword(""); setTwoFAError(""); }}
                    style={{ padding: "9px 16px", borderRadius: 8, background: "transparent", border: `1px solid ${theme.border}`, color: theme.textMuted, fontWeight: 600, fontSize: 13, cursor: "pointer" }}
                  >
                    Renunță
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            <div style={{ fontSize: 13, color: theme.textMuted, marginBottom: 12 }}>
              Adaugă un nivel extra de securitate: la conectare vei avea nevoie și de un cod generat de o aplicație de autentificare (Google Authenticator, Authy etc).
            </div>
            {twoFAError && <div style={{ color: "#e91e8c", fontSize: 12, marginBottom: 10 }}>⚠️ {twoFAError}</div>}
            <button
              onClick={startSetup2FA}
              disabled={twoFALoading}
              style={{ padding: "10px 18px", borderRadius: 8, background: theme.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
            >
              {twoFALoading ? "Se generează..." : "Activează 2FA"}
            </button>
          </div>
        )}
      </div>

      {/* CONT */}
      <div style={card}>
        <div style={sectionTitle}>👤 Cont</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 0" }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: theme.text, fontWeight: 600 }}>{user?.displayName || user?.username}</div>
            <div style={{ fontSize: 12, color: theme.textMuted }}>@{user?.username}</div>
          </div>
          <div style={{ fontSize: 11, padding: "4px 10px", borderRadius: 20, background: theme.surface2, color: theme.textMuted, border: `1px solid ${theme.border}` }}>
            {user?.role || "Civil"}
          </div>
        </div>
        <div style={{ fontSize: 12, color: theme.textFaint, marginTop: 8 }}>
          Tema curentă: <b style={{ color: theme.accent }}>{THEMES[themeKey]?.emoji} {THEMES[themeKey]?.name}</b> — salvată automat în browser.
        </div>
      </div>
    </div>
  );
}
