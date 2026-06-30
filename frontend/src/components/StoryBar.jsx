import { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "./Avatar";
import VerifiedBadge from "./VerifiedBadge";

const BG_COLORS = ["#e91e8c", "#8e44ad", "#2980b9", "#16a085", "#d35400", "#2c3e50"];
const STORY_DURATION = 5000; // ms per slide

export default function StoryBar() {
  const { user } = useAuth();
  const [groups, setGroups] = useState([]);
  const [viewerIndex, setViewerIndex] = useState(null); // index în groups, sau null
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => { fetchStories(); }, []);

  const fetchStories = async () => {
    try {
      const res = await api.get("/stories");
      setGroups(res.data);
    } catch {}
  };

  const myGroup = groups.find(g => g.author._id === user?._id);
  const otherGroups = groups.filter(g => g.author._id !== user?._id);

  const hasUnseen = (g) => g.stories.some(s => !s.viewers?.map(v => v._id || v).map(String).includes(String(user?._id)));

  const handleCreated = (story) => {
    setShowCreate(false);
    setGroups(prev => {
      const idx = prev.findIndex(g => g.author._id === user._id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = { ...copy[idx], stories: [...copy[idx].stories, story] };
        return copy;
      }
      return [{ author: user, stories: [story] }, ...prev];
    });
  };

  const handleDeleted = (storyId, authorId) => {
    setGroups(prev => prev
      .map(g => g.author._id === authorId ? { ...g, stories: g.stories.filter(s => s._id !== storyId) } : g)
      .filter(g => g.stories.length > 0));
  };

  return (
    <div
      className="story-bar-scroll"
      style={{ display: "flex", gap: 10, overflowX: "auto", overflowY: "hidden", padding: "10px 12px", borderBottom: "1px solid #1a1a1a" }}
    >
      <style>{`.story-bar-scroll::-webkit-scrollbar { display: none; height: 0; } .story-bar-scroll { scrollbar-width: none; }`}</style>

      {/* Story-ul propriu / adaugă story */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, cursor: "pointer" }}>
        <div
          onClick={() => myGroup ? setViewerIndex(groups.findIndex(g => g.author._id === user._id)) : setShowCreate(true)}
          style={{
            width: 50, height: 50, borderRadius: "50%", padding: 2, position: "relative",
            background: myGroup ? (hasUnseen(myGroup) ? "linear-gradient(135deg, #e91e8c, #f59e0b)" : "#333") : "transparent",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <Avatar user={user} size={myGroup ? 46 : 50} />
          <div
            onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
            style={{
              position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: "50%",
              background: "#e91e8c", border: "2px solid #0d0d0d", color: "#fff", fontSize: 11,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}
          >+</div>
        </div>
        <span style={{ fontSize: 10, color: "#888" }}>Tu</span>
      </div>

      {otherGroups.map((g, i) => {
        const unseen = hasUnseen(g);
        const realIndex = groups.findIndex(gr => gr.author._id === g.author._id);
        return (
          <div key={g.author._id} onClick={() => setViewerIndex(realIndex)} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, cursor: "pointer" }}>
            <div style={{
              width: 50, height: 50, borderRadius: "50%", padding: 2,
              background: unseen ? "linear-gradient(135deg, #e91e8c, #f59e0b)" : "#333",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Avatar user={g.author} size={46} />
            </div>
            <span style={{ fontSize: 10, color: "#888", maxWidth: 52, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {g.author.username}
            </span>
          </div>
        );
      })}

      {showCreate && (
        <CreateStoryModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />
      )}

      {viewerIndex !== null && groups[viewerIndex] && (
        <StoryViewer
          groups={groups}
          startIndex={viewerIndex}
          onClose={() => setViewerIndex(null)}
          onDeleted={handleDeleted}
          markSeen={(storyId) => {
            setGroups(prev => prev.map(g => ({
              ...g,
              stories: g.stories.map(s => s._id === storyId
                ? { ...s, viewers: [...(s.viewers || []), { _id: user._id }] }
                : s),
            })));
          }}
        />
      )}
    </div>
  );
}

// ───────────────────────────── Creare story ─────────────────────────────
function CreateStoryModal({ onClose, onCreated }) {
  const [tab, setTab] = useState("media"); // "media" | "text"
  const [imageBase64, setImageBase64] = useState(null);
  const [videoBase64, setVideoBase64] = useState(null);
  const [preview, setPreview] = useState(null);
  const [text, setText] = useState("");
  const [background, setBackground] = useState(BG_COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = useRef();

  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const isVideo = file.type.startsWith("video");
    if (file.size > (isVideo ? 50 : 10) * 1024 * 1024) {
      setError(`Fișierul e prea mare (max ${isVideo ? 50 : 10}MB)`);
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      if (isVideo) { setVideoBase64(reader.result); setImageBase64(null); }
      else { setImageBase64(reader.result); setVideoBase64(null); }
      setPreview(isVideo ? URL.createObjectURL(file) : reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (tab === "media" && !imageBase64 && !videoBase64) {
      setError("Alege o imagine sau un video");
      return;
    }
    if (tab === "text" && !text.trim()) {
      setError("Scrie ceva pentru story");
      return;
    }
    setUploading(true);
    setError("");
    try {
      let imageUrl = "", videoUrl = "";
      if (imageBase64) {
        const r = await api.post("/upload", { data: imageBase64, folder: "stories" });
        imageUrl = r.data.url;
      }
      if (videoBase64) {
        const r = await api.post("/upload/video", { data: videoBase64, folder: "stories" });
        videoUrl = r.data.url;
      }
      const res = await api.post("/stories", {
        image: imageUrl,
        video: videoUrl,
        text: tab === "text" ? text.trim() : "",
        background,
      });
      onCreated(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Eroare la postarea story-ului");
    }
    setUploading(false);
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, background: "#000000d0", zIndex: 700, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ width: "100%", maxWidth: 380, background: "#1a1a1a", border: "1px solid #2a2a2a", borderRadius: 16, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Story nou</span>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#666", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <button
            onClick={() => setTab("media")}
            style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${tab === "media" ? "#e91e8c" : "#333"}`, background: tab === "media" ? "#e91e8c22" : "transparent", color: tab === "media" ? "#e91e8c" : "#888", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >📷 Foto/Video</button>
          <button
            onClick={() => setTab("text")}
            style={{ flex: 1, padding: "7px", borderRadius: 8, border: `1px solid ${tab === "text" ? "#e91e8c" : "#333"}`, background: tab === "text" ? "#e91e8c22" : "transparent", color: tab === "text" ? "#e91e8c" : "#888", cursor: "pointer", fontWeight: 600, fontSize: 13 }}
          >✏️ Text</button>
        </div>

        {tab === "media" ? (
          <div>
            {preview ? (
              <div style={{ position: "relative", marginBottom: 12 }}>
                {videoBase64 ? (
                  <video src={preview} controls style={{ width: "100%", maxHeight: 360, borderRadius: 10, background: "#000" }} />
                ) : (
                  <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 360, objectFit: "cover", borderRadius: 10 }} />
                )}
                <button
                  onClick={() => { setPreview(null); setImageBase64(null); setVideoBase64(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{ position: "absolute", top: 8, right: 8, background: "#000000aa", border: "none", color: "#fff", borderRadius: "50%", width: 28, height: 28, cursor: "pointer" }}
                >✕</button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{ height: 200, borderRadius: 10, border: "1px dashed #444", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#666", cursor: "pointer", marginBottom: 12 }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>📷</div>
                <span style={{ fontSize: 13 }}>Alege o poză sau un video</span>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleFile} style={{ display: "none" }} />
          </div>
        ) : (
          <div>
            <div style={{ background: background, borderRadius: 10, height: 200, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, marginBottom: 10 }}>
              <textarea
                placeholder="Scrie ceva..."
                value={text}
                onChange={e => setText(e.target.value.slice(0, 200))}
                rows={4}
                style={{ width: "100%", background: "transparent", border: "none", color: "#fff", fontSize: 18, fontWeight: 700, textAlign: "center", resize: "none", outline: "none", fontFamily: "inherit" }}
                autoFocus
              />
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
              {BG_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setBackground(c)}
                  style={{ width: 26, height: 26, borderRadius: "50%", background: c, cursor: "pointer", border: background === c ? "2px solid #fff" : "2px solid transparent" }}
                />
              ))}
            </div>
          </div>
        )}

        {error && <p style={{ color: "#e91e8c", fontSize: 12, marginBottom: 10 }}>⚠️ {error}</p>}

        <button
          onClick={handleSubmit}
          disabled={uploading}
          style={{ width: "100%", padding: "10px", borderRadius: 10, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: uploading ? 0.7 : 1 }}
        >
          {uploading ? "Se postează..." : "Distribuie story"}
        </button>
      </div>
    </div>
  );
}

// ───────────────────────────── Vizualizator story ─────────────────────────────
function StoryViewer({ groups, startIndex, onClose, onDeleted, markSeen }) {
  const { user } = useAuth();
  const [groupIndex, setGroupIndex] = useState(startIndex);
  const [slideIndex, setSlideIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [showViewers, setShowViewers] = useState(false);
  const [viewersList, setViewersList] = useState([]);
  const timerRef = useRef(null);
  const startRef = useRef(Date.now());

  const group = groups[groupIndex];
  const story = group?.stories?.[slideIndex];
  const isOwner = story?.author?._id === user?._id;

  useEffect(() => {
    if (!story) return;
    setProgress(0);
    startRef.current = Date.now();
    if (story.author?._id !== user?._id) {
      api.put(`/stories/${story._id}/view`).catch(() => {});
      markSeen(story._id);
    }
  }, [story?._id]);

  useEffect(() => {
    if (paused || !story) return;
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const pct = Math.min(100, (elapsed / STORY_DURATION) * 100);
      setProgress(pct);
      if (pct >= 100) goNext();
    }, 60);
    return () => clearInterval(timerRef.current);
  }, [paused, story?._id]);

  const goNext = () => {
    if (slideIndex < group.stories.length - 1) {
      setSlideIndex(i => i + 1);
    } else if (groupIndex < groups.length - 1) {
      setGroupIndex(i => i + 1);
      setSlideIndex(0);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    if (slideIndex > 0) {
      setSlideIndex(i => i - 1);
    } else if (groupIndex > 0) {
      const prevGroup = groups[groupIndex - 1];
      setGroupIndex(i => i - 1);
      setSlideIndex(prevGroup.stories.length - 1);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Ștergi acest story?")) return;
    try {
      await api.delete(`/stories/${story._id}`);
      onDeleted(story._id, story.author._id);
      if (group.stories.length <= 1) onClose();
      else goNext();
    } catch {}
  };

  const openViewers = async () => {
    setShowViewers(true);
    setPaused(true);
    try {
      const res = await api.get(`/stories/${story._id}/viewers`);
      setViewersList(res.data);
    } catch {}
  };

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prevOverflow; };
  }, []);

  if (!story) return null;

  return (
    <div style={{ position: "fixed", inset: 0, height: "100dvh", background: "#000", zIndex: 800, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "relative", width: "100%", maxWidth: 420, height: "100%", maxHeight: 800, background: story.text ? story.background : "#111", display: "flex", flexDirection: "column" }}>

        {/* Bare de progres */}
        <div style={{ display: "flex", gap: 4, padding: "10px 10px 0" }}>
          {group.stories.map((s, i) => (
            <div key={s._id} style={{ flex: 1, height: 3, background: "#ffffff44", borderRadius: 2, overflow: "hidden" }}>
              <div style={{
                height: "100%", background: "#fff",
                width: i < slideIndex ? "100%" : i === slideIndex ? `${progress}%` : "0%",
                transition: i === slideIndex ? "none" : "width .15s",
              }} />
            </div>
          ))}
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px" }}>
          <Avatar user={group.author} size={32} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#fff" }}>
              {group.author.username}
              {group.author.isVerified && <VerifiedBadge size={11} />}
            </div>
          </div>
          {isOwner && (
            <button onClick={handleDelete} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 16, cursor: "pointer", opacity: 0.8 }}>🗑️</button>
          )}
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#fff", fontSize: 22, cursor: "pointer" }}>✕</button>
        </div>

        {/* Continut story */}
        <div
          style={{ flex: 1, position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
          onMouseDown={() => setPaused(true)}
          onMouseUp={() => setPaused(false)}
          onTouchStart={() => setPaused(true)}
          onTouchEnd={() => setPaused(false)}
        >
          {story.image && <img src={story.image} alt="story" style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
          {story.video && <video src={story.video} autoPlay playsInline style={{ width: "100%", height: "100%", objectFit: "contain" }} />}
          {story.text && !story.image && !story.video && (
            <div style={{ padding: 24, textAlign: "center", color: "#fff", fontSize: 24, fontWeight: 700, lineHeight: 1.4 }}>
              {story.text}
            </div>
          )}

          {/* Zone de navigare (tap stânga / dreapta) */}
          <div onClick={goPrev} style={{ position: "absolute", left: 0, top: 0, width: "35%", height: "100%", cursor: "pointer" }} />
          <div onClick={goNext} style={{ position: "absolute", right: 0, top: 0, width: "35%", height: "100%", cursor: "pointer" }} />
        </div>

        {/* Vizualizări (doar pentru autor) */}
        {isOwner && (
          <div onClick={openViewers} style={{ padding: "10px 14px", color: "#fff", fontSize: 12, opacity: 0.8, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}>
            👁️ {story.viewers?.length || 0} vizualizări
          </div>
        )}

        {showViewers && (
          <div
            onClick={() => { setShowViewers(false); setPaused(false); }}
            style={{ position: "absolute", inset: 0, background: "#000000cc", display: "flex", alignItems: "flex-end" }}
          >
            <div onClick={e => e.stopPropagation()} style={{ width: "100%", maxHeight: "60%", background: "#1a1a1a", borderRadius: "16px 16px 0 0", padding: 16, overflowY: "auto" }}>
              <div style={{ fontWeight: 700, marginBottom: 10, color: "#fff" }}>Vizualizări ({viewersList.length})</div>
              {viewersList.length === 0 && <div style={{ color: "#666", fontSize: 13 }}>Nimeni încă</div>}
              {viewersList.map(v => (
                <div key={v._id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 0" }}>
                  <Avatar user={v} size={32} />
                  <span style={{ color: "#ddd", fontSize: 13 }}>
                    {v.username}
                    {v.isVerified && <VerifiedBadge size={11} />}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
