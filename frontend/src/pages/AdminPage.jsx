import { useState, useEffect } from "react";
import api from "../api";

export default function AdminPage() {
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("stats");
  const [search, setSearch] = useState("");
  const [banReason, setBanReason] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/admin/stats").then(r => setStats(r.data)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (tab === "users") {
      api.get(`/admin/users?search=${encodeURIComponent(search)}`).then(r => setUsers(r.data.users));
    }
  }, [tab, search]);

  const handleBan = async (userId, username) => {
    const reason = prompt(`Motiv ban pentru ${username}:`);
    if (reason === null) return;
    try {
      await api.put(`/admin/users/${userId}/ban`, { reason: reason || "Motiv nespecificat" });
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: true, banReason: reason } : u));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  const handleUnban = async (userId) => {
    try {
      await api.put(`/admin/users/${userId}/unban`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isBanned: false, banReason: "" } : u));
    } catch {}
  };

  const handleToggleAdmin = async (userId, username) => {
    if (!window.confirm(`Modifici rolul de admin pentru ${username}?`)) return;
    try {
      const res = await api.put(`/admin/users/${userId}/toggle-admin`);
      setUsers(prev => prev.map(u => u._id === userId ? { ...u, isAdmin: !u.isAdmin } : u));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 16, color: "#e91e8c" }}>⚙️ Panel Admin</div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
        {["stats", "users"].map(t => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: "8px 18px", borderRadius: 20, border: `1px solid ${tab === t ? "#e91e8c" : "#333"}`, background: tab === t ? "#e91e8c" : "transparent", color: tab === t ? "#fff" : "#888", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            {t === "stats" ? "📊 Statistici" : "👥 Useri"}
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
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#e91e8c", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                {u.avatar || u.displayName?.slice(0, 2)}
              </div>
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>{u.username}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{new Date(u.createdAt).toLocaleDateString("ro-RO")}</div>
              </div>
              {u.isBanned && <span style={{ marginLeft: "auto", fontSize: 11, color: "#e74c3c", background: "#2a1a1a", padding: "2px 8px", borderRadius: 20 }}>BANAT</span>}
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
            style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 14px", color: "#fff", fontSize: 13, marginBottom: 16 }}
          />
          {users.map(u => (
            <div key={u._id} style={{ background: "#1a1a1a", borderRadius: 12, padding: "12px 14px", marginBottom: 8, border: "1px solid #2a2a2a" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: "50%", background: u.isAdmin ? "#e91e8c" : "#333", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 12 }}>
                  {u.avatar || u.displayName?.slice(0, 2)}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>
                    {u.username}
                    {u.isAdmin && <span style={{ marginLeft: 6, fontSize: 10, color: "#e91e8c" }}>👑 ADMIN</span>}
                    {u.isBanned && <span style={{ marginLeft: 6, fontSize: 10, color: "#e74c3c" }}>🚫 BANAT</span>}
                  </div>
                  <div style={{ fontSize: 12, color: "#666" }}>{u.role} • {new Date(u.createdAt).toLocaleDateString("ro-RO")}</div>
                  {u.isBanned && u.banReason && <div style={{ fontSize: 11, color: "#e74c3c", marginTop: 2 }}>Motiv: {u.banReason}</div>}
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {!u.isBanned ? (
                  <button onClick={() => handleBan(u._id, u.username)}
                    style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #e74c3c", background: "transparent", color: "#e74c3c", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                    🚫 Banează
                  </button>
                ) : (
                  <button onClick={() => handleUnban(u._id)}
                    style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #2ecc71", background: "transparent", color: "#2ecc71", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                    ✅ Debanează
                  </button>
                )}
                <button onClick={() => handleToggleAdmin(u._id, u.username)}
                  style={{ flex: 1, padding: "7px", borderRadius: 8, border: "1px solid #e91e8c", background: "transparent", color: "#e91e8c", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                  {u.isAdmin ? "Retrogradează" : "👑 Promovează"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
