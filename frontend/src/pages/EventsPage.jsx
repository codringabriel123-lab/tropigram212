import { useState, useEffect } from "react";
import api from "../api";
import { useAuth } from "../context/AuthContext";

const ICONS = ["🎉", "🏎️", "🎯", "⚽", "🚗", "🎵", "🏆", "🎪", "🔫", "🍕", "🎭", "🤼"];
const COLORS = [
  { label: "Roz", value: "#e91e8c" },
  { label: "Albastru", value: "#3498db" },
  { label: "Verde", value: "#27ae60" },
  { label: "Portocaliu", value: "#e67e22" },
  { label: "Mov", value: "#9b59b6" },
  { label: "Roșu", value: "#e74c3c" },
  { label: "Galben", value: "#f1c40f" },
  { label: "Turcoaz", value: "#1abc9c" },
];

const EMPTY_FORM = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  icon: "🎉",
  color: "#e91e8c",
  entryType: "gratuit",
  entryPrice: "",
  prizes: [{ place: "Locul 1", reward: "" }],
};

function CreateEventModal({ onClose, onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addPrize = () => setForm(prev => ({
    ...prev,
    prizes: [...prev.prizes, { place: `Locul ${prev.prizes.length + 1}`, reward: "" }],
  }));

  const removePrize = (i) => setForm(prev => ({
    ...prev,
    prizes: prev.prizes.filter((_, idx) => idx !== i),
  }));

  const updatePrize = (i, key, val) => setForm(prev => ({
    ...prev,
    prizes: prev.prizes.map((p, idx) => idx === i ? { ...p, [key]: val } : p),
  }));

  const handleSubmit = async () => {
    if (!form.title.trim() || !form.date || !form.time) {
      setError("Titlu, dată și oră sunt obligatorii.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        date: form.date,
        time: form.time,
        location: form.location.trim(),
        icon: form.icon,
        color: form.color,
        entry: {
          type: form.entryType,
          price: form.entryType === "platit" ? Number(form.entryPrice) || 0 : 0,
          currency: "$",
        },
        prizes: form.prizes.filter(p => p.reward.trim()),
      };
      const r = await api.post("/events", payload);
      onCreated(r.data);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Eroare la creare");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", background: "#111", border: "1px solid #2a2a2a",
    borderRadius: 8, padding: "9px 12px", color: "#fff", fontSize: 13,
    boxSizing: "border-box",
  };
  const labelStyle = { fontSize: 11, color: "#888", marginBottom: 5, display: "block", fontWeight: 600 };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: 16, overflowY: "auto" }}>
      <div style={{ background: "#1a1a1a", borderRadius: 16, padding: 20, width: "100%", maxWidth: 440, border: "1px solid #2a2a2a", marginTop: 20, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ fontWeight: 800, fontSize: 17, color: "#e91e8c" }}>📅 Eveniment nou</div>
          <button onClick={onClose} style={{ background: "none", border: "none", color: "#555", fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <label style={labelStyle}>Titlu eveniment *</label>
        <input value={form.title} onChange={e => set("title", e.target.value)} placeholder="ex: Drag Race Weekend" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Descriere</label>
        <textarea value={form.description} onChange={e => set("description", e.target.value)} placeholder="Detalii despre eveniment..." rows={3}
          style={{ ...inputStyle, resize: "vertical", marginBottom: 14 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
          <div>
            <label style={labelStyle}>Dată *</label>
            <input type="date" value={form.date} onChange={e => set("date", e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Oră *</label>
            <input type="time" value={form.time} onChange={e => set("time", e.target.value)} style={inputStyle} />
          </div>
        </div>

        <label style={labelStyle}>Locație</label>
        <input value={form.location} onChange={e => set("location", e.target.value)} placeholder="ex: Industrial District, LS" style={{ ...inputStyle, marginBottom: 14 }} />

        <label style={labelStyle}>Icon eveniment</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {ICONS.map(ic => (
            <button key={ic} onClick={() => set("icon", ic)}
              style={{ fontSize: 20, padding: "6px 8px", borderRadius: 8, border: `2px solid ${form.icon === ic ? form.color : "#2a2a2a"}`, background: form.icon === ic ? "#2a2a2a" : "transparent", cursor: "pointer" }}>
              {ic}
            </button>
          ))}
        </div>

        <label style={labelStyle}>Culoare</label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
          {COLORS.map(c => (
            <button key={c.value} onClick={() => set("color", c.value)}
              style={{ width: 28, height: 28, borderRadius: "50%", background: c.value, border: `3px solid ${form.color === c.value ? "#fff" : "transparent"}`, cursor: "pointer" }}
              title={c.label} />
          ))}
        </div>

        <label style={labelStyle}>Intrare</label>
        <div style={{ display: "flex", gap: 8, marginBottom: form.entryType === "platit" ? 10 : 14 }}>
          {["gratuit", "platit"].map(t => (
            <button key={t} onClick={() => set("entryType", t)}
              style={{ flex: 1, padding: "8px", borderRadius: 8, border: `1px solid ${form.entryType === t ? form.color : "#333"}`, background: form.entryType === t ? form.color : "transparent", color: form.entryType === t ? "#fff" : "#888", fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
              {t === "gratuit" ? "🆓 Gratuit" : "💰 Plătit"}
            </button>
          ))}
        </div>
        {form.entryType === "platit" && (
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Preț intrare ($)</label>
            <input type="number" min="0" value={form.entryPrice} onChange={e => set("entryPrice", e.target.value)}
              placeholder="ex: 5000" style={inputStyle} />
          </div>
        )}

        <label style={labelStyle}>Premii</label>
        {form.prizes.map((p, i) => (
          <div key={i} style={{ display: "flex", gap: 6, marginBottom: 8, alignItems: "center" }}>
            <input value={p.place} onChange={e => updatePrize(i, "place", e.target.value)}
              placeholder="Locul 1" style={{ ...inputStyle, flex: "0 0 100px" }} />
            <input value={p.reward} onChange={e => updatePrize(i, "reward", e.target.value)}
              placeholder="ex: 50.000$" style={{ ...inputStyle, flex: 1 }} />
            {form.prizes.length > 1 && (
              <button onClick={() => removePrize(i)}
                style={{ background: "none", border: "none", color: "#e74c3c", cursor: "pointer", fontSize: 16, padding: "0 4px" }}>✕</button>
            )}
          </div>
        ))}
        <button onClick={addPrize}
          style={{ width: "100%", padding: "7px", borderRadius: 8, border: "1px dashed #333", background: "transparent", color: "#888", cursor: "pointer", fontSize: 12, marginBottom: 18 }}>
          + Adaugă premiu
        </button>

        {error && <div style={{ color: "#e74c3c", fontSize: 12, marginBottom: 12 }}>{error}</div>}

        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: "10px", borderRadius: 10, border: "1px solid #333", background: "transparent", color: "#888", fontWeight: 600, cursor: "pointer" }}>
            Anulează
          </button>
          <button onClick={handleSubmit} disabled={loading}
            style={{ flex: 2, padding: "10px", borderRadius: 10, border: "none", background: form.color, color: "#fff", fontWeight: 700, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Se creează..." : "✓ Creează evenimentul"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Panel participanți
function ParticipantsPanel({ event, user, onUpdate }) {
  const [loading, setLoading] = useState(false);

  const myEntry = event.participants?.find(p => p.user?._id === user?._id || p.user === user?._id);
  const approvedList = event.participants?.filter(p => p.status === "approved") || [];
  const pendingList = event.participants?.filter(p => p.status === "pending") || [];

  const handleJoin = async () => {
    setLoading(true);
    try {
      const r = await api.post(`/events/${event._id}/join`);
      onUpdate(event._id, r.data.participants);
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    setLoading(true);
    try {
      const r = await api.delete(`/events/${event._id}/join`);
      onUpdate(event._id, r.data.participants);
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    try {
      const r = await api.patch(`/events/${event._id}/participants/${userId}/approve`);
      onUpdate(event._id, r.data.participants);
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  const handleReject = async (userId) => {
    try {
      const r = await api.patch(`/events/${event._id}/participants/${userId}/reject`);
      onUpdate(event._id, r.data.participants);
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  const avatarStyle = (color) => ({
    width: 30, height: 30, borderRadius: "50%", background: color || "#333",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0,
  });

  return (
    <div style={{ marginTop: 14, borderTop: `1px solid ${event.color}22`, paddingTop: 14 }}>

      {/* Buton înscriere / retragere */}
      {!myEntry && (
        <button onClick={handleJoin} disabled={loading}
          style={{
            width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${event.color}`,
            background: "transparent", color: event.color, fontWeight: 700, cursor: "pointer", fontSize: 13,
            marginBottom: 14, opacity: loading ? 0.6 : 1,
          }}>
          {loading ? "..." : event.entry?.type === "gratuit" ? "✅ Înscrie-te (gratuit)" : "📨 Trimite cerere de înscriere"}
        </button>
      )}

      {myEntry && myEntry.status === "pending" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#2a2000", border: "1px solid #f39c1233", color: "#f39c12", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
            ⏳ Cerere în așteptare (necesită aprobare admin)
          </div>
          <button onClick={handleLeave} disabled={loading}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e74c3c33", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Anulează
          </button>
        </div>
      )}

      {myEntry && myEntry.status === "approved" && (
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "9px", borderRadius: 10, background: "#1a2e1a", border: "1px solid #27ae6033", color: "#27ae60", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
            ✅ Ești înscris la acest eveniment
          </div>
          <button onClick={handleLeave} disabled={loading}
            style={{ padding: "9px 14px", borderRadius: 10, border: "1px solid #e74c3c33", background: "transparent", color: "#e74c3c", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>
            Retrage-te
          </button>
        </div>
      )}

      {myEntry && myEntry.status === "rejected" && (
        <div style={{ marginBottom: 14, padding: "9px", borderRadius: 10, background: "#2e1a1a", border: "1px solid #e74c3c33", color: "#e74c3c", fontSize: 12, fontWeight: 600, textAlign: "center" }}>
          ❌ Cererea ta a fost respinsă
        </div>
      )}

      {/* Lista participanți aprobați */}
      {approvedList.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            👥 Participanți ({approvedList.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {approvedList.map((p, i) => {
              const u = p.user;
              const name = u?.displayName || u?.username || "?";
              const initials = name.charAt(0).toUpperCase();
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {u?.avatar
                    ? <img src={u.avatar} alt={name} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={avatarStyle(event.color)}>{initials}</div>
                  }
                  <span style={{ fontSize: 13, color: "#ccc" }}>{name}</span>
                  <span style={{ fontSize: 11, color: "#555", marginLeft: "auto" }}>@{u?.username}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Admin: cereri în așteptare */}
      {user?.isAdmin && pendingList.length > 0 && (
        <div>
          <div style={{ fontSize: 11, color: "#f39c12", fontWeight: 700, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
            ⏳ Cereri în așteptare ({pendingList.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {pendingList.map((p, i) => {
              const u = p.user;
              const name = u?.displayName || u?.username || "?";
              const initials = name.charAt(0).toUpperCase();
              const userId = u?._id || u;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "#1a1a00", borderRadius: 8, padding: "8px 10px", border: "1px solid #f39c1222" }}>
                  {u?.avatar
                    ? <img src={u.avatar} alt={name} style={{ width: 30, height: 30, borderRadius: "50%", objectFit: "cover" }} />
                    : <div style={avatarStyle("#f39c12")}>{initials}</div>
                  }
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, color: "#ccc" }}>{name}</div>
                    <div style={{ fontSize: 11, color: "#555" }}>@{u?.username}</div>
                  </div>
                  <button onClick={() => handleApprove(userId)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#27ae60", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                    ✓
                  </button>
                  <button onClick={() => handleReject(userId)}
                    style={{ padding: "5px 10px", borderRadius: 6, border: "none", background: "#e74c3c", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {approvedList.length === 0 && (!user?.isAdmin || pendingList.length === 0) && !myEntry && (
        <div style={{ fontSize: 12, color: "#444", textAlign: "center", padding: "4px 0" }}>
          Niciun participant încă. Fii primul!
        </div>
      )}
    </div>
  );
}

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    api.get("/events")
      .then(r => setEvents(r.data))
      .finally(() => setLoading(false));
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Ștergi acest eveniment?")) return;
    try {
      await api.delete(`/events/${id}`);
      setEvents(prev => prev.filter(e => e._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || "Eroare");
    }
  };

  const handleParticipantsUpdate = (eventId, newParticipants) => {
    setEvents(prev => prev.map(ev =>
      ev._id === eventId ? { ...ev, participants: newParticipants } : ev
    ));
  };

  if (loading) return <div style={{ textAlign: "center", padding: "4rem", color: "#555" }}>Se încarcă...</div>;

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ fontWeight: 800, fontSize: 20 }}>📅 Evenimente</div>
        {user?.isAdmin && (
          <button onClick={() => setShowModal(true)}
            style={{ padding: "9px 18px", borderRadius: 20, border: "none", background: "#e91e8c", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 }}>
            + Eveniment nou
          </button>
        )}
      </div>

      {events.length === 0 && (
        <div style={{ textAlign: "center", color: "#555", padding: "4rem 0" }}>
          Niciun eveniment programat momentan.
        </div>
      )}

      {events.map(ev => {
        const d = new Date(ev.date);
        const day = d.getDate();
        const month = d.toLocaleString("ro-RO", { month: "short" }).toUpperCase();
        const dayOfWeek = d.toLocaleString("ro-RO", { weekday: "long" });

        return (
          <div key={ev._id} style={{ background: "#1a1a1a", borderRadius: 14, padding: "16px", marginBottom: 12, border: `1px solid ${ev.color}22` }}>
            <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
              {/* Calendar badge */}
              <div style={{ background: "#111", borderRadius: 10, padding: "8px 12px", textAlign: "center", minWidth: 52, border: `1px solid ${ev.color}44`, flexShrink: 0 }}>
                <div style={{ fontSize: 10, color: ev.color, fontWeight: 700, letterSpacing: 1 }}>{month}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{day}</div>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{ev.icon} {ev.title}</div>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  📅 {dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1)}, {ev.time}
                  {ev.location && <span> · 📍 {ev.location}</span>}
                </div>

                {ev.description && (
                  <div style={{ fontSize: 13, color: "#aaa", marginTop: 8, lineHeight: 1.5 }}>{ev.description}</div>
                )}

                {/* Intrare */}
                <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  {ev.entry?.type === "gratuit" ? (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#27ae60", background: "#1a2e1a", padding: "3px 10px", borderRadius: 20 }}>
                      🆓 Intrare gratuită
                    </span>
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 700, color: "#f39c12", background: "#2e2500", padding: "3px 10px", borderRadius: 20 }}>
                      💰 Intrare: {ev.entry?.price?.toLocaleString()}{ev.entry?.currency}
                    </span>
                  )}
                </div>

                {/* Premii */}
                {ev.prizes?.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 11, color: "#666", fontWeight: 700, marginBottom: 4, textTransform: "uppercase", letterSpacing: 0.5 }}>🏆 Premii</div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {ev.prizes.map((p, i) => (
                        <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontSize: 11, color: ev.color, fontWeight: 700, minWidth: 60 }}>{p.place}</span>
                          <span style={{ fontSize: 12, color: "#ccc" }}>{p.reward}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Panel participanți */}
            <ParticipantsPanel
              event={ev}
              user={user}
              onUpdate={handleParticipantsUpdate}
            />

            {/* Admin: buton ștergere */}
            {user?.isAdmin && (
              <button onClick={() => handleDelete(ev._id)}
                style={{ marginTop: 12, width: "100%", padding: "7px", borderRadius: 8, border: "1px solid #e74c3c33", background: "transparent", color: "#e74c3c", fontWeight: 600, cursor: "pointer", fontSize: 12 }}>
                🗑️ Șterge evenimentul
              </button>
            )}
          </div>
        );
      })}

      {showModal && (
        <CreateEventModal
          onClose={() => setShowModal(false)}
          onCreated={(ev) => setEvents(prev => [ev, ...prev])}
        />
      )}
    </div>
  );
}
