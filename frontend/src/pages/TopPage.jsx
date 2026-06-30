import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { getRoleColor } from "../utils/roleUtils";
import api from "../api";
import Avatar from "../components/Avatar";

const TABS = [
  { key: "topOverall", label: "General", icon: "⭐", field: "score", suffix: " pct" },
  { key: "topFollowers", label: "Urmăritori", icon: "👥", field: "followerCount", suffix: " fans" },
  { key: "topPosts", label: "Postări", icon: "📝", field: "postCount", suffix: " posturi" },
  { key: "topLikes", label: "Like-uri", icon: "❤️", field: "likeCount", suffix: " likes" },
];

const MEDALS = ["🥇", "🥈", "🥉"];

function TopSkeleton({ t }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 24, padding: "0 8px" }}>
        {[70, 90, 55].map((h, i) => (
          <div key={i} style={{ flex: i === 1 ? 1.2 : 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: t.border, marginBottom: 8, opacity: 0.5 }} />
            <div style={{ width: "100%", height: h, background: t.border, opacity: 0.3, borderRadius: "8px 8px 0 0" }} />
          </div>
        ))}
      </div>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ height: 58, background: t.surface, border: `1px solid ${t.border}`, borderRadius: 12, marginBottom: 6, opacity: 0.6 }} />
      ))}
    </div>
  );
}

export default function TopPage() {
  const { theme: t } = useTheme();
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState("topOverall");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = () => {
    setLoading(true);
    setError(false);
    api.get("/users/leaderboard/all")
      .then(res => setData(res.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const currentTab = TABS.find(t => t.key === tab);
  const list = data?.[tab] || [];

  // podium — top 3
  const podium = list.slice(0, 3);
  const rest = list.slice(3);

  return (
    <div style={{ padding: "16px", maxWidth: 600, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <div style={{ fontSize: 36 }}>🏆</div>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: t.text, marginTop: 4 }}>Top Membri</h2>
        <div style={{ fontSize: 13, color: t.textMuted }}>Cine domină TropicaRP?</div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, background: t.surface, borderRadius: 14, padding: 4 }}>
        {TABS.map(tb => (
          <button key={tb.key} onClick={() => setTab(tb.key)} style={{
            flex: 1, padding: "8px 4px", borderRadius: 10, border: "none",
            background: tab === tb.key ? t.accent : "transparent",
            color: tab === tb.key ? "#fff" : t.textMuted,
            fontWeight: tab === tb.key ? 700 : 400,
            fontSize: 12, cursor: "pointer", transition: "all 0.18s",
            display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
          }}>
            <span style={{ fontSize: 16 }}>{tb.icon}</span>
            {tb.label}
          </button>
        ))}
      </div>

      {loading && <TopSkeleton t={t} />}

      {!loading && error && (
        <div style={{ textAlign: "center", padding: "3rem", color: t.textFaint }}>
          <div style={{ fontSize: 28, marginBottom: 8 }}>⚠️</div>
          Nu am putut încărca topul.
          <div>
            <button onClick={load} style={{ marginTop: 12, padding: "8px 18px", borderRadius: 10, border: `1px solid ${t.accent}`, background: "transparent", color: t.accent, fontWeight: 700, cursor: "pointer" }}>
              Reîncearcă
            </button>
          </div>
        </div>
      )}

      {!loading && !error && list.length === 0 && (
        <div style={{ textAlign: "center", padding: "3rem", color: t.textFaint }}>Niciun rezultat</div>
      )}

      {!loading && !error && list.length > 0 && (
        <>
          {/* PODIUM */}
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 12, marginBottom: 24, padding: "0 8px" }}>
            {/* 2nd */}
            {podium[1] && (
              <PodiumCard user={podium[1]} rank={2} field={currentTab.field} suffix={currentTab.suffix} t={t} navigate={navigate} me={me} />
            )}
            {/* 1st */}
            {podium[0] && (
              <PodiumCard user={podium[0]} rank={1} field={currentTab.field} suffix={currentTab.suffix} t={t} navigate={navigate} me={me} />
            )}
            {/* 3rd */}
            {podium[2] && (
              <PodiumCard user={podium[2]} rank={3} field={currentTab.field} suffix={currentTab.suffix} t={t} navigate={navigate} me={me} />
            )}
          </div>

          {/* REST */}
          {rest.map((u, i) => {
            const isMe = u._id === me?._id;
            return (
              <div key={u._id} onClick={() => navigate(`/profile/${u._id}`)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 14px", marginBottom: 6,
                  background: isMe ? `${t.accent}18` : t.surface,
                  border: `1px solid ${isMe ? t.accent : t.border}`,
                  borderRadius: 12, cursor: "pointer",
                  transition: "opacity 0.15s",
                }}>
                <div style={{ width: 28, textAlign: "center", fontWeight: 800, color: t.textFaint, fontSize: 14 }}>
                  #{i + 4}
                </div>
                <Avatar user={u} size={38} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: t.text, display: "flex", alignItems: "center", gap: 6 }}>
                    {u.displayName || u.username}
                    {isMe && <span style={{ fontSize: 10, background: t.accent, color: "#fff", borderRadius: 6, padding: "1px 6px" }}>TU</span>}
                  </div>
                  <div style={{ fontSize: 11, color: getRoleColor(u) }}>{u.role}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: t.accent }}>{u[currentTab.field]}</div>
                  <div style={{ fontSize: 10, color: t.textFaint }}>{currentTab.icon}</div>
                </div>
              </div>
            );
          })}

          {/* My rank */}
          <MyRankBar list={list} me={me} tab={tab} currentTab={currentTab} t={t} navigate={navigate} />
        </>
      )}
    </div>
  );
}

