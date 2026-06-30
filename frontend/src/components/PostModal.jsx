import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";

export default function PostModal({ onClose, onPost }) {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState([]); // [base64,...] carusel
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoBase64, setVideoBase64] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showSongInput, setShowSongInput] = useState(false);
  const [songUrl, setSongUrl] = useState("");
  // 🟢 Vizibilitate — postare publică sau doar pentru Close Friends
  const [closeOnly, setCloseOnly] = useState(false);
  // 🏷️ Etichetează persoane în postare
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagSearch, setTagSearch] = useState("");
  const [tagSearchResults, setTagSearchResults] = useState([]);
  const [taggedUsers, setTaggedUsers] = useState([]); // [{_id, username, ...}]
  const fileInputRef = useRef();
  const videoInputRef = useRef();

  // Limite video
  const VIDEO_LIMIT_MB = user?.isVerified ? 200 : 30;

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

  // 🏷️ Caută useri pentru etichetare
  const handleTagSearch = async (q) => {
    setTagSearch(q);
    if (!q.trim()) { setTagSearchResults([]); return; }
    try {
      const res = await api.get(`/users/search?q=${encodeURIComponent(q.trim())}`);
      setTagSearchResults(res.data.filter(u => !taggedUsers.some(t => t._id === u._id) && u._id !== user?._id));
    } catch { setTagSearchResults([]); }
  };

  const addTaggedUser = (u) => {
    if (taggedUsers.length >= 10) return;
    setTaggedUsers(prev => [...prev, u]);
    setTagSearch("");
    setTagSearchResults([]);
  };

  const removeTaggedUser = (id) => {
    setTaggedUsers(prev => prev.filter(u => u._id !== id));
  };

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    if (images.length + files.length > 10) {
      setError("Poți adăuga maxim 10 imagini într-o postare");
      return;
    }
    // Dacă există video, îl scoatem
    setVideoPreview(null);
    setVideoBase64(null);
    files.forEach(file => {
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" e prea mare (max 10MB)`);
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImageAt = (idx) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > VIDEO_LIMIT_MB) {
      setError(
        `Videoul depășește limita de ${VIDEO_LIMIT_MB} MB${
          !user?.isVerified
            ? ". Verifică-ți contul pentru a urca videouri de până la 200 MB."
            : "."
        }`
      );
      return;
    }
    // Dacă există imagini, le scoatem
    setImages([]);
    const reader = new FileReader();
    reader.onloadend = () => {
      setVideoPreview(URL.createObjectURL(file));
      setVideoBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const removeVideo = () => {
    setVideoPreview(null);
    setVideoBase64(null);
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0 && !videoBase64) {
      setError("Adaugă text, o imagine sau un video");
      return;
    }
    if (songUrlInvalid) {
      setError("Link de melodie invalid. Folosește un link YouTube sau Spotify.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      let imageUrls = [];
      let videoUrl = "";

      if (images.length) {
        setUploading(true);
        const uploads = await Promise.all(
          images.map(b64 => api.post("/upload", { data: b64, folder: "posts" }))
        );
        imageUrls = uploads.map(r => r.data.url);
        setUploading(false);
      }

      if (videoBase64) {
        setUploading(true);
        const uploadRes = await api.post("/upload/video", { data: videoBase64, folder: "posts" });
        videoUrl = uploadRes.data.url;
        setUploading(false);
      }

      const res = await api.post("/posts", {
        content: content.trim(),
        images: imageUrls,
        video: videoUrl,
        songUrl: songPreview ? songUrl.trim() : "",
        taggedUsers: taggedUsers.map(u => u._id),
        visibility: closeOnly ? "close" : "public",
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

        {/* Persoane etichetate */}
        {taggedUsers.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
            {taggedUsers.map(u => (
              <div key={u._id} style={{ display: "flex", alignItems: "center", gap: 5, background: "#111", border: "1px solid #2a2a2a", borderRadius: 20, padding: "4px 10px 4px 4px" }}>
                <Avatar user={u} size={20} />
                <span style={{ fontSize: 12, color: "#ddd" }}>
                  {u.username}
                  {u.isVerified && <VerifiedBadge size={10} />}
                </span>
                <span onClick={() => removeTaggedUser(u._id)} style={{ cursor: "pointer", color: "#666", fontSize: 12, marginLeft: 2 }}>✕</span>
              </div>
            ))}
          </div>
        )}

        {/* Picker pentru etichetare persoane */}
        {showTagPicker && (
          <div style={{ marginBottom: 12, background: "#111", border: "1px solid #2a2a2a", borderRadius: 10, padding: 10 }}>
            <input
              type="text"
              placeholder="Caută un user de etichetat..."
              value={tagSearch}
              onChange={e => handleTagSearch(e.target.value)}
              style={{ width: "100%", background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 13, boxSizing: "border-box" }}
              autoFocus
            />
            {tagSearchResults.length > 0 && (
              <div style={{ marginTop: 8, maxHeight: 160, overflowY: "auto" }}>
                {tagSearchResults.map(u => (
                  <div key={u._id} onClick={() => addTaggedUser(u)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 4px", cursor: "pointer" }}>
                    <Avatar user={u} size={26} />
                    <span style={{ fontSize: 13 }}>
                      {u.displayName || u.username}
                      {u.isVerified && <VerifiedBadge size={11} />}
                    </span>
                    <span style={{ fontSize: 11, color: "#666" }}>@{u.username}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Preview imagini (carusel) */}
        {images.length > 0 && (
          <div style={{ display: "flex", gap: 8, overflowX: "auto", marginBottom: 12, paddingBottom: 2 }}>
            {images.map((img, idx) => (
              <div key={idx} style={{ position: "relative", flex: "0 0 auto" }}>
                <img src={img} alt={`preview-${idx}`} style={{ width: 110, height: 110, objectFit: "cover", borderRadius: 10, border: "1px solid #333" }} />
                <button
                  onClick={() => removeImageAt(idx)}
                  style={{ position: "absolute", top: 4, right: 4, background: "#000000aa", border: "none", color: "#fff", borderRadius: "50%", width: 22, height: 22, cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}
                >✕</button>
              </div>
            ))}
            {images.length < 10 && (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ flex: "0 0 auto", width: 110, height: 110, borderRadius: 10, border: "1px dashed #444", display: "flex", alignItems: "center", justifyContent: "center", color: "#666", fontSize: 24, cursor: "pointer" }}
              >+</div>
            )}
          </div>
        )}

        {/* Preview video */}
        {videoPreview && (
          <div style={{ position: "relative", marginBottom: 12 }}>
            <video
              src={videoPreview}
              controls
              style={{ width: "100%", maxHeight: 300, borderRadius: 10, border: "1px solid #333", background: "#000" }}
            />
            <button
              onClick={removeVideo}
              style={{ position: "absolute", top: 8, right: 8, background: "#000000aa", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}
            >✕</button>
            <div style={{ fontSize: 11, color: "#666", marginTop: 4, textAlign: "right" }}>
              Limită: {VIDEO_LIMIT_MB} MB {user?.isVerified ? "✅ cont verificat" : "(cont neverificat)"}
            </div>
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

        {/* 🟢 Toggle Close Friends */}
        <div
          onClick={() => setCloseOnly(v => !v)}
          style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 12, padding: "8px 12px",
            borderRadius: 10, cursor: "pointer",
            background: closeOnly ? "#1d7a3422" : "#111",
            border: `1px solid ${closeOnly ? "#2ecc71" : "#2a2a2a"}`,
          }}
        >
          <span style={{ fontSize: 16 }}>🟢</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: closeOnly ? "#2ecc71" : "#ccc" }}>Close Friends</div>
            <div style={{ fontSize: 11, color: "#777" }}>Vizibilă doar pentru cei din lista ta de Close Friends</div>
          </div>
          <div style={{
            width: 36, height: 20, borderRadius: 10, background: closeOnly ? "#2ecc71" : "#333",
            position: "relative", transition: "background .15s",
          }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
              left: closeOnly ? 18 : 2, transition: "left .15s",
            }} />
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {/* Buton imagine */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={!!videoBase64 || images.length >= 10}
              style={{ background: "#111", border: "1px solid #333", borderRadius: 8, color: (videoBase64 || images.length >= 10) ? "#444" : "#aaa", cursor: (videoBase64 || images.length >= 10) ? "not-allowed" : "pointer", padding: "8px 12px", fontSize: 18 }}
              title="Adaugă imagini (carusel, max 10)"
            >🖼️</button>
            <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleImageChange} style={{ display: "none" }} />

            {/* Buton video */}
            <button
              onClick={() => videoInputRef.current?.click()}
              disabled={images.length > 0}
              style={{
                background: videoBase64 ? "#e91e8c22" : "#111",
                border: `1px solid ${videoBase64 ? "#e91e8c" : "#333"}`,
                borderRadius: 8,
                color: images.length > 0 ? "#444" : videoBase64 ? "#e91e8c" : "#aaa",
                cursor: images.length > 0 ? "not-allowed" : "pointer",
                padding: "8px 12px",
                fontSize: 18,
              }}
              title={`Adaugă video (max ${VIDEO_LIMIT_MB} MB${!user?.isVerified ? " — neverificat" : " — verificat"})`}
            >🎬</button>
            <input ref={videoInputRef} type="file" accept="video/*" onChange={handleVideoChange} style={{ display: "none" }} />

            {/* Buton melodie */}
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

            {/* Buton etichetare persoane */}
            <button
              onClick={() => setShowTagPicker(s => !s)}
              style={{
                background: showTagPicker || taggedUsers.length ? "#e91e8c22" : "#111",
                border: `1px solid ${showTagPicker || taggedUsers.length ? "#e91e8c" : "#333"}`,
                borderRadius: 8,
                color: showTagPicker || taggedUsers.length ? "#e91e8c" : "#aaa",
                cursor: "pointer",
                padding: "8px 12px",
                fontSize: 18,
              }}
              title="Etichetează persoane"
            >👥</button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 12, color: content.length > 1800 ? "#e91e8c" : "#555" }}>{content.length}/2000</span>
            <button
              onClick={handleSubmit}
              disabled={loading || (!content.trim() && images.length === 0 && !videoBase64) || songUrlInvalid}
              style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: closeOnly ? "#2ecc71" : "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1, fontSize: 14 }}
            >
              {uploading ? "Se urcă..." : loading ? "Se postează..." : closeOnly ? "🟢 Postează" : "Postează"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
