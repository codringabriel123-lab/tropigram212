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
  const [showSongInput, setShowSongInput] = useState(false);
  const [songUrl, setSongUrl] = useState("");
  const fileInputRef = useRef();

  function detectSong(url) {
    if (!url) return null;
    const yt = url.match(
      /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
    );
    if (yt) return { type: "youtube", embedId: yt[1] };
    const sp = url.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
    if (sp) return { type: "spotify", embedId: sp[1] };
    return null;
  }

  const songPreview = detectSong(songUrl.trim());
  const songUrlInvalid = songUrl.trim().length > 0 && !songPreview;

  const removeSong = () => {
    setSongUrl("");
    setShowSongInput(false);
  };

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
    if (songUrlInvalid) {
      setError("Link de melodie invalid. Folosește un link YouTube sau Spotify.");
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
        songUrl: songPreview ? songUrl.trim() : "",
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

        {showSongInput && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <input
                type="text"
                placeholder="Lipește un link YouTube sau Spotify..."
                value={songUrl}
                onChange={e => setSongUrl(e.target.value)}
                style={{
                  flex: 1,
                  background: "#111",
                  border: `1px solid ${songUrlInvalid ? "#e91e8c" : "#2a2a2a"}`,
                  borderRadius: 10,
                  padding: "10px 12px",
                  color: "#fff",
                  fontSize: 13,
                }}
                autoFocus
              />
              <button
                onClick={removeSong}
                style={{ background: "transparent", border: "none", color: "#555", fontSize: 16, cursor: "pointer", padding: 4 }}
                title="Elimină melodia"
              >✕</button>
            </div>
            {songPreview && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "8px 10px", background: "#111", borderRadius: 10, border: "1px solid #2a2a2a" }}>
                <span style={{ fontSize: 16 }}>{songPreview.type === "youtube" ? "▶️" : "🎵"}</span>
                <span style={{ fontSize: 12, color: "#aaa" }}>
                  Melodie {songPreview.type === "youtube" ? "YouTube" : "Spotify"} detectată
                </span>
              </div>
            )}
            {songUrlInvalid && (
              <p style={{ fontSize: 12, color: "#e91e8c", marginTop: 6 }}>
                Link nerecunoscut. Folosește un link YouTube sau Spotify valid.
              </p>
            )}
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

            <button
              onClick={() => setShowSongInput(s => !s)}
              style={{
                background: showSongInput ? "#e91e8c22" : "#111",
                border: `1px solid ${showSongInput ? "#e91e8c" : "#333"}`,
                borderRadius: 8,
                color: showSongInput ? "#e91e8c" : "#aaa",
                cursor: "pointer",
                padding: "8px 12px",
                fontSize: 18,
              }}
              title="Adaugă melodie"
            >🎵</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: content.length > 1800 ? "#e91e8c" : "#555" }}>{content.length}/2000</span>
            <button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && !imageBase64) || songUrlInvalid}
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
