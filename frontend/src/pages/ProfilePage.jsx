import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";

const ROLE_COLORS = { Civil: "#888", Politie: "#4a90e2", Mecanic: "#f5a623", Pompier: "#e74c3c", Medic: "#2ecc71", Admin: "#e91e8c" };

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});

  const isMe = id === me?._id;

  useEffect(() => {
    setLoading(true);
    Promise.all([api.get(`/users/${id}`), api.get(`/posts/user/${id}`)])
      .then(([u, p]) => {
        setProfile(u.data);
        setPosts(p.data);
        setFollowing(u.data.followers?.map(f => f._id || f).map(String).includes(String(me?._id)));
        setEditForm({ displayName: u.data.displayName, bio: u.data.bio || "", location: u.data.location || "", role: u.data.role });
      })
      .finally(() => setLoading(false));
  }, [id]);

  const handleFollow = async () => {
    try {
      const res = await api.put(`/users/${id}/follow`);
      setFollowing(res.data.following);
      setProfile(prev => ({
        ...prev,
        followers: res.data.following
          ? [...prev.followers, { _id: me._id, username: me.username, avatar: me.avatar }]
          : prev.followers.filter(f => (f._id || f).toString() !== me._id.toString())
      }));
    } catch {}
  };

  const handleSave = async () => {
    try {
      const res = await api.put("/users/me/update", editForm);
      setProfile(prev => ({ ...prev, ...res.data }));
      updateUser(res.data);
      setEditMode(false);
    } catch {}
  };

  const handleDeletePost = (postId) => setPosts(prev => prev.filter(p => p._id !== postId));

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;
  if (!profile) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Profil negăsit</div>;

  return (
    <div>
      {/* Profile Header */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          <Avatar user={profile} size={72} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18 }}>{profile.displayName}</div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>@{profile.username}</div>
            <span style={{ fontSize: 11, color: ROLE_COLORS[profile.role] || "#888", background: "#111", padding: "3px 10px", borderRadius: 20, border: `1px solid ${ROLE_COLORS[profile.role] || "#333"}` }}>
              {profile.role}
            </span>
          </div>
        </div>

        {profile.bio && <p style={{ fontSize: 14, color: "#ccc", marginBottom: 12, lineHeight: 1.5 }}>{profile.bio}</p>}
        {profile.location && <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>📍 {profile.location}</div>}

        <div style={{ display: "flex", gap: 24, marginBottom: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{posts.length}</div>
            <div style={{ fontSize: 12, color: "#666" }}>postări</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.followers?.length || 0}</div>
            <div style={{ fontSize: 12, color: "#666" }}>urmăritori</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.following?.length || 0}</div>
            <div style={{ fontSize: 12, color: "#666" }}>urmăriți</div>
          </div>
        </div>

        {isMe ? (
          <button onClick={() => setEditMode(!editMode)}
            style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
            {editMode ? "Anulează" : "Editează profilul"}
          </button>
        ) : (
          <button onClick={handleFollow}
            style={{ width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${following ? "#333" : "#e91e8c"}`, background: following ? "transparent" : "#e91e8c", color: following ? "#888" : "#fff", fontWeight: 600, cursor: "pointer", marginBottom: 16 }}>
            {following ? "Urmărești ✓" : "Urmărește"}
          </button>
        )}

        {editMode && (
          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #2a2a2a" }}>
            <input placeholder="Nume afișat" value={editForm.displayName} onChange={e => setEditForm(p => ({ ...p, displayName: e.target.value }))}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 8 }} />
            <textarea placeholder="Bio (max 200 caractere)" value={editForm.bio} onChange={e => setEditForm(p => ({ ...p, bio: e.target.value }))} rows={3}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 8, resize: "none" }} />
            <input placeholder="Locație" value={editForm.location} onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 8 }} />
            <select value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 12 }}>
              {["Civil", "Politie", "Mecanic", "Pompier", "Medic"].map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <button onClick={handleSave}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer" }}>
              Salvează modificările
            </button>
          </div>
        )}

        <div style={{ borderBottom: "1px solid #1f1f1f", marginBottom: 0 }} />
      </div>

      {/* Posts */}
      {posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem", color: "#555" }}>
          <div style={{ fontSize: 32, marginBottom: 8 }}>📭</div>
          <div>Nicio postare încă</div>
        </div>
      ) : (
        posts.map(p => <PostCard key={p._id} post={p} onDelete={handleDeletePost} />)
      )}
    </div>
  );
}
