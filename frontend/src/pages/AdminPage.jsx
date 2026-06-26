import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
  verify: { label: "Verificat", icon: "✅", color: "#1da1f2" },
  unverify: { label: "Verificare eliminată", icon: "❌", color: "#888" },
  "delete-user": { label: "Ștergere cont", icon: "🗑️", color: "#e74c3c" },
  "edit-profile": { label: "Editare profil", icon: "✏️", color: "#9b59b6" },
  broadcast: { label: "Broadcast", icon: "📢", color: "#e91e8c" },
  "reset-password": { label: "Reset parolă", icon: "🔑", color: "#ff9800" },
  "resolve-report": { label: "Rezolvat raport", icon: "✅", color: "#2ecc71" },
  "assign-role": { label: "Atribuire rol", icon: "🎭", color: "#9b59b6" },
};

function Modal({ title, color, onCancel, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 16 }}>
      <div style={{ background: "#1a1a1a", borderRadius: 14, padding: 20, width: "100%", maxWidth: 400, border: "1px solid #2a2a2a", maxHeight: "90vh", overflowY: "auto" }}>
        <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 16, color }}>{title}</div>
        {children}
        <button onClick={onCancel} style={{ width: "100%", marginTop: 10, padding: 10, borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>Anulează</button>
      </div>
    </div>
  );
}

function DurationModal({ title, color, onConfirm, onCancel }) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("24h");
  return (
    <Modal title={title} color={color} onCancel={onCancel}>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Durată</div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
        {DURATIONS.map(d => (
          <button key={d.value} onClick={() => setDuration(d.value)}
            style={{ padding: "6px 12px", borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: "pointer", border: `1px solid ${duration === d.value ? color : "#333"}`, background: duration === d.value ? color : "transparent", color: duration === d.value ? "#fff" : "#888" }}>
            {d.label}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Motiv</div>
      <textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motiv (opțional)" rows={3}
        style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, color: "#fff", fontSize: 13, boxSizing: "border-box", resize: "vertical", marginBottom: 12 }} />
      <button onClick={() => onConfirm({ reason, duration })}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: color, color: "#fff", fontWeight: 700, cursor: "pointer" }}>
        Confirmă
      </button>
    </Modal>
  );
}

