import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "./Avatar";

export default function PostModal({ onClose, onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imagePreview, setImagePreview] = useState(null);
  const [imageBase64, setImageBase64] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setError("Imaginea e prea mare (max 10MB)");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setImagePreview(reader.result);
      setImageBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeImage = () => {
    setImagePreview(null);
    setImageBase64(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim() && !imageBase64) {
      setError("Adaugă text sau o imagine");
      return;
    }
    setLoading(true);
    setError("");

    try {
      let imageUrl = "";

      // Upload imagine pe Cloudinary dacă există
      if (imageBase64) {
        setUploading(true);
        const uploadRes = await api.post("/upload", { data: imageBase64, folder: "posts" });
        imageUrl = uploadRes.data.url;
        setUploading(false);
      }

      const res = await api.post("/posts", {
        content: content.trim(),
        image: imageUrl,
      });

      onPost?.(res.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Eroare la postare");
      setUploading(false);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 500, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 600, background: "#1a1a1a", borderRadius: "16px 16px 0 0", padding: "20px 16px 32px", border: "1px solid #2a2a2a" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Postare nouă</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <Avatar user={user} size={40} />
          <textarea
            placeholder="Ce se întâmplă în Los Santos?"
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={4}
            maxLength={2000}
            style={{ flex: 1, background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: "10px 12px", color: "#fff", fontSize: 14, resize: "none", fontFamily: "inherit" }}
            autoFocus
          />
        </div>

        {imagePreview && (
          <div style={{ position: "relative", marginBottom: 12 }}>
            <img src={imagePreview} alt="preview" style={{ width: "100%", maxHeight: 300, objectFit: "cover", borderRadius: 10, border: "1px solid #333" }} />
            <button
              onClick={removeImage}
              style={{ position: "absolute", top: 8, right: 8, background: "#000000aa", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
          </div>
        )}

        {error && <p style={{ color: "#e91e8c", fontSize: 13, marginBottom: 10 }}>⚠️ {error}</p>}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => fileInputRef.current?.click()}
              style={{ background: "#111", border: "1px solid #333", borderRadius: 8, color: "#aaa", cursor: "pointer", padding: "8px 12px", fontSize: 18 }}
              title="Adaugă imagine"
            >🖼️</button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: content.length > 1800 ? "#e91e8c" : "#555" }}>{content.length}/2000</span>
            <button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !imageBase64)}
              style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, fontSize: 14 }}
            >
              {uploading ? "Se urcă..." : loading ? "Se postează..." : "Postează"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