function PodiumCard({ user, rank, field, suffix, t, navigate, me }) {
  const heights = { 1: 90, 2: 70, 3: 55 };
  const sizes = { 1: 54, 2: 44, 3: 40 };
  const isMe = user._id === me?._id;

  return (
    <div onClick={() => navigate(`/profile/${user._id}`)}
      style={{ flex: rank === 1 ? 1.2 : 1, display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" }}>
      <div style={{ fontSize: rank === 1 ? 26 : 20, marginBottom: 4 }}>
        {rank === 1 ? "🥇" : rank === 2 ? "🥈" : "🥉"}
      </div>
      <div style={{
        width: sizes[rank], height: sizes[rank], borderRadius: "50%",
        border: `3px solid ${rank === 1 ? "#ffd700" : rank === 2 ? "#c0c0c0" : "#cd7f32"}`,
        overflow: "hidden", marginBottom: 6,
        boxShadow: rank === 1 ? `0 0 20px #ffd70044` : "none",
      }}>
        <Avatar user={user} size={sizes[rank]} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 12, color: t.text, textAlign: "center", maxWidth: 80, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.displayName || user.username}
        {isMe && " 👈"}
      </div>
      <div style={{ fontWeight: 800, fontSize: rank === 1 ? 18 : 14, color: rank === 1 ? "#ffd700" : t.accent }}>
        {user[field]}
      </div>
      <div style={{
        width: "100%", height: heights[rank],
        background: rank === 1
          ? `linear-gradient(180deg, #ffd70033, ${t.surface})`
          : rank === 2
          ? `linear-gradient(180deg, #c0c0c033, ${t.surface})`
          : `linear-gradient(180deg, #cd7f3233, ${t.surface})`,
        borderRadius: "8px 8px 0 0",
        border: `1px solid ${t.border}`,
        borderBottom: "none",
        marginTop: 6,
      }} />
    </div>
  );
}

function MyRankBar({ list, me, currentTab, t, navigate }) {
  const myPos = list.findIndex(u => u._id === me?._id);
  if (myPos < 3 || myPos === -1) return null;
  const myUser = list[myPos];
  return (
    <div style={{ marginTop: 12, padding: "12px 14px", background: `${t.accent}18`, border: `1px solid ${t.accent}`, borderRadius: 12 }}>
      <div style={{ fontSize: 11, color: t.accent, fontWeight: 700, marginBottom: 6 }}>📍 Poziția ta</div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }} onClick={() => navigate(`/profile/${me._id}`)}>
        <div style={{ width: 28, textAlign: "center", fontWeight: 800, color: t.accent }}>#{myPos + 1}</div>
        <Avatar user={myUser} size={36} />
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: t.text }}>{myUser.displayName || myUser.username}</div>
          <div style={{ fontSize: 11, color: t.textMuted }}>{myUser.role}</div>
        </div>
        <div style={{ fontWeight: 700, color: t.accent }}>{myUser[currentTab.field]} {currentTab.icon}</div>
      </div>
    </div>
  );
}