// Mini bar chart pentru statistici
function MiniBarChart({ data }) {
  if (!data || data.length === 0) return <div style={{ color: "#555", fontSize: 12, textAlign: "center", padding: 20 }}>Fără date</div>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 80, padding: "0 4px" }}>
      {data.map((d, i) => (
        <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
          <div style={{ fontSize: 9, color: "#666" }}>{d.count > 0 ? d.count : ""}</div>
          <div style={{ width: "100%", background: "#e91e8c", borderRadius: "3px 3px 0 0", height: `${(d.count / max) * 60}px`, minHeight: d.count > 0 ? 4 : 0 }} />
          <div style={{ fontSize: 8, color: "#555", transform: "rotate(-30deg)", transformOrigin: "top left", whiteSpace: "nowrap" }}>
            {d._id?.slice(5)}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [duplicateIps, setDuplicateIps] = useState([]);
  const [logs, setLogs] = useState([]);
  const [reports, setReports] = useState([]);
  const [tab, setTab] = useState("stats");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [filterIp, setFilterIp] = useState("");
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleColor, setNewRoleColor] = useState("#e91e8c");
  const [newRoleIsMafia, setNewRoleIsMafia] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleModal, setRoleModal] = useState(null);
  const [resetResult, setResetResult] = useState(null);
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcastSent, setBroadcastSent] = useState("");
  const [editProfileModal, setEditProfileModal] = useState(null);
  const [ipModal, setIpModal] = useState(null); // { ip, users }
  const [reportFilter, setReportFilter] = useState("pending");

  const loadUsers = () => {
    let url = `/admin/users?search=${encodeURIComponent(search)}&sortBy=${sortBy}`;
    if (filterIp) url += `&filterIp=${encodeURIComponent(filterIp)}`;
    api.get(url).then(r => { setUsers(r.data.users); setDuplicateIps(r.data.duplicateIps || []); });
  };

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "users") loadUsers();
    if (tab === "audit") api.get("/admin/audit-log").then(r => setLogs(r.data.logs));
    if (tab === "roles") api.get("/admin/roles").then(r => setRoles(r.data));
    if (tab === "reports") api.get(`/admin/reports?status=${reportFilter}`).then(r => setReports(r.data.reports));
  }, [tab, search, sortBy, filterIp, reportFilter]);

  // ── Handlers ──
  const handleBanConfirm = async ({ reason, duration }) => {
    const { userId } = modal;
    try {
      const r = await api.put(`/admin/users/${userId}/ban`, { reason: reason || "Motiv nespecificat", duration });
      setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u));
    } catch (err) { alert(err.response?.data?.message || "Eroare"); }
    setModal(null);
  };
  const handleMuteConfirm = async ({ reason, duration }) => {
    const { userId } = modal;
    try {
      const r = await api.put(`/admin/users/${userId}/mute`, { reason: reason || "Motiv nespecificat", duration });
      setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u));
    } catch (err) { alert(err.response?.data?.message || "Eroare"); }
    setModal(null);
  };
  const handleUnban = async (userId) => {
    try { const r = await api.put(`/admin/users/${userId}/unban`); setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u)); } catch {}
  };
  const handleUnmute = async (userId) => {
    try { const r = await api.put(`/admin/users/${userId}/unmute`); setUsers(prev => prev.map(u => u._id === userId ? r.data.user : u)); } catch {}
  };
  const handleToggleVerify = async (userId, username, current) => {
    if (!window.confirm(`${current ? "Elimini verificarea" : "Verifici"} contul lui ${username}?`)) return;
    try { const r = await api.put(`/admin/users/${userId}/toggle-verify`); setUsers(prev => prev.map(u => u._id === userId ? { ...u, isVerified: r.data.user.isVerified } : u)); } catch {}
  };
  const handleToggleAdmin = async (userId, username) => {
    if (!window.confirm(`Modifici rolul de admin pentru ${username}?`)) return;
    try { await api.put(`/admin/users/${userId}/toggle-admin`); loadUsers(); } catch {}
  };
  const handleDeleteUser = async (userId, username) => {
    if (!window.confirm(`⚠️ Ștergi PERMANENT contul @${username} și toate datele sale? Acțiunea NU poate fi anulată!`)) return;
    try { await api.delete(`/admin/users/${userId}`); setUsers(prev => prev.filter(u => u._id !== userId)); }
    catch (err) { alert(err.response?.data?.message || "Eroare"); }
  };
  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    if (!window.confirm(`Trimiți mesajul tuturor userilor?`)) return;
    try {
      const r = await api.post("/admin/broadcast", { message: broadcastMsg });
      setBroadcastSent(r.data.message);
      setBroadcastMsg("");
    } catch (err) { alert(err.response?.data?.message || "Eroare"); }
  };
  const handleEditProfile = async (data) => {
    try {
      const r = await api.put(`/admin/users/${editProfileModal._id}/edit-profile`, data);
      setUsers(prev => prev.map(u => u._id === editProfileModal._id ? { ...u, ...r.data.user } : u));
      setEditProfileModal(null);
    } catch (err) { alert(err.response?.data?.message || "Eroare"); }
  };
  const handleViewIp = async (ip) => {
    try {
      const r = await api.get(`/admin/users/by-ip/${encodeURIComponent(ip)}`);
      setIpModal({ ip, users: r.data.users });
    } catch (err) {
      alert(err.response?.data?.message || "Eroare la încărcarea conturilor cu acest IP");
    }
  };
  const handleExportCSV = () => {
    window.open(api.defaults.baseURL + "/admin/users/export-csv", "_blank");
  };
  const handleResolveReport = async (reportId, action) => {
    const note = action === "resolved" ? (prompt("Notă (opțional):") || "") : "";
    try {
      await api.put(`/admin/reports/${reportId}/resolve`, { action, note });
      setReports(prev => prev.filter(r => r._id !== reportId));
    } catch (err) { alert(err.response?.data?.message || "Eroare"); }
  };

  const btnStyle = (color = "#333") => ({
    flex: "1 1 45%", padding: "7px", borderRadius: 8, border: `1px solid ${color}`,
    background: "transparent", color, fontWeight: 600, cursor: "pointer", fontSize: 12,
  });

  const TABS = [
    { id: "stats", label: "📊 Stats" },
    { id: "users", label: "👥 Useri" },
    { id: "reports", label: `🚨 Rapoarte${stats?.pendingReports ? ` (${stats.pendingReports})` : ""}` },
    { id: "broadcast", label: "📢 Broadcast" },
    { id: "audit", label: "📋 Audit" },
    { id: "roles", label: "🎭 Roluri" },
  ];

  if (loading) return <div style={{ color: "#555", textAlign: "center", padding: "3rem" }}>Se încarcă...</div>;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "16px 12px" }}>
      <div style={{ fontWeight: 900, fontSize: 20, marginBottom: 16, color: "#e91e8c" }}>⚙️ Admin Panel</div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 16 }}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{ padding: "7px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${tab === t.id ? "#e91e8c" : "#2a2a2a"}`, background: tab === t.id ? "#e91e8c" : "transparent", color: tab === t.id ? "#fff" : "#888" }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── STATS ── */}
      {tab === "stats" && stats && (
        <div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "Useri totali", value: stats.totalUsers, color: "#e91e8c" },
              { label: "Postări active", value: stats.totalPosts, color: "#1da1f2" },
              { label: "Banați", value: stats.bannedUsers, color: "#e74c3c" },
              { label: "Mutați", value: stats.mutedUsers, color: "#f39c12" },
              { label: "Rapoarte noi", value: stats.pendingReports || 0, color: "#ff5722" },
            ].map(s => (
              <div key={s.label} style={{ background: "#1a1a1a", borderRadius: 12, padding: "14px 16px", border: "1px solid #2a2a2a" }}>
                <div style={{ fontSize: 11, color: "#666", marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, border: "1px solid #2a2a2a", marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, color: "#ccc" }}>📈 Înregistrări — ultimele 14 zile</div>
            <MiniBarChart data={stats.regByDay || []} />
          </div>

          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, border: "1px solid #2a2a2a", marginBottom: 10 }}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 10, color: "#ccc" }}>🆕 Useri recenți</div>
            {stats.recentUsers?.map(u => (
              <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0", borderBottom: "1px solid #222", cursor: "pointer" }}
                onClick={() => navigate(`/profile/${u._id}`)}
                title={`Mergi la profilul lui @${u.username}`}>
                <Avatar user={u} size={28} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                  <div style={{ fontSize: 11, color: "#555" }}>{new Date(u.createdAt).toLocaleDateString("ro-RO")}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── USERS ── */}
      {tab === "users" && (
        <div>
          {/* Search + Sort + Filter */}
          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Caută username / displayName..."
              style={{ flex: "1 1 200px", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13 }} />
            <select value={sortBy} onChange={e => setSortBy(e.target.value)}
              style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 13 }}>
              <option value="createdAt">📅 Dată creare</option>
              <option value="lastSeen">🕐 Ultima activitate</option>
              <option value="username">🔤 Username</option>
            </select>
            <button onClick={handleExportCSV}
              style={{ padding: "10px 14px", borderRadius: 10, border: "1px solid #2ecc71", background: "transparent", color: "#2ecc71", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
              📋 Export CSV
            </button>
          </div>

          {/* Filter by IP */}
          {filterIp && (
            <div style={{ background: "#1a1818", border: "1px solid #e91e8c44", borderRadius: 8, padding: "8px 12px", marginBottom: 10, display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <span style={{ color: "#e91e8c" }}>🔍 Filtrat după IP: <strong>{filterIp}</strong></span>
              <button onClick={() => setFilterIp("")} style={{ marginLeft: "auto", background: "transparent", border: "none", color: "#888", cursor: "pointer", fontSize: 12 }}>✕ Șterge filtru</button>
            </div>
          )}

          {/* Duplicate IP warning */}
          {duplicateIps.length > 0 && (
            <div style={{ background: "#1a1a00", border: "1px solid #f39c1244", borderRadius: 10, padding: "10px 14px", marginBottom: 12, fontSize: 12 }}>
              <div style={{ color: "#f39c12", fontWeight: 700, marginBottom: 6 }}>⚠️ IP-uri duplicate detectate ({duplicateIps.length})</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {duplicateIps.map(ip => (
                  <button key={ip} onClick={() => handleViewIp(ip)}
                    style={{ padding: "3px 10px", borderRadius: 20, border: "1px solid #f39c12", background: "transparent", color: "#f39c12", cursor: "pointer", fontSize: 11, fontFamily: "monospace" }}>
                    {ip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {users.map(u => {
            const isDupIp = duplicateIps.includes(u.lastIp) || duplicateIps.includes(u.registrationIp);
            return (
              <div key={u._id} style={{ background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: `1px solid ${isDupIp ? "#f39c1244" : "#2a2a2a"}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                  <div onClick={() => navigate(`/profile/${u._id}`)} style={{ cursor: "pointer" }} title={`Mergi la profilul lui @${u.username}`}>
                    <Avatar user={u} size={38} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>
                      <span
                        onClick={() => navigate(`/profile/${u._id}`)}
                        style={{ cursor: "pointer", textDecoration: "underline dotted", textUnderlineOffset: 3 }}
                        title="Deschide profil"
                      >{u.username}</span>
                      {u.isVerified && <span style={{ marginLeft: 6, fontSize: 10, color: "#1da1f2" }}>✓ VERIFICAT</span>}
                      {u.isAdmin && <span style={{ marginLeft: 6, fontSize: 10, color: "#e91e8c" }}>👑 ADMIN</span>}
                      {u.isBanned && <span style={{ marginLeft: 6, fontSize: 10, color: "#e74c3c" }}>🚫 BANAT</span>}
                      {u.isMuted && <span style={{ marginLeft: 6, fontSize: 10, color: "#f39c12" }}>🔇 MUTE</span>}
                      {isDupIp && <span style={{ marginLeft: 6, fontSize: 10, color: "#f39c12" }}>⚠️ IP DUP</span>}
                    </div>
                    <div style={{ fontSize: 12, color: u.customRole?.color || "#666" }}>{u.role} • creat {new Date(u.createdAt).toLocaleDateString("ro-RO")}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>
                      🕐 activ {u.lastSeen ? new Date(u.lastSeen).toLocaleString("ro-RO") : "necunoscut"}
                    </div>
                    {u.isBanned && <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 2 }}>Ban: {u.banReason || "—"} {u.banExpiresAt ? `(expiră ${new Date(u.banExpiresAt).toLocaleString("ro-RO")})` : "(permanent)"}</div>}
                    {u.isMuted && <div style={{ fontSize: 11, color: "#f39c12", marginTop: 2 }}>Mute: {u.muteReason || "—"} {u.muteExpiresAt ? `(expiră ${new Date(u.muteExpiresAt).toLocaleString("ro-RO")})` : "(permanent)"}</div>}
                    {(u.lastIp || u.registrationIp) && (
                      <div style={{ fontSize: 11, marginTop: 4, fontFamily: "monospace" }}>
                        🌐{" "}
                        <span
                          onClick={() => handleViewIp(u.lastIp || u.registrationIp)}
                          style={{ color: isDupIp ? "#f39c12" : "#666", cursor: "pointer", textDecoration: "underline dotted" }}
                          title="Click pentru toate conturile cu acest IP">
                          {u.lastIp || "—"}
                        </span>
                        {u.registrationIp && u.registrationIp !== u.lastIp && <span style={{ color: "#444" }}> (reg: {u.registrationIp})</span>}
                      </div>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {!u.isBanned
                    ? <button onClick={() => setModal({ type: "ban", userId: u._id, username: u.username })} style={btnStyle("#e74c3c")}>🚫 Ban</button>
                    : <button onClick={() => handleUnban(u._id)} style={btnStyle("#2ecc71")}>✅ Unban</button>}
                  {!u.isMuted
                    ? <button onClick={() => setModal({ type: "mute", userId: u._id, username: u.username })} style={btnStyle("#f39c12")}>🔇 Mute</button>
                    : <button onClick={() => handleUnmute(u._id)} style={btnStyle("#2ecc71")}>🔊 Unmute</button>}
                  <button onClick={() => handleToggleAdmin(u._id, u.username)} style={btnStyle("#e91e8c")}>
                    {u.isAdmin ? "👑 Retrage Admin" : "👑 Fă Admin"}
                  </button>
                  <button onClick={async () => {
                    if (!window.confirm(`Resetezi parola lui @${u.username}?`)) return;
                    try { const r = await api.post(`/admin/users/${u._id}/reset-password`); setResetResult({ username: r.data.username, tempPassword: r.data.tempPassword }); }
                    catch (err) { alert(err.response?.data?.message || "Eroare"); }
                  }} style={btnStyle("#ff9800")}>🔑 Reset Parolă</button>
                  <button onClick={() => handleToggleVerify(u._id, u.username, u.isVerified)} style={btnStyle(u.isVerified ? "#888" : "#1da1f2")}>
                    {u.isVerified ? "❌ Neverificat" : "✓ Verifică"}
                  </button>
                  <button onClick={() => setEditProfileModal(u)} style={btnStyle("#9b59b6")}>✏️ Editează Profil</button>
                  <button onClick={() => { api.get("/admin/roles").then(r => setRoles(r.data)); setRoleModal({ userId: u._id, username: u.username }); }} style={btnStyle("#888")}>🎭 Rol</button>
                  {!u.isAdmin && (
                    <button onClick={() => handleDeleteUser(u._id, u.username)}
                      style={{ flex: "1 1 100%", padding: "7px", borderRadius: 8, border: "1px solid #8b0000", background: "rgba(139,0,0,0.15)", color: "#ff4444", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                      🗑️ Șterge Cont Permanent
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RAPOARTE ── */}
      {tab === "reports" && (
        <div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
            {["pending", "resolved", "dismissed", "all"].map(s => (
              <button key={s} onClick={() => setReportFilter(s)}
                style={{ padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: "pointer", border: `1px solid ${reportFilter === s ? "#e91e8c" : "#2a2a2a"}`, background: reportFilter === s ? "#e91e8c" : "transparent", color: reportFilter === s ? "#fff" : "#888" }}>
                {s === "pending" ? "🔴 În așteptare" : s === "resolved" ? "✅ Rezolvate" : s === "dismissed" ? "❌ Respinse" : "📋 Toate"}
              </button>
            ))}
          </div>
          {reports.length === 0 && <div style={{ color: "#555", textAlign: "center", padding: "2rem" }}>Niciun raport</div>}
          {reports.map(r => (
            <div key={r._id} style={{ background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #2a2a2a" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                <span style={{ fontSize: 18 }}>{r.type === "user" ? "👤" : "📝"}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>
                    Raportat de <span style={{ color: "#e91e8c" }}>@{r.reporter?.username}</span>
                    {r.targetUser && <> → <span style={{ color: "#1da1f2" }}>@{r.targetUser?.username}</span></>}
                  </div>
                  <div style={{ fontSize: 11, color: "#555" }}>{new Date(r.createdAt).toLocaleString("ro-RO")}</div>
                </div>
                <span style={{ fontSize: 11, padding: "3px 8px", borderRadius: 20, background: r.status === "pending" ? "#f39c1222" : "#2ecc7122", color: r.status === "pending" ? "#f39c12" : "#2ecc71" }}>
                  {r.status}
                </span>
              </div>
              <div style={{ fontSize: 13, color: "#ccc", background: "#111", borderRadius: 8, padding: "8px 12px", marginBottom: 8 }}>
                "{r.reason}"
              </div>
              {r.targetPost?.content && (
                <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
                  Postare: "{r.targetPost.content.slice(0, 100)}..."
                </div>
              )}
              {r.status === "pending" && (
                <div style={{ display: "flex", gap: 6 }}>
                  <button onClick={() => handleResolveReport(r._id, "resolved")} style={btnStyle("#2ecc71")}>✅ Rezolvat</button>
                  <button onClick={() => handleResolveReport(r._id, "dismissed")} style={btnStyle("#888")}>❌ Respinge</button>
                </div>
              )}
              {r.resolveNote && <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>Notă: {r.resolveNote}</div>}
            </div>
          ))}
        </div>
      )}

      {/* ── BROADCAST ── */}
      {tab === "broadcast" && (
        <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 20, border: "1px solid #2a2a2a" }}>
          <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6, color: "#ccc" }}>📢 Mesaj către toți userii</div>
          <div style={{ fontSize: 12, color: "#555", marginBottom: 14 }}>Mesajul va apărea ca notificare pentru fiecare user înregistrat.</div>
          <textarea value={broadcastMsg} onChange={e => setBroadcastMsg(e.target.value)} placeholder="Scrie mesajul broadcast..." rows={4}
            style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: 12, color: "#fff", fontSize: 14, boxSizing: "border-box", resize: "vertical", marginBottom: 12 }} />
          <button onClick={handleBroadcast} disabled={!broadcastMsg.trim()}
            style={{ width: "100%", padding: 12, borderRadius: 8, border: "none", background: broadcastMsg.trim() ? "#e91e8c" : "#333", color: "#fff", fontWeight: 700, cursor: broadcastMsg.trim() ? "pointer" : "default", fontSize: 14 }}>
            📢 Trimite Broadcast
          </button>
          {broadcastSent && <div style={{ marginTop: 12, color: "#2ecc71", fontSize: 13, textAlign: "center" }}>✅ {broadcastSent}</div>}
        </div>
      )}

      {/* ── AUDIT ── */}
      {tab === "audit" && (
        <div>
          {logs.length === 0 && <div style={{ color: "#555", textAlign: "center", padding: "2rem" }}>Niciun log</div>}
          {logs.map(log => {
            const meta = ACTION_LABELS[log.action] || { label: log.action, icon: "•", color: "#888" };
            return (
              <div key={log._id} style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: "1px solid #2a2a2a" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                  <span>{meta.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 13, color: meta.color }}>{meta.label}</span>
                  <span style={{ marginLeft: "auto", fontSize: 11, color: "#555" }}>{new Date(log.createdAt).toLocaleString("ro-RO")}</span>
                </div>
                <div style={{ fontSize: 12, color: "#666" }}>
                  <strong style={{ color: "#e91e8c" }}>{log.admin?.username || "?"}</strong>
                  {log.targetUser && <> → <strong>{log.targetUser?.username}</strong></>}
                  {log.details && <span style={{ color: "#555" }}> — {log.details}</span>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── ROLURI ── */}
      {tab === "roles" && (
        <div>
          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, border: "1px solid #2a2a2a", marginBottom: 12 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12, color: "#ccc" }}>Crează rol nou</div>
            <input value={newRoleName} onChange={e => setNewRoleName(e.target.value)} placeholder="Nume rol"
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, color: "#fff", fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
              <input type="color" value={newRoleColor} onChange={e => setNewRoleColor(e.target.value)} style={{ width: 40, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "none" }} />
              <span style={{ fontSize: 12, color: newRoleColor, fontWeight: 700 }}>{newRoleName || "Previzualizare"}</span>
              <label style={{ fontSize: 12, color: "#888", marginLeft: "auto", display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={newRoleIsMafia} onChange={e => setNewRoleIsMafia(e.target.checked)} /> Mafia
              </label>
            </div>
            <button onClick={async () => {
              if (!newRoleName.trim()) return;
              try { const r = await api.post("/admin/roles", { name: newRoleName, color: newRoleColor, isMafia: newRoleIsMafia }); setRoles(prev => [r.data, ...prev]); setNewRoleName(""); setNewRoleColor("#e91e8c"); setNewRoleIsMafia(false); }
              catch (err) { alert(err.response?.data?.message || "Eroare"); }
            }} style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              + Adaugă Rol
            </button>
          </div>
          {roles.map(role => (
            <div key={role._id} style={{ background: "#1a1a1a", borderRadius: 10, padding: "10px 14px", marginBottom: 8, border: "1px solid #2a2a2a", display: "flex", alignItems: "center", gap: 10 }}>
              {editingRole?._id === role._id ? (
                <>
                  <input value={editingRole.name} onChange={e => setEditingRole(p => ({ ...p, name: e.target.value }))}
                    style={{ flex: 1, background: "#111", border: "1px solid #333", borderRadius: 6, padding: "6px 10px", color: "#fff", fontSize: 13 }} />
                  <input type="color" value={editingRole.color} onChange={e => setEditingRole(p => ({ ...p, color: e.target.value }))}
                    style={{ width: 36, height: 32, border: "none", borderRadius: 4, cursor: "pointer" }} />
                  <button onClick={async () => {
                    try { const r = await api.put(`/admin/roles/${role._id}`, { name: editingRole.name, color: editingRole.color }); setRoles(prev => prev.map(ro => ro._id === role._id ? r.data : ro)); setEditingRole(null); }
                    catch (err) { alert(err.response?.data?.message || "Eroare"); }
                  }} style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#2ecc71", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>✓</button>
                  <button onClick={() => setEditingRole(null)} style={{ padding: "5px 8px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12 }}>✕</button>
                </>
              ) : (
                <>
                  <span style={{ fontWeight: 700, color: role.color, fontSize: 14, flex: 1 }}>{role.name}</span>
                  <span style={{ fontSize: 10, color: "#555" }}>de {role.createdBy?.username || "sistem"}</span>
                  <button onClick={() => setEditingRole({ _id: role._id, name: role.name, color: role.color })}
                    style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: 11 }}>✏️</button>
                  <button onClick={async () => {
                    if (!window.confirm(`Ștergi rolul "${role.name}"?`)) return;
                    try { await api.delete(`/admin/roles/${role._id}`); setRoles(prev => prev.filter(r => r._id !== role._id)); }
                    catch (err) { alert(err.response?.data?.message || "Eroare"); }
                  }} style={{ padding: "4px 10px", borderRadius: 6, border: "1px solid #e74c3c", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 11 }}>🗑️</button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── MODALS ── */}
      {modal?.type === "ban" && <DurationModal title={`🚫 Banează pe ${modal.username}`} color="#e74c3c" onConfirm={handleBanConfirm} onCancel={() => setModal(null)} />}
      {modal?.type === "mute" && <DurationModal title={`🔇 Mute pe ${modal.username}`} color="#f39c12" onConfirm={handleMuteConfirm} onCancel={() => setModal(null)} />}

      {/* Edit Profile Modal */}
      {editProfileModal && (
        <EditProfileModal user={editProfileModal} onConfirm={handleEditProfile} onCancel={() => setEditProfileModal(null)} />
      )}

      {/* IP Modal */}
      {ipModal && (
        <Modal title={`🌐 Conturi cu IP: ${ipModal.ip}`} color="#f39c12" onCancel={() => setIpModal(null)}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 12 }}>{ipModal.users.length} cont{ipModal.users.length !== 1 ? "uri" : ""} găsit{ipModal.users.length !== 1 ? "e" : ""}</div>
          {ipModal.users.map(u => (
            <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #222", cursor: "pointer" }}
              onClick={() => { setIpModal(null); navigate(`/profile/${u._id}`); }}
              title={`Deschide profilul lui @${u.username}`}>
              <Avatar user={u} size={32} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username} {u.isAdmin && "👑"} {u.isBanned && "🚫"}</div>
                <div style={{ fontSize: 11, color: "#555" }}>Creat {new Date(u.createdAt).toLocaleDateString("ro-RO")} • IP reg: {u.registrationIp || "—"}</div>
              </div>
            </div>
          ))}
          <button onClick={() => { setFilterIp(ipModal.ip); setTab("users"); setIpModal(null); }}
            style={{ width: "100%", marginTop: 12, padding: 10, borderRadius: 8, border: "1px solid #f39c12", background: "transparent", color: "#f39c12", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            Filtrează userii după acest IP
          </button>
        </Modal>
      )}

      {/* Reset password result */}
      {resetResult && (
        <Modal title="🔑 Parolă temporară" color="#ff9800" onCancel={() => setResetResult(null)}>
          <div style={{ fontSize: 13, color: "#ccc", marginBottom: 8 }}>Parolă temporară pentru <strong>@{resetResult.username}</strong>:</div>
          <div style={{ background: "#111", borderRadius: 8, padding: "12px 16px", fontFamily: "monospace", fontSize: 18, color: "#2ecc71", textAlign: "center", letterSpacing: 2, marginBottom: 12 }}>
            {resetResult.tempPassword}
          </div>
          <div style={{ fontSize: 11, color: "#555" }}>Copiaz-o și trimite-o userului. Îi recomandă să și-o schimbe imediat.</div>
        </Modal>
      )}

      {/* Role assign modal */}
      {roleModal && (
        <Modal title={`🎭 Atribuie rol pentru @${roleModal.username}`} color="#9b59b6" onCancel={() => setRoleModal(null)}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {["Civil", "Politist", "Mecanic", "Doctor", "Pompier"].map(r => (
              <button key={r} onClick={async () => {
                try { const res = await api.put(`/admin/users/${roleModal.userId}/role`, { standardRole: r }); setUsers(prev => prev.map(u => u._id === roleModal.userId ? res.data : u)); setRoleModal(null); }
                catch (err) { alert(err.response?.data?.message || "Eroare"); }
              }} style={{ padding: 10, borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#ccc", cursor: "pointer", textAlign: "left", fontSize: 13 }}>
                {r}
              </button>
            ))}
            <div style={{ borderTop: "1px solid #222", paddingTop: 10, marginTop: 4 }}>
              <div style={{ fontSize: 11, color: "#666", marginBottom: 6 }}>Roluri custom:</div>
              {roles.map(r => (
                <button key={r._id} onClick={async () => {
                  try { const res = await api.put(`/admin/users/${roleModal.userId}/role`, { customRoleId: r._id }); setUsers(prev => prev.map(u => u._id === roleModal.userId ? res.data : u)); setRoleModal(null); }
                  catch (err) { alert(err.response?.data?.message || "Eroare"); }
                }} style={{ display: "block", width: "100%", padding: 10, borderRadius: 8, border: `1px solid ${r.color}33`, background: "transparent", color: r.color, cursor: "pointer", textAlign: "left", fontSize: 13, fontWeight: 700, marginBottom: 4 }}>
                  {r.name} {r.isMafia ? "🔫" : ""}
                </button>
              ))}
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Edit Profile Modal — component separat pentru claritate
function EditProfileModal({ user, onConfirm, onCancel }) {
  const [displayName, setDisplayName] = useState(user.displayName || "");
  const [bio, setBio] = useState(user.bio || "");
  const [location, setLocation] = useState(user.location || "");
  return (
    <Modal title={`✏️ Editează profil @${user.username}`} color="#9b59b6" onCancel={onCancel}>
      {[
        { label: "Display Name", value: displayName, set: setDisplayName, placeholder: "Nume afișat" },
        { label: "Bio", value: bio, set: setBio, placeholder: "Descriere profil" },
        { label: "Locație", value: location, set: setLocation, placeholder: "ex: Los Santos" },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "#888", marginBottom: 4 }}>{f.label}</div>
          <input value={f.value} onChange={e => f.set(e.target.value)} placeholder={f.placeholder}
            style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, color: "#fff", fontSize: 13, boxSizing: "border-box" }} />
        </div>
      ))}
      <button onClick={() => onConfirm({ displayName, bio, location })}
        style={{ width: "100%", padding: 10, borderRadius: 8, border: "none", background: "#9b59b6", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
        Salvează
      </button>
    </Modal>
  );
}
