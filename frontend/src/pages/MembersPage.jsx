import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import Avatar from "../components/Avatar";

const ROLE_COLORS = { Civil: "#888", Politie: "#4a90e2", Mecanic: "#f5a623", Pompier: "#e74c3c", Medic: "#2ecc71", Admin: "#e91e8c" };

export default function MembersPage() {
  const [users, setUsers] = useState([]);
  const [myUser, setMyUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setError(false);
    Promise.all([api.get("/users"), api.get("/auth/me")])
      .then(([u, me]) => { setUsers(u.data); setMyUser(me.data); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleFollow = async (targetId) => {
    try {
      const res = await api.put(`/users/${targetId}/follow`);
      setMyUser(prev => ({
        ...prev,
        following: res.data.following
          ? [...(prev.following || []), targetId]
          : (prev.following || []).filter(id => id !== targetId)
      }));
    } catch {}
  };

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;
  if (error) return (
    <div style={{ textAlign: "center", padding: "3rem", color: "#555" }}>
      Nu am putut încărca membrii. Verifică conexiunea și încearcă din nou.
    </div>
  );

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Membri ({users.length})</div>
      {users.map(u => {
        const isMe = u._id === myUser?._id;
        const isFollowing = myUser?.following?.map(id => id.toString()).includes(u._id.toString());
        return (
          <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #1f1f1f" }}>
            <div onClick={() => navigate(`/profile/${u._id}`)} style={{ cursor: "pointer" }}>
              <Avatar user={u} size={46} showOnline={true} friends={myUser?.following?.map(String) || []} />
            </div>
            <div style={{ flex: 1, cursor: "pointer" }} onClick={() => navigate(`/profile/${u._id}`)}>
              <div style={{ fontWeight: 700, fontSize: 14 }}>{u.username}</div>
              <div style={{ fontSize: 12, color: "#666" }}>{u.bio?.slice(0, 45)}</div>
              <span style={{ fontSize: 10, color: ROLE_COLORS[u.role] || "#888", background: "#111", padding: "2px 8px", borderRadius: 20, border: `1px solid ${ROLE_COLORS[u.role] || "#333"}`, marginTop: 4, display: "inline-block" }}>{u.role}</span>
            </div>
            <div style={{ fontSize: 12, color: "#555", textAlign: "center", marginRight: 8 }}>
              <div style={{ fontWeight: 700, color: "#fff" }}>{u.followers?.length || 0}</div>
              <div>urmăritori</div>
            </div>
            {!isMe && (
              <button onClick={() => handleFollow(u._id)}
                style={{ padding: "7px 16px", borderRadius: 20, border: `1px solid ${isFollowing ? "#333" : "#e91e8c"}`, background: isFollowing ? "transparent" : "#e91e8c", color: isFollowing ? "#888" : "#fff", fontWeight: 600, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>
                {isFollowing ? "Urmărești" : "Urmărește"}
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
