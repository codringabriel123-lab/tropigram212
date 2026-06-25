import { useState, useEffect } from "react";
import api from "../api";
import Avatar from "../components/Avatar";

const DURATIONS = [
  { value: "1h", label: "1 oră" },
  { value: "24h", label: "24 ore" },
  { value: "7zile", label: "7 zile" },
  { value: "permanent", label: "Permanent" },
];

const ACTION_LABELS = {
  ban: { label: "Ban", icon: "🚫", color: "#e74c3c" },
  unban: { label: "Unban", icon: "✅", color: "#2ecc71" },
  mute: { label: "Mute", icon: "🔇", color: "#f39c12" },
  unmute: { label: "Unmute", icon: "🔊", color: "#2ecc71" },
  "toggle-admin": { label: "Toggle admin", icon: "👑", color: "#e91e8c" },
  "delete-post": { label: "Șterge postare", icon: "🗑️", color: "#e74c3c" },
  "restore-post": { label: "Restaurează postare", icon: "♻️", color: "#2ecc71" },
  "delete-comment": { label: "Șterge comentariu", icon: "💬", color: "#e74c3c" },
  "verify": { label: "Verificat", icon: "✅", color: "#1da1f2" },
  "unverify": { label: "Verificare eliminată", icon: "❌", color: "#888" },
};

