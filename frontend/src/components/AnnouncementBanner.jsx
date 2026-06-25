import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

export default function AnnouncementBanner() {
  const { user } = useAuth();
  const [announcement, setAnnouncement] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/announcements/active")
      .then(res => setAnnouncement(res.data))
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    if (!content.trim()) return;
    setSaving(true);
    try {
      const res = await api.post("/announcements", { content });
      setAnnouncement(res.data);
      setContent("");
      setShowCreate(false);
      setDismissed(false);
    } catch {}
    setSaving(false);
  };

  const handleDeactivate = async () => {
    if (!announcement) return;
    try {
      await api.delete(`/announcements/${announcement._id}`);
      setAnnouncement(null);
    } catch {}
  };

  return (
    <div>
      {/* 📌 Banner sticky */}
      {announcement && !dismissed && (
        <div style={{
          background: "linear-gradient(135deg, #1a0a2e 0%, #16213e 100%)",
          border: "1px solid #e91e8c44",
          borderLeft: "3px solid #e91e8c",
          borderRadius: 10,
          padding: "12px 14px",
          marginBottom: 16,
          display: "flex",
          alignItems: "flex-start",
          gap: 10,
        }}>
          <span style={{ fontSize: 18, flexShrink: 0 }}>📌</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#e91e8c", fontWeight: 700, marginBottom: 3, textTransform: "uppercase", letterSpacing: 1 }}>
              Anunț Admin
            </div>
            <div style={{ fontSize: 14, color: "#eee", lineHeight: 1.5 }}>{announcement.content}</div>
            {announcement.author && (
              <div style={{ fontSize: 11, color: "#555", marginTop: 4 }}>
                — {announcement.author.displayName || announcement.author.username}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
            {user?.isAdmin && (
              <button onClick={handleDeactivate} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 13, padding: "2px 6px" }} title="Șterge anunț">
                🗑️
              </button>
            )}
            <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", color: "#555", cursor: "pointer", fontSize: 16, padding: "2px 6px" }} title="Închide">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Admin: creare anunț */}
      {user?.isAdmin && (
        <div style={{ marginBottom: 12 }}>
          {!showCreate ? (
            <button
              onClick={() => setShowCreate(true)}
              style={{ width: "100%", padding: "9px", borderRadius: 8, border: "1px dashed #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: 13 }}
            >
              📌 Postează anunț (admin)
            </button>
          ) : (
            <div style={{ background: "#1a1a1a", borderRadius: 10, padding: 14, border: "1px solid #2a2a2a" }}>
              <textarea
                value={content}
                onChange={e => setContent(e.target.value.slice(0, 500))}
                placeholder="Scrie un anunț pentru toți membrii..."
                rows={3}
                style={{ width: "100%", background: "#111", border: "1px solid #2a2a2a", borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13, resize: "none", boxSizing: "border-box", marginBottom: 8 }}
              />
              <div style={{ fontSize: 11, color: "#555", textAlign: "right", marginBottom: 8 }}>{content.length}/500</div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={handleCreate} disabled={saving || !content.trim()} style={{ flex: 1, padding: "9px", borderRadius: 8, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer", opacity: saving ? 0.7 : 1 }}>
                  {saving ? "Se postează..." : "📌 Postează"}
                </button>
                <button onClick={() => { setShowCreate(false); setContent(""); }} style={{ padding: "9px 14px", borderRadius: 8, border: "1px solid #333", background: "transparent", color: "#888", cursor: "pointer" }}>
                  Anulează
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
