import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "./Avatar";

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

  const isLiked = post.likes?.map(id => id.toString()).includes(user?._id?.toString());
  const isOwner = post.author?._id === user?._id || post.author === user?._id;
  const isAdmin = user?.isAdmin;

  const handleLike = async () => {
    try {
      const res = await api.put(`/posts/${post._id}/like`);
      setPost(prev => ({ ...prev, likes: res.data.likes }));
    } catch {}
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;
    setLoadingComment(true);
    try {
      const res = await api.post(`/posts/${post._id}/comment`, { text: commentText.trim() });
      setPost(prev => ({ ...prev, comments: [...(prev.comments || []), res.data] }));
      setCommentText("");
    } catch {}
    setLoadingComment(false);
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
      await api.delete(`/posts/${post._id}/comment/${commentId}`);
      setPost(prev => ({ ...prev, comments: prev.comments.filter(c => c._id !== commentId) }));
    } catch {}
  };

  const content = post.content || "";
  const hashtags = content.match(/#\w+/g) || [];
  const cleanContent = content.replace(/#\w+/g, "").trim();

  return (
    <div style={{ borderBottom: "1px solid #1a1a1a" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px 8px" }}>
        <div onClick={() => navigate(`/profile/${post.author?._id}`)} style={{ cursor: "pointer" }}>
          <Avatar user={post.author} size={40} />
        </div>
        <div style={{ flex: 1 }}>
          <div onClick={() => navigate(`/profile/${post.author?._id}`)} style={{ fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            {post.author?.username}
          </div>
          {post.location && <div style={{ fontSize: 12, color: "#666" }}>📍 {post.location}</div>}
        </div>
        <div style={{ fontSize: 12, color: "#555" }}>{timeAgo(post.createdAt)}</div>
        {(isOwner || isAdmin) && (
          <button onClick={handleDelete} style={{ background: "transparent", border: "none", color: "#555", fontSize: 14, cursor: "pointer", padding: "4px 8px" }} title="Șterge">🗑️</button>
        )}
      </div>

      <div style={{ padding: "2px 16px 10px" }}>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: "#ddd", marginBottom: hashtags.length ? 4 : 0 }}>{cleanContent}</p>
        {hashtags.length > 0 && (
          <p style={{ fontSize: 13 }}>
            {hashtags.map((t, i) => <span key={i} style={{ color: "#e91e8c", marginRight: 6 }}>{t}</span>)}
          </p>
        )}
      </div>

      <div style={{ display: "flex", gap: 20, padding: "6px 16px 10px", alignItems: "center" }}>
        <button onClick={handleLike} style={{ background: "transparent", border: "none", color: isLiked ? "#e91e8c" : "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 22, padding: 0 }}>
          {isLiked ? "❤️" : "🤍"} <span style={{ fontSize: 14, color: isLiked ? "#e91e8c" : "#666" }}>{post.likes?.length || 0}</span>
        </button>
        <button onClick={() => setShowComments(!showComments)} style={{ background: "transparent", border: "none", color: "#666", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 20, padding: 0 }}>
          💬 <span style={{ fontSize: 14 }}>{post.comments?.length || 0}</span>
        </button>
      </div>

      {showComments && (
        <div style={{ padding: "0 16px 16px" }}>
          {post.comments?.map(c => (
            <div key={c._id} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "flex-start" }}>
              <div onClick={() => navigate(`/profile/${c.author?._id}`)} style={{ cursor: "pointer" }}>
                <Avatar user={c.author} size={28} />
              </div>
              <div style={{ flex: 1, background: "#1a1a1a", borderRadius: 10, padding: "6px 10px" }}>
                <span style={{ fontWeight: 700, fontSize: 12 }}>{c.author?.username} </span>
                <span style={{ fontSize: 13, color: "#ccc" }}>{c.text}</span>
              </div>
              {(c.author?._id === user?._id || isAdmin) && (
                <button onClick={() => handleDeleteComment(c._id)} style={{ background: "transparent", border: "none", color: "#555", fontSize: 12, cursor: "pointer" }}>✕</button>
              )}
            </div>
          ))}
          <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
            <Avatar user={user} size={28} />
            <input
              placeholder="Adaugă un comentariu..."
              value={commentText}
              onChange={e => setCommentText(e.target.value)}
              onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleComment()}
              style={{ flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: "7px 14px", color: "#fff", fontSize: 13 }}
            />
            <button onClick={handleComment} disabled={loadingComment || !commentText.trim()} style={{ background: "transparent", border: "none", color: commentText.trim() ? "#e91e8c" : "#444", cursor: "pointer", fontSize: 18 }}>➤</button>
          </div>
        </div>
      )}
    </div>
  );
}