// Modal simplu pentru alegerea motivului + duratei (folosit pentru ban și mute)
function DurationModal({ title, color, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("24h");

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 20, width: "100%", maxWidth: 360, border: "1px solid #2a2a2a" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 14, color }}>{title}</div>

        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Durată</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {DURATIONS.map(d => (
            <button key={d.value} onClick={() => setDuration(d.value)}
              style={{
                padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer",
                border: `1px solid ${duration === d.value ? color : "#333"}`,
                background: duration === d.value ? color : "transparent",
                color: duration === d.value ? "#fff" : "#888",
              }}>
              {d.label}
            </button>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Motiv</div>
        <textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Motiv (opțional)"
          rows={3}
          style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, color: "#fff", fontSize: 13, boxSizing: "border-box", resize: "vertical", marginBottom: 16 }}
        />

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
            Anulează
          </button>
          <button onClick={() => onConfirm({ reason, duration })}
            style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: color, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
            Confirmă
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [tab, setTab] = useState("stats");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // { type: "ban" | "mute", userId, username }

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "users") {
      api.get(`/admin/users?search=${encodeURIComponent(search)}`).then(r => setUsers(r.data.users));
    }
    if (tab === "audit") {
      api.get("/admin/audit-log").then(r => setLogs(r.data.logs));
    }
  }, [tab, search]);

  const handleBanConfirm = async ({ reason, duration }) => {
    const { userId } = modal;
    try {
      const r = await api.put(`/admin/users/${userId}/ban`, { reason: reason || "Motiv nespecificat", duration });
      setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    } finally {
      setModal(null);
    }
  };

  const handleMuteConfirm = async ({ reason, duration }) => {
    const { userId } = modal;
    try {
      const r = await api.put(`/admin/users/${userId}/mute`, { reason: reason || "Motiv nespecificat", duration });
      setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    } finally {
      setModal(null);
    }
  };

  const handleUnban = async (userId) => {
    try {
      const r = await api.put(`/admin/users/${userId}/unban`);
      setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u));
    } catch {}
  };

  const handleUnmute = async (userId) => {
    try {
      const r = await api.put(`/admin/users/${userId}/unmute`);
      setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u));
    } catch {}
  };

  const handleToggleVerify = async (userId, username, currentVerified) => {
    const action = currentVerified ? "Elimini verificarea" : "Verifici";
    if (!window.confirm(`${action} contul lui ${username}?`)) return;
    try {
      const r = await api.put(`/admin/users/${userId}/toggle-verify`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isVerified: r.data.user.isVerified } : u));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  const handleToggleAdmin = async (userId, username) => {    if (!window.confirm(`Modifici rolul de admin pentru ${username}?`)) return;
    try {
      await api.put(`/admin/users/${userId}/toggle-admin`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isAdmin: !u.isAdmin } : u));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16, color: "#e91e8c" }}>⚙️ Panel Admin</div>

      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { key: "stats", label: "📊 Statistici" },
          { key: "users", label: "👥 Useri" },
          { key: "audit", label: "📜 Audit Log" },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${tab === t.key ? "#e91e8c" : "#333"}`, background: tab === t.key ? "#e91e8c" : "transparent", color: tab === t.key ? "#fff" : "#888", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "stats" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
            {[
              { label: "Total Useri", value: stats.totalUsers, icon: "👥", color: "#4a90e2" },
              { label: "Total Postări", value: stats.totalPosts, icon: "📝", color: "#e91e8c" },
              { label: "Useri Banați", value: stats.bannedUsers, icon: "🚫", color: "#e74c3c" },
              { label: "Useri pe Mute", value: stats.mutedUsers, icon: "🔇", color: "#f39c12" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1a1a1a", borderRadius: 12, padding: "16px", border: "1px solid #2a2a2a" }}>
                <div style={{ fontSize: 24, marginBottom: 4 }}>{s.icon}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ fontWeight: 700, marginBottom: 10 }}>Ultimii useri înregistrați</div>
          {stats.recentUsers?.map(u => (
            <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #1a1a1a" }}>
              <Avatar user={u} size={36} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{new Date(u.createdAt).toLocaleDateString("ro-RO")}</div>
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
                {u.isBanned && <span style={{ fontSize: 11, color: "#e74c3c", background: "#2a1a1a", padding: "2px 8px", borderRadius: 20 }}>BANAT</span>}
                {u.isMuted && <span style={{ fontSize: 11, color: "#f39c12", background: "#2a2317", padding: "2px 8px", borderRadius: 20 }}>MUTE</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div>
          <input
            placeholder="Caută useri..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, marginBottom: 16, boxSizing: "border-box" }}
          />
          {users.map(u => (
            <div key={u._id} style={{ background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #2a2a2a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <Avatar user={u} size={38} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {u.username}
                    {u.isVerified && <span style={{ marginLeft: 6, fontSize: 10, color: "#1da1f2" }}>✓ VERIFICAT</span>}
                    {u.isAdmin && <span style={{ marginLeft: 6, fontSize: 10, color: "#e91e8c" }}>👑 ADMIN</span>}
                    {u.isBanned && <span style={{ marginLeft: 6, fontSize: 10, color: "#e74c3c" }}>🚫 BANAT</span>}
                    {u.isMuted && <span style={{ marginLeft: 6, fontSize: 10, color: "#f39c12" }}>🔇 MUTE</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>{u.role} • {new Date(u.createdAt).toLocaleDateString("ro-RO")}</div>
                  {u.isBanned && (
                    <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 2 }}>
                      Ban: {u.banReason || "—"} {u.banExpiresAt ? `(expiră ${new Date(u.banExpiresAt).toLocaleString("ro-RO")})` : "(permanent)"}
                    </div>
                  )}
                  {u.isMuted && (
                    <div style={{ fontSize: 11, color: "#f39c12", marginTop: 2 }}>
                      Mute: {u.muteReason || "—"} {u.muteExpiresAt ? `(expiră ${new Date(u.muteExpiresAt).toLocaleString("ro-RO")})` : "(permanent)"}
                    </div>
                  )}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {!u.isBanned ? (
                  <button onClick={() => setModal({ type: "ban", userId: u._id, username: u.username })}
                    style={{ flex: "1 1 45%", padding: "7px", borderRadius: 8, border: "1px solid #e74c3c", background: "transparent", color: "#e74c3c", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                    🚫 Banează
                  </button>
                ) : (
                  <button onClick={() => handleUnban(u._id)}
                    style={{ flex: "1 1 45%", padding: "7px", borderRadius: 8, border: "1px solid #2ecc71", background: "transparent", color: "#2ecc71", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                    ✅ Debanează
                  </button>
                )}

                {!u.isMuted ? (
                  <button onClick={() => setModal({ type: "mute", userId: u._id, username: u.username })}
                    style={{ flex: "1 1 45%", padding: "7px", borderRadius: 8, border: "1px solid #f39c12", background: "transparent", color: "#f39c12", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                    🔇 Mute
                  </button>
                ) : (
                  <button onClick={() => handleUnmute(u._id)}
                    style={{ flex: "1 1 45%", padding: "7px", borderRadius: 8, border: "1px solid #2ecc71", background: "transparent", color: "#2ecc71", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                    🔊 Unmute
                  </button>
                )}

                <button onClick={() => handleToggleAdmin(u._id, u.username)}
                  style={{ flex: "1 1 100%", padding: "7px", borderRadius: 8, border: "1px solid #e91e8c", background: "transparent", color: "#e91e8c", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                  {u.isAdmin ? "Retrogradează" : "👑 Promovează"}
                </button>

                <button onClick={() => handleToggleVerify(u._id, u.username, u.isVerified)}
                  style={{ flex: "1 1 100%", padding: "7px", borderRadius: 8, border: `1px solid ${u.isVerified ? "#888" : "#1da1f2"}`, background: "transparent", color: u.isVerified ? "#888" : "#1da1f2", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                  {u.isVerified ? "❌ Elimină verificarea" : "✓ Verifică contul"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === "audit" && (
        <div>
          {logs.length === 0 && <div style={{ color: "#555", textAlign: "center", padding: "2rem" }}>Niciun log încă</div>}
          {logs.map(log => {
            const meta = ACTION_LABELS[log.action] || { label: log.action, icon: "•", color: "#888" };
            return (
              <div key={log._id} style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span style={{ fontSize: 13 }}>{meta.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: meta.color }}>{meta.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#555" }}>
                    {new Date(log.createdAt).toLocaleString("ro-RO")}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: "#aaa" }}>
                  <strong style={{ color: "#e91e8c" }}>{log.admin?.username || "?"}</strong>
                  {log.targetUser && <> → <strong>{log.targetUser?.username}</strong></>}
                  {log.targetPost && <> → postare: "{(log.targetPost.content || "").slice(0, 40)}..."</>}
                </div>
                {(log.reason || log.details) && (
                  <div style={{ fontSize: 11, color: "#666", marginTop: 2 }}>
                    {log.details} {log.reason && `— ${log.reason}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal?.type === "ban" && (
        <DurationModal
          title={`🚫 Banează pe ${modal.username}`}
          color="#e74c3c"
          onConfirm={handleBanConfirm}
          onCancel={() => setModal(null)}
        />
      )}
      {modal?.type === "mute" && (
        <DurationModal
          title={`🔇 Mute pentru ${modal.username}`}
          color="#f39c12"
          onConfirm={handleMuteConfirm}
          onCancel={() => setModal(null)}
        />
      )}
    </div>
  );
}
