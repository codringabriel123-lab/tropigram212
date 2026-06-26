import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import PageTransition from "./PageTransition";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../api";
import Avatar from "./Avatar";
import PostModal from "./PostModal";

const ROLE_COLORS = { Civil: "#888", Politie: "#4a90e2", Mecanic: "#f5a623", Pompier: "#e74c3c", Medic: "#2ecc71", Admin: "#e91e8c" };

export default function Layout() {
  const { user, logout } = useAuth();
  const { theme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const [showPostModal, setShowPostModal] = useState(false);
  const [notifs, setNotifs] = useState([]);
  const [unread, setUnread] = useState(0);
  const [showNotif, setShowNotif] = useState(false);
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [unreadDm, setUnreadDm] = useState(0);
  const [showScrollTop, setShowScrollTop] = useState(false);

  useEffect(() => {
    fetchUnread();
    fetchUnreadDm();
    const interval = setInterval(() => { fetchUnread(); fetchUnreadDm(); }, 30000);
    return () => clearInterval(interval);
  }, []);

  // scroll-to-top button
  useEffect(() => {
    const onScroll = () => setShowScrollTop(window.scrollY > 300);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const fetchUnreadDm = async () => {
    try {
      const res = await api.get("/messages/unread-count");
      setUnreadDm(res.data.count);
    } catch {}
  };

  const fetchUnread = async () => {
    try {
      const res = await api.get("/notifications/unread-count");
      setUnread(res.data.count);
    } catch {}
  };

  const openNotifs = async () => {
    setShowNotif(!showNotif);
    if (!showNotif) {
      try {
        const res = await api.get("/notifications");
        setNotifs(res.data);
        await api.put("/notifications/read-all");
        setUnread(0);
      } catch {}
    }
  };

  const handleSearch = async (q) => {
    setSearch(q);
    if (!q.trim()) { setSearchResults([]); setShowSearch(false); return; }
    setShowSearch(true);
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
      setSearchResults(res.data);
    } catch {}
  };

  const navItems = [
    { path: "/", icon: "🏠", label: "Acasă" },
    { path: "/explore", icon: "🔍", label: "Explorează" },
    { path: "/top", icon: "🏆", label: "Top" },
    { path: "/messages", icon: "💬", label: "Mesaje", badge: unreadDm },
    { path: `/profile/${user?._id}`, icon: "👤", label: "Profil" },
  ];

  const t = theme;

  return (
    <div style={{ minHeight: "100vh", background: t.bg }}>
      {/* TOP NAV */}
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: t.bg, borderBottom: `1px solid ${t.border}`, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
        <div onClick={() => navigate("/")} style={{ fontSize: 18, fontWeight: 800, color: t.text, whiteSpace: "nowrap", cursor: "pointer" }}>
          🌴 <span style={{ color: t.accent }}>TRP</span>
        </div>

        <div style={{ flex: 1, position: "relative" }}>
          <input
            placeholder="🔍 Caută membri..."
            value={search}
            onChange={e => handleSearch(e.target.value)}
            onBlur={() => setTimeout(() => setShowSearch(false), 200)}
            style={{ width: "100%", background: t.inputBg, border: `1px solid ${t.border2}`, borderRadius: 20, padding: "8px 16px", color: t.text, fontSize: 13 }}
          />
          {showSearch && searchResults.length > 0 && (
            <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, zIndex: 200, overflow: "hidden", boxShadow: `0 8px 24px ${t.shadow}` }}>
              {searchResults.map(u => (
                <div key={u._id} onMouseDown={() => { navigate(`/profile/${u._id}`); setSearch(""); setShowSearch(false); }}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", cursor: "pointer", borderBottom: `1px solid ${t.border}` }}>
                  <Avatar user={u} size={32} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{u.displayName || u.username}</div>
                    <div style={{ fontSize: 11, color: ROLE_COLORS[u.role] || t.textMuted }}>{u.role}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={() => setShowPostModal(true)} style={{ width: 34, height: 34, borderRadius: "50%", background: t.accent, border: "none", color: "#fff", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>+</button>

          <div style={{ position: "relative" }}>
            <button onClick={openNotifs} style={{ width: 34, height: 34, borderRadius: "50%", background: t.surface, border: `1px solid ${t.border}`, color: t.text, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>🔔</button>
            {unread > 0 && <span style={{ position: "absolute", top: -4, right: -4, background: t.accent, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>{unread > 9 ? "9+" : unread}</span>}

            {showNotif && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, width: 310, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, zIndex: 300, boxShadow: `0 8px 32px ${t.shadowDeep}`, overflow: "hidden" }}>
                <div style={{ padding: "12px 16px", borderBottom: `1px solid ${t.border}`, fontWeight: 700, fontSize: 14, display: "flex", justifyContent: "space-between", color: t.text }}>
                  Notificări <span onClick={() => setShowNotif(false)} style={{ cursor: "pointer", color: t.textFaint }}>✕</span>
                </div>
                {notifs.length === 0 && <div style={{ padding: "2rem", textAlign: "center", color: t.textFaint }}>Nicio notificare</div>}
                {notifs.slice(0, 10).map(n => (
                  <div key={n._id} style={{ padding: "10px 16px", borderBottom: `1px solid ${t.border}`, background: n.read ? "transparent" : t.notifUnread, display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 18 }}>{n.type === "like" ? "❤️" : n.type === "follow" ? "👤" : "💬"}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, color: t.textMuted }}>
                        <b style={{ color: t.text }}>{n.sender?.username}</b> {n.type === "like" ? "a dat like la postarea ta" : n.type === "follow" ? "a început să te urmărească" : "a comentat la postarea ta"}
                      </div>
                      <div style={{ fontSize: 11, color: t.textFaint, marginTop: 2 }}>{new Date(n.createdAt).toLocaleDateString("ro-RO")}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: "relative" }}>
            <div onClick={() => setShowMenu(!showMenu)} style={{ width: 34, height: 34, borderRadius: "50%", overflow: "hidden", cursor: "pointer", border: `2px solid ${t.border}` }}>
              <Avatar user={user} size={30} />
            </div>
            {showMenu && (
              <div style={{ position: "absolute", top: "calc(100% + 8px)", right: 0, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 10, zIndex: 300, overflow: "hidden", minWidth: 170 }}>
                <div onClick={() => { navigate(`/profile/${user._id}`); setShowMenu(false); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${t.border}`, color: t.text }}>👤 Profilul meu</div>
                <div onClick={() => { navigate("/saved"); setShowMenu(false); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${t.border}`, color: t.text }}>🔖 Postări salvate</div>
                <div onClick={() => { navigate("/members"); setShowMenu(false); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${t.border}`, color: t.text }}>👥 Membri</div>
                <div onClick={() => { navigate("/minigame"); setShowMenu(false); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${t.border}`, color: t.text }}>🎮 Minijoc</div>
                <div onClick={() => { navigate("/settings"); setShowMenu(false); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${t.border}`, color: t.text }}>🎨 Setări & Temă</div>
                {user?.isAdmin && <div onClick={() => { navigate("/admin"); setShowMenu(false); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, borderBottom: `1px solid ${t.border}`, color: t.accent }}>⚙️ Panel Admin</div>}
                <div onClick={() => { logout(); navigate("/auth"); }} style={{ padding: "10px 16px", cursor: "pointer", fontSize: 14, color: "#e74c3c" }}>🚪 Deconectare</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PAGE CONTENT */}
      <div style={{ maxWidth: 680, margin: "0 auto", paddingBottom: 80 }}>
        <PageTransition>
          <Outlet />
        </PageTransition>
      </div>

      {/* SCROLL TO TOP */}
      {showScrollTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          style={{
            position: "fixed",
            bottom: 80,
            right: 16,
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: t.accent,
            border: "none",
            color: "#fff",
            fontSize: 18,
            cursor: "pointer",
            zIndex: 200,
            boxShadow: `0 4px 16px ${t.shadow}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            animation: "fadeIn 0.2s ease",
          }}
          title="Înapoi sus"
        >
          ↑
        </button>
      )}

      {/* BOTTOM NAV */}
      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: t.bg, borderTop: `1px solid ${t.border}`, display: "flex", zIndex: 100 }}>
        {navItems.map(tab => {
          const isHome = tab.path === "/";
          const active = isHome ? location.pathname === "/" : location.pathname.startsWith(tab.path.replace(`/profile/${user?._id}`, "/profile"));
          return (
            <button key={tab.path} onClick={() => navigate(tab.path)}
              style={{ flex: 1, padding: "10px 0 14px", background: "transparent", border: "none", color: active ? t.accent : t.textFaint, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2, position: "relative" }}>
              <span style={{ fontSize: 20 }}>{tab.icon}</span>
              {tab.badge > 0 && (
                <span style={{ position: "absolute", top: 6, left: "calc(50% + 6px)", background: t.accent, borderRadius: "50%", width: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontWeight: 700, color: "#fff" }}>
                  {tab.badge > 9 ? "9+" : tab.badge}
                </span>
              )}
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 400 }}>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {showPostModal && <PostModal onClose={() => setShowPostModal(false)} />}
    </div>
  );
}
