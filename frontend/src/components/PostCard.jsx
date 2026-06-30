import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";
import { getRoleColor, getRoleName } from "../utils/roleUtils";

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return "acum";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}z`;
}

export default function PostCard({ post: initialPost, onDelete }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [post, setPost] = useState(initialPost);
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [loadingComment, setLoadingComment] = useState(false);
  // Reply la comentariu
  const [replyingTo, setReplyingTo] = useState(null); // { id, username }
  // Tag (@username) autocomplete
  const [tagQuery, setTagQuery] = useState("");
  const [tagResults, setTagResults] = useState([]);
  // Salveaza postare
  const [saved, setSaved] = useState(!!initialPost.isSavedByMe);
  const [savingPost, setSavingPost] = useState(false);
  // Repost
  const [showRepostModal, setShowRepostModal] = useState(false);
  const [repostComment, setRepostComment] = useState("");
  const [reposting, setReposting] = useState(false);

  // Daca postarea e un repost, lucram cu postarea originala pentru continut/actiuni,
  // dar pastram header-ul "X a repostat" separat
  const isRepost = !!post.repostOf;
  const displayPost = isRepost ? post.repostOf : post;
  const reposter = isRepost ? post.author : null;

  const isLiked = displayPost.likes?.map(id => id.toString()).includes(user?._id?.toString());
  const isOwner = post.author?._id === user?._id || post.author === user?._id;
  const isAdmin = user?.isAdmin;
  const alreadyReposted = displayPost.repostedByMe === true;

  const handleLike = async () => {
    try {
      const res = await api.put(`/posts/${displayPost._id}/like`);
      setPost(prev => isRepost
        ? { ...prev, repostOf: { ...prev.repostOf, likes: res.data.likes } }
        : { ...prev, likes: res.data.likes });
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setLoadingComment(true);
    try {
      const res = await api.post(`/posts/${displayPost._id}/comment`, {
        text: commentText.trim(),
        replyTo: replyingTo?.id || undefined,
      });
      setPost(prev => isRepost
        ? { ...prev, repostOf: { ...prev.repostOf, comments: [...(prev.repostOf.comments || []), res.data] } }
        : { ...prev, comments: [...(prev.comments || []), res.data] });
      setCommentText("");
      setReplyingTo(null);
      setTagResults([]);
    } catch {}
    setLoadingComment(false);
  };

  // Pornește un reply la un comentariu - prefillează cu @username
  const startReply = (comment) => {
    setReplyingTo({ id: comment._id, username: comment.author?.username });
    setCommentText(`@${comment.author?.username} `);
    setShowComments(true);
  };

  // Detectează @tag în curs de scriere si caută sugestii de useri
  const handleCommentTextChange = async (val) => {
    setCommentText(val);
    const match = val.match(/@([a-zA-Z0-9_]{1,30})$/);
    if (match) {
      const q = match[1];
      try {
        const res = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
        setTagResults(res.data.slice(0, 5));
      } catch { setTagResults([]); }
    } else {
      setTagResults([]);
    }
  };

  // Selectează un user din sugestiile de tag și îl introduce în text
  const pickTagSuggestion = (u) => {
    const newText = commentText.replace(/@([a-zA-Z0-9_]{1,30})$/, `@${u.username} `);
    setCommentText(newText);
    setTagResults([]);
  };

  // Randează textul unui comentariu evidențiind @tag-urile (clic -> profilul userului)
  const renderCommentText = (comment) => {
    const parts = comment.text.split(/(@[a-zA-Z0-9_]{1,30})/g);
    return parts.map((part, i) => {
      const m = part.match(/^@([a-zA-Z0-9_]{1,30})$/);
      if (!m) return <span key={i}>{part}</span>;
      const mentioned = comment.mentions?.find(u => u.username?.toLowerCase() === m[1].toLowerCase());
      if (!mentioned) return <span key={i}>{part}</span>;
      return (
        <span
          key={i}
          onClick={(e) => { e.stopPropagation(); navigate(`/profile/${mentioned._id}`); }}
          style={{ color: "#e91e8c", fontWeight: 600, cursor: "pointer" }}
        >
          {part}
        </span>
      );
    });
  };

  const handleDelete = async () => {
    if (!window.confirm("Ești sigur că vrei să ștergi această postare?")) return;
    try {
      await api.delete(`/posts/${post._id}`);
      onDelete?.(post._id);
    } catch {}
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.delete(`/posts/${displayPost._id}/comment/${commentId}`);
      setPost(prev => isRepost
        ? { ...prev, repostOf: { ...prev.repostOf, comments: prev.repostOf.comments.filter(c => c._id !== commentId) } }
        : { ...prev, comments: prev.comments.filter(c => c._id !== commentId) });
    } catch {}
  };

  // Salveaza / desalveaza postarea curenta (originalul, nu reposturile)
  const handleSave = async () => {
    if (savingPost) return;
    setSavingPost(true);
    try {
      const res = await api.put(`/posts/${displayPost._id}/save`);
      setSaved(res.data.saved);
    } catch {}
    setSavingPost(false);
  };

  // Reposteaza (cu sau fara comentariu propriu) - sau anuleaza repost-ul existent
  const handleRepostToggle = async () => {
    if (alreadyReposted) {
      try {
        await api.delete(`/posts/${displayPost._id}/repost`);
        setPost(prev => isRepost
          ? { ...prev, repostOf: { ...prev.repostOf, repostedByMe: false } }
          : { ...prev, repostedByMe: false });
      } catch {}
      return;
    }
    setShowRepostModal(true);
  };

  const submitRepost = async () => {
    if (reposting) return;
    setReposting(true);
    try {
      await api.post(`/posts/${displayPost._id}/repost`, { comment: repostComment.trim() });
      setPost(prev => isRepost
        ? { ...prev, repostOf: { ...prev.repostOf, repostedByMe: true } }
        : { ...prev, repostedByMe: true });
      setShowRepostModal(false);
      setRepostComment("");
    } catch (err) {
      alert(err.response?.data?.message || "Eroare la repostare");
    }
    setReposting(false);
  };

  const content = displayPost.content || "";
  const hashtags = content.match(/#\w+/g) || [];
  const cleanContent = content.replace(/#\w+/g, "").trim();

  return (
    <div style={{ borderBottom: "1px solid #1a1a1a" }}>
      {/* Header repost - indica cine a repostat */}
      {isRepost && (
        <div
          onClick={() => navigate(`/profile/${reposter?._id}`)}
          style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 16px 0", fontSize: 12, color: "#888", cursor: "pointer" }}
        >
          <span style={{ fontSize: 13 }}>🔁</span>
          <span>
            <b style={{ color: "#aaa" }}>{reposter?.displayName || reposter?.username}</b> a repostat
          </span>
        </div>
      )}

      {/* Comentariu propriu adaugat la repostare (daca exista) */}
      {isRepost && post.content && (
        <div style={{ padding: "6px 16px 0" }}>
          <p style={{ fontSize: 14, lineHeight: 1.5, color: "#ddd" }}>{post.content}</p>
        </div>
      )}

      <div style={isRepost ? { margin: "10px 12px 0", border: "1px solid #222", borderRadius: 12, overflow: "hidden" } : undefined}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 8px" }}>
        <div onClick={() => navigate(`/profile/${displayPost.author?._id}`)} style={{ cursor: "pointer" }}>
          <Avatar user={displayPost.author} size={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div onClick={() => navigate(`/profile/${displayPost.author?._id}`)} style={{ fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {displayPost.author?.displayName || displayPost.author?.username}
            {displayPost.author?.isVerified && <VerifiedBadge size={15} />}
          </div>
          <div style={{ fontSize: 12, color: "#555" }}>
            @{displayPost.author?.username}
            {displayPost.location && <span> · 📍 {displayPost.location}</span>}
          </div>
        </div>
        <div style={{ fontSize: 12, color: "#555" }}>{timeAgo(displayPost.createdAt)}</div>
        {(isOwner || isAdmin) && (
          <button onClick={handleDelete} style={{ background: "transparent", border: "none", color: "#555", fontSize: 14, cursor: "pointer", padding: "4px 8px" }} title="Șterge">🗑️</button>
        )}
      </div>

      {/* Continut text */}
      {(cleanContent || hashtags.length > 0) && (
        <div style={{ padding: "2px 16px 10px" }}>
          {cleanContent && <p style={{ fontSize: 14, lineHeight: 1.6, color: "#ddd", marginBottom: hashtags.length ? 4 : 0 }}>{cleanContent}</p>}
          {hashtags.length > 0 && (
            <p style={{ fontSize: 13 }}>
              {hashtags.map((t, i) => <span key={i} style={{ color: "#e91e8c", marginRight: 6 }}>{t}</span>)}
            </p>
          )}
        </div>
      )}

      {/* Melodie */}
      {displayPost.song?.embedId && (
        <div style={{ padding: "0 16px 10px" }}>
          {displayPost.song.type === "youtube" ? (
            <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 10, overflow: "hidden", border: "1px solid #2a2a2a" }}>
              <iframe
                src={`https://www.youtube.com/embed/${displayPost.song.embedId}`}
                title={displayPost.song.title || "Melodie"}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                loading="lazy"
              />
            </div>
          ) : displayPost.song.type === "spotify" ? (
            <iframe
              src={`https://open.spotify.com/embed/track/${displayPost.song.embedId}`}
              title={displayPost.song.title || "Melodie"}
              style={{ width: "100%", height: 152, border: "none", borderRadius: 10 }}
              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
              loading="lazy"
            />
          ) : null}
        </div>
      )}

      {/* Imagine postare */}
      {displayPost.image && (
        <div style={{ marginBottom: 4 }}>
          <img
            src={displayPost.image}
            alt="postare"
            style={{ width: "100%", maxHeight: 500, objectFit: "cover", display: "block" }}
            loading="lazy"
          />
        </div>
      )}

      {/* Video postare */}
      {displayPost.video && (
        <div style={{ marginBottom: 4 }}>
          <video
            src={displayPost.video}
            controls
            style={{ width: "100%", maxHeight: 500, display: "block", background: "#000" }}
          />
        </div>
      )}

      {/* Like, Comentarii, Repost si Salvare */}
      <div style={{ display: "flex", gap: 18, padding: "6px 16px 10px", alignItems: "center" }}>
        <button onClick={handleLike} style={{ background: "transparent", border: "none", color: isLiked ? "#e91e8c" : "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 22, padding: 0 }}>
          {isLiked ? "❤️" : "🤍"} <span style={{ fontSize: 14, color: isLiked ? "#e91e8c" : "#666" }}>{displayPost.likes?.length || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 20, padding: 0 }}>
          💬 <span style={{ fontSize: 14 }}>{displayPost.comments?.length || 0}</span>
        </button>
        <button
          onClick={handleRepostToggle}
          title={alreadyReposted ? "Anulează repost-ul" : "Repostează"}
          style={{ background: "transparent", border: "none", color: alreadyReposted ? "#2ecc71" : "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 20, padding: 0 }}
        >
          🔁
        </button>
        <button
          onClick={handleSave}
          disabled={savingPost}
          title={saved ? "Elimină din salvate" : "Salvează"}
          style={{ background: "transparent", border: "none", color: saved ? "#e91e8c" : "#666", cursor: "pointer", marginLeft: "auto", fontSize: 20, padding: 0 }}
        >
          {saved ? "🔖" : "🏷️"}
        </button>
      </div>

      {/* Sectiunea comentarii */}
      {showComments && (
        <div style={{ padding: "0 16px 16px" }}>
          {(() => {
            const all = displayPost.comments || [];
            const topLevel = all.filter(c => !c.replyTo);
            const repliesOf = (id) => all.filter(c => c.replyTo === id || c.replyTo?.toString?.() === id?.toString?.());
            const renderComment = (c, isReply) => (
              <div key={c._id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start", marginLeft: isReply ? 30 : 0 }}>
                <div onClick={() => navigate(`/profile/${c.author?._id}`)} style={{ cursor: "pointer" }}>
                  <Avatar user={c.author} size={isReply ? 24 : 28} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ background: "#1a1a1a", borderRadius: 10, padding: "6px 10px" }}>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>
                      {c.author?.username}
                      {c.author?.isVerified && <VerifiedBadge size={11} />}
                      {" "}
                    </span>
                    <span style={{ fontSize: 13, color: "#ccc" }}>{renderCommentText(c)}</span>
                  </div>
                  <div style={{ display: "flex", gap: 12, marginTop: 3, paddingLeft: 4 }}>
                    <span style={{ fontSize: 11, color: "#666", cursor: "pointer" }} onClick={() => startReply(c)}>Răspunde</span>
                    {(c.author?._id === user?._id || isAdmin) && (
                      <span style={{ fontSize: 11, color: "#666", cursor: "pointer" }} onClick={() => handleDeleteComment(c._id)}>Șterge</span>
                    )}
                  </div>
                  {repliesOf(c._id).map(r => renderComment(r, true))}
                </div>
              </div>
            );
            return topLevel.map(c => renderComment(c, false));
          })()}

          {replyingTo && (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#888", background: "#1a1a1a", borderRadius: 8, padding: "5px 10px", marginBottom: 6 }}>
              <span>Răspunzi lui <b style={{ color: "#e91e8c" }}>@{replyingTo.username}</b></span>
              <span style={{ cursor: "pointer" }} onClick={() => { setReplyingTo(null); setCommentText(""); }}>✕</span>
            </div>
          )}

          <div style={{ position: "relative" }}>
            <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
              <Avatar user={user} size={28} />
              <input
                placeholder="Adaugă un comentariu... (@ pentru a eticheta pe cineva)"
                value={commentText}
                onChange={e => handleCommentTextChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
                style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: "7px 14px", color: "#fff", fontSize: 13 }}
              />
              <button onClick={handleComment} disabled={loadingComment || !commentText.trim()} style={{ background: "transparent", border: "none", color: commentText.trim() ? "#e91e8c" : "#444", cursor: "pointer", fontSize: 18 }}>➤</button>
            </div>
            {tagResults.length > 0 && (
              <div style={{ position: "absolute", bottom: "100%", left: 36, marginBottom: 4, background: "#1a1a1a", border: "1px solid #333", borderRadius: 10, overflow: "hidden", zIndex: 50, width: 220 }}>
                {tagResults.map(u => (
                  <div key={u._id} onClick={() => pickTagSuggestion(u)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", cursor: "pointer" }}>
                    <Avatar user={u} size={22} />
                    <span style={{ fontSize: 12 }}>
                      {u.username}
                      {u.isVerified && <VerifiedBadge size={10} />}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      </div>

      {/* Modal repostare - permite adaugarea unui comentariu propriu */}
      {showRepostModal && (
        <div
          onClick={() => setShowRepostModal(false)}
          style={{ position: "fixed", inset: 0, background: "#000000bb", zIndex: 600, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
        >
          <div onClick={e => e.stopPropagation()} style={{ background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 14, width: "100%", maxWidth: 420, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>🔁 Repostează pe profilul tău</div>
            <textarea
              placeholder="Adaugă un comentariu (opțional)..."
              value={repostComment}
              onChange={e => setRepostComment(e.target.value.slice(0, 2000))}
              rows={3}
              style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: 10, color: "#fff", fontSize: 13, resize: "none", boxSizing: "border-box", marginBottom: 12 }}
              autoFocus
            />
            <div style={{ background: "#111", border: "1px solid #222", borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12, color: "#888" }}>
              <b style={{ color: "#aaa" }}>{displayPost.author?.displayName || displayPost.author?.username}</b>: {(displayPost.content || "").slice(0, 100)}{(displayPost.content || "").length > 100 ? "…" : ""}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={() => setShowRepostModal(false)}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
                Anulează
              </button>
              <button onClick={submitRepost} disabled={reposting}
                style={{ flex: 1, padding: "10px", borderRadius: 8, border: "none", background: "#2ecc71", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: reposting ? 0.7 : 1 }}>
                {reposting ? "Se repostează..." : "Repostează"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
