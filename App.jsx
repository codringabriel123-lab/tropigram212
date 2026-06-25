import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "./Avatar";

const LOCATIONS = ["Vinewood Hills", "Vespucci Beach", "Rockford Hills", "Sandy Shores", "Mirror Park", "Downtown LS", "Del Perro", "Little Seoul", "Paleto Bay", "Grapeseed"];

export default function PostModal({ onClose, onPosted }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [location, setLocation] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePost = async () => {
    if (!content.trim()) { setError("Scrie ceva înainte să postezi!"); return; }
    setLoading(true);
    try {
      const res = await api.post("/posts", { content: content.trim(), location });
      onPosted?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Eroare la postare");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="fade-in" style={{ background: "#1a1a1a", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 680, padding: "24px 20px 40px", border: "1px solid #333" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Postare nouă</div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: 22 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "flex-start" }}>
          <Avatar user={user} size={42} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{user?.username}</div>
            <select value={location} onChange={e => setLocation(e.target.value)}
              style={{ background: "#111", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 12px", color: location ? "#fff" : "#666", fontSize: 12 }}>
              <option value="">📍 Fără locație</option>
              {LOCATIONS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <textarea
          placeholder="Ce se întâmplă în Los Santos? 🌴"
          value={content}
          onChange={e => setContent(e.target.value)}
          rows={5}
          autoFocus
          style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 12, padding: "12px 14px", color: "#fff", fontSize: 15, resize: "vertical", lineHeight: 1.6, marginBottom: 8 }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, color: content.length > 1800 ? "#e74c3c" : "#555" }}>{content.length}/2000</span>
          {error && <span style={{ fontSize: 12, color: "#e91e8c" }}>{error}</span>}
          <button onClick={handlePost} disabled={loading || !content.trim()}
            style={{ padding: "10px 28px", borderRadius: 20, border: "none", background: content.trim() ? "#e91e8c" : "#2a2a2a", color: content.trim() ? "#fff" : "#555", fontWeight: 700, fontSize: 14 }}>
            {loading ? "Se trimite..." : "Postează"}
          </button>
        </div>
      </div>
    </div>
  );
}
