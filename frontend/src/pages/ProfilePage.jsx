import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "../components/Avatar";
import PostCard from "../components/PostCard";
import { getRoleColor, getRoleName } from "../utils/roleUtils";
import { getRank } from "../utils/rankUtils";

const ROLES = ["Civil", "Politie", "Mecanic", "Pompier", "Medic"];

export default function ProfilePage() {
  const { id } = useParams();
  const { user: me, updateUser } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [following, setFollowing] = useState(false);
  const [followsMe, setFollowsMe] = useState(false);
  const [showFollowModal, setShowFollowModal] = useState(null); // "followers" | "following" | null
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const fileInputRef = useRef();
  const bannerInputRef = useRef();
  const [bannerPreview, setBannerPreview] = useState(null);
  const [bannerBase64, setBannerBase64] = useState(null);
  // 📊 Like count
  const [totalLikes, setTotalLikes] = useState(0);
  const [profileTab, setProfileTab] = useState("posts"); // "posts" | "reposts"

  const isMe = id === me?._id;

  useEffect(() => {
    setLoading(true);
    setEditMode(false);
    setAvatarPreview(null);
    setAvatarBase64(null);
    setProfileTab("posts");
    Promise.all([api.get(`/users/${id}`), api.get(`/posts/user/${id}`)])
      .then(([u, p]) => {
        setProfile(u.data);
        setPosts(p.data);
        setFollowing(u.data.followers?.map(f => f._id || f).map(String).includes(String(me?._id)));
        setFollowsMe(u.data.following?.map(f => f._id || f).map(String).includes(String(me?._id)));
        setEditForm({
          displayName: u.data.displayName,
          bio: u.data.bio || "",
          location: u.data.location || "",
          role: u.data.role,
        });
      })
      .finally(() => setLoading(false));
  }, [id]);

  // Calculate total likes from posts
  useEffect(() => {
    if (posts && posts.length > 0) {
      setTotalLikes(posts.reduce((sum, p) => sum + (p.likes?.length || 0), 0));
    }
  }, [posts]);

  const handleBannerChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { alert("Imaginea e prea mare (max 8MB)"); return; }
    const reader = new FileReader();
    reader.onloadend = () => { setBannerPreview(reader.result); setBannerBase64(reader.result); };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Imaginea e prea mare (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result);
      setAvatarBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleFollow = async () => {
    try {
      const res = await api.put(`/users/${id}/follow`);
      setFollowing(res.data.following);
      setProfile(prev => ({
        ...prev,
        followers: res.data.following
          ? [...prev.followers, { _id: me._id, username: me.username, avatar: me.avatar }]
          : prev.followers.filter(f => (f._id || f).toString() !== me._id.toString()),
      }));
    } catch {}
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...editForm };
      if (avatarBase64) payload.avatarBase64 = avatarBase64;
      const res = await api.put("/users/me/update", payload);
      setProfile(prev => ({ ...prev, ...res.data }));
      updateUser(res.data);
      setEditMode(false);
      setAvatarPreview(null);
      setAvatarBase64(null);
    } catch (err) {
      alert(err.response?.data?.message || "Eroare la salvare");
    } finally {
      setSaving(false);
    }
  };

  const handleDeletePost = (postId) => setPosts(prev => prev.filter(p => p._id !== postId));

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;
  if (!profile) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Profil negăsit</div>;

  const displayAvatar = avatarPreview
    ? { avatar: avatarPreview }
    : profile;

  return (
    <div>
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
          {/* Avatar cu buton de upload dacă e profilul meu */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <Avatar user={displayAvatar} size={72} />
            {isMe && editMode && (
              <>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    position: "absolute", bottom: -2, right: -2,
                    width: 24, height: 24, borderRadius: "50%",
                    background: "#e91e8c", border: "2px solid #0d0d0d",
                    color: "#fff", fontSize: 12, cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                  title="Schimbă poza"
                >📷</button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  style={{ display: "none" }}
                />
              </>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", gap: 6 }}>
              {profile.displayName}
              {profile.isVerified && <span style={{ color: "#1da1f2", fontSize: 16 }} title="Cont verificat">✓</span>}
            </div>
            <div style={{ fontSize: 13, color: "#666", marginBottom: 4 }}>@{profile.username}</div>
            <span style={{ fontSize: 11, color: getRoleColor(profile), background: "#111", padding: "3px 10px", borderRadius: 20, border: `1px solid ${getRoleColor(profile)}` }}>
              {getRoleName(profile)}
            </span>
          </div>
        </div>

        {profile.bio && !editMode && (
          <p style={{ fontSize: 14, color: "#ccc", marginBottom: 12, lineHeight: 1.5 }}>{profile.bio}</p>
        )}
        {profile.location && !editMode && (
          <div style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>📍 {profile.location}</div>
        )}

        {/* 📊 Statistici */}
        <div style={{ display: "flex", gap: 16, marginBottom: 14, flexWrap: "wrap" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{posts.length}</div>
            <div style={{ fontSize: 12, color: "#666" }}>postări</div>
          </div>
          <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setShowFollowModal("followers")}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.followers?.length || 0}</div>
            <div style={{ fontSize: 12, color: "#e91e8c" }}>urmăritori</div>
          </div>
          <div style={{ textAlign: "center", cursor: "pointer" }} onClick={() => setShowFollowModal("following")}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{profile.following?.length || 0}</div>
            <div style={{ fontSize: 12, color: "#e91e8c" }}>urmăriți</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontWeight: 700, fontSize: 16 }}>{totalLikes}</div>
            <div style={{ fontSize: 12, color: "#f59e0b" }}>❤️ like-uri</div>
          </div>
        </div>

        {/* 🎖️ Rang/Nivel */}
        {(() => {
          const rank = getRank(posts.length);
          return (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14, background: "#111", borderRadius: 8, padding: "8px 12px", border: `1px solid ${rank.color}33` }}>
              <span style={{ fontSize: 18 }}>{rank.emoji}</span>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: rank.color }}>{rank.name}</div>
                <div style={{ fontSize: 10, color: "#555" }}>
                  pe server din {new Date(profile.createdAt).toLocaleDateString("ro-RO", { month: "long", year: "numeric" })}
                </div>
              </div>
            </div>
          );
        })()}

        {isMe ? (
          <button
            onClick={() => { setEditMode(!editMode); setAvatarPreview(null); setAvatarBase64(null); }}
            style={{ width: "100%", padding: "9px", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer", marginBottom: 16 }}
          >
            {editMode ? "Anulează" : "✏️ Editează profilul"}
          </button>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
            {followsMe && (
              <div style={{ fontSize: 12, color: "#888", textAlign: "center", background: "#1a1a1a", borderRadius: 8, padding: "4px 0" }}>
                Te urmărește
              </div>
            )}
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={handleFollow}
                style={{
                  flex: 1, padding: "9px", borderRadius: 10,
                  border: `1px solid ${following ? (followsMe ? "#e91e8c" : "#333") : "#e91e8c"}`,
                  background: following ? "transparent" : "#e91e8c",
                  color: following ? (followsMe ? "#e91e8c" : "#888") : "#fff",
                  fontWeight: 600, cursor: "pointer"
                }}
              >
                {following
                  ? (followsMe ? "🔁 Urmărire reciprocă" : "Urmărești ✓")
                  : (followsMe ? "Urmărește înapoi" : "Urmărește")}
              </button>
              <button
                onClick={() => navigate(`/messages?with=${profile._id}`)}
                style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 16 }}
                title="Trimite mesaj"
              >
                💬
              </button>
            </div>
          </div>
        )}

        {editMode && (
          <div style={{ background: "#1a1a1a", borderRadius: 12, padding: 16, marginBottom: 16, border: "1px solid #2a2a2a" }}>
            <label style={{ fontSize: 11, color: "#666", marginBottom: 4, display: "block" }}>Nume afișat</label>
            <input
              placeholder="Nume afișat"
              value={editForm.displayName}
              onChange={e => setEditForm(p => ({ ...p, displayName: e.target.value }))}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }}
            />

            <label style={{ fontSize: 11, color: "#666", marginBottom: 4, display: "block" }}>Biografie</label>
            <textarea
              placeholder="Spune ceva despre tine... (max 200 caractere)"
              value={editForm.bio}
              onChange={e => setEditForm(p => ({ ...p, bio: e.target.value.slice(0, 200) }))}
              rows={3}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 4, resize: "none", boxSizing: "border-box" }}
            />
            <div style={{ fontSize: 11, color: "#555", textAlign: "right", marginBottom: 10 }}>{editForm.bio.length}/200</div>

            <label style={{ fontSize: 11, color: "#666", marginBottom: 4, display: "block" }}>Locație</label>
            <input
              placeholder="Locație (ex: Los Santos)"
              value={editForm.location}
              onChange={e => setEditForm(p => ({ ...p, location: e.target.value }))}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 10, boxSizing: "border-box" }}
            />

            <label style={{ fontSize: 11, color: "#666", marginBottom: 4, display: "block" }}>Rol</label>
            <select
              value={editForm.role}
              onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, marginBottom: 14, boxSizing: "border-box" }}
            >
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>

            {avatarPreview && (
              <div style={{ marginBottom: 12, textAlign: "center" }}>
                <div style={{ fontSize: 12, color: "#888", marginBottom: 6 }}>Previzualizare avatar:</div>
                <img src={avatarPreview} alt="preview" style={{ width: 72, height: 72, borderRadius: "50%", objectFit: "cover", border: "2px solid #e91e8c" }} />
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{ width: "100%", padding: "10px", borderRadius: 8, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}
            >
              {saving ? "Se salvează..." : "💾 Salvează modificările"}
            </button>
          </div>
        )}

        <div style={{ borderBottom: "1px solid #1f1f1f", marginBottom: 0 }} />
      </div>

      {/* 📑 Tabs: Postări / Repostări */}
      {(() => {
        const ownPosts = posts.filter(p => !p.repostOf);
        const repostedPosts = posts.filter(p => p.repostOf);
        const activeList = profileTab === "posts" ? ownPosts : repostedPosts;

        return (
          <>
            <div style={{ display: "flex", borderBottom: "1px solid #1f1f1f" }}>
              <button
                onClick={() => setProfileTab("posts")}
                style={{
                  flex: 1, padding: "12px 0", background: "transparent", border: "none",
                  borderBottom: profileTab === "posts" ? "2px solid #e91e8c" : "2px solid transparent",
                  color: profileTab === "posts" ? "#fff" : "#666",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                📝 Postări ({ownPosts.length})
              </button>
              <button
                onClick={() => setProfileTab("reposts")}
                style={{
                  flex: 1, padding: "12px 0", background: "transparent", border: "none",
                  borderBottom: profileTab === "reposts" ? "2px solid #e91e8c" : "2px solid transparent",
                  color: profileTab === "reposts" ? "#fff" : "#666",
                  fontWeight: 700, fontSize: 13, cursor: "pointer",
                }}
              >
                🔁 Repostări ({repostedPosts.length})
              </button>
            </div>

            {activeList.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem", color: "#555" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>{profileTab === "posts" ? "📭" : "🔁"}</div>
                <div>{profileTab === "posts" ? "Nicio postare încă" : "Niciun repost încă"}</div>
              </div>
            ) : (
              activeList.map(p => <PostCard key={p._id} post={p} onDelete={handleDeletePost} />)
            )}
          </>
        );
      })()}

      {/* Modal urmăritori / urmăriți */}
      {showFollowModal && (
        <div
          onClick={() => setShowFollowModal(null)}
          style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 500, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, width: "100%", maxWidth: 360, maxHeight: "70vh", display: "flex", flexDirection: "column" }}>
            <div style={{ padding: "14px 16px", fontWeight: 700, fontSize: 15, borderBottom: "1px solid #222", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              {showFollowModal === "followers" ? "Urmăritori" : "Urmăriți"}
              <span onClick={() => setShowFollowModal(null)} style={{ cursor: "pointer", color: "#555", fontSize: 18 }}>✕</span>
            </div>
            <div style={{ overflowY: "auto", flex: 1 }}>
              {(showFollowModal === "followers" ? profile.followers : profile.following)?.length === 0 && (
                <div style={{ padding: "2rem", textAlign: "center", color: "#555", fontSize: 13 }}>Nimeni încă</div>
              )}
              {(showFollowModal === "followers" ? profile.followers : profile.following)?.map(u => {
                const uid = u._id || u;
                const uname = u.username || "...";
                const udisplay = u.displayName || uname;
                return (
                  <div
                    key={uid}
                    onClick={() => { setShowFollowModal(null); navigate(`/profile/${uid}`); }}
                    style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", cursor: "pointer", borderBottom: "1px solid #111" }}
                  >
                    <Avatar user={u} size={38} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13 }}>{udisplay}</div>
                      <div style={{ fontSize: 11, color: "#555" }}>@{uname}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
