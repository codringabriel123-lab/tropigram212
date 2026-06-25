import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api";
import Avatar from "../components/Avatar";

function timeAgo(date) {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return "acum";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}z`;
}

export default function MessagesPage() {
  const { user: me } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const bottomRef = useRef();
  const pollRef = useRef();

  // Încarcă conversațiile
  const fetchConversations = async () => {
    try {
      const res = await api.get("/messages/conversations");
      setConversations(res.data);
      return res.data;
    } catch {}
  };

  useEffect(() => {
    fetchConversations().finally(() => setLoading(false));
  }, []);

  // Dacă vine cu ?with=userId, deschide/creează conversația direct
  useEffect(() => {
    const withUserId = searchParams.get("with");
    if (withUserId) {
      api.post("/messages/conversations", { userId: withUserId })
        .then(res => openConversation(res.data))
        .catch(() => {});
    }
  }, [searchParams]);

  const openConversation = async (conv) => {
    setActiveConv(conv);
    setLoadingMsgs(true);
    clearInterval(pollRef.current);
    try {
      const res = await api.get(`/messages/conversations/${conv._id}/messages`);
      setMessages(res.data);
      // Actualizează conversațiile (badge-uri citite)
      fetchConversations();
    } catch {}
    setLoadingMsgs(false);

    // Polling la 3s pentru mesaje noi
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/messages/conversations/${conv._id}/messages`);
        setMessages(res.data);
      } catch {}
    }, 3000);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => clearInterval(pollRef.current);
  }, []);

  const sendMessage = async () => {
    if (!text.trim() || !activeConv || sending) return;
    setSending(true);
    try {
      const res = await api.post(`/messages/conversations/${activeConv._id}/messages`, { text: text.trim() });
      setMessages(prev => [...prev, res.data]);
      setText("");
      fetchConversations();
    } catch {}
    setSending(false);
  };

  const getOther = (conv) => conv.participants?.find(p => p._id !== me?._id);

  const s = {
    page: { display: "flex", height: "calc(100vh - 120px)", background: "#0d0d0d" },
    sidebar: { width: 260, borderRight: "1px solid #1f1f1f", display: "flex", flexDirection: "column", flexShrink: 0 },
    sideHeader: { padding: "14px 16px", fontWeight: 700, fontSize: 15, borderBottom: "1px solid #1f1f1f" },
    convItem: (active) => ({
      display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
      cursor: "pointer", background: active ? "#1a1a1a" : "transparent",
      borderBottom: "1px solid #111", transition: "background 0.15s",
    }),
    chat: { flex: 1, display: "flex", flexDirection: "column" },
    chatHeader: { padding: "12px 16px", borderBottom: "1px solid #1f1f1f", display: "flex", alignItems: "center", gap: 10, fontWeight: 700, fontSize: 14 },
    messages: { flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 },
    bubble: (mine) => ({
      maxWidth: "70%", padding: "8px 12px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: mine ? "#e91e8c" : "#1f1f1f", color: "#fff", fontSize: 13, lineHeight: 1.5,
      alignSelf: mine ? "flex-end" : "flex-start",
    }),
    inputRow: { display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid #1f1f1f", alignItems: "center" },
    input: { flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: "8px 14px", color: "#fff", fontSize: 13, outline: "none" },
    sendBtn: (ok) => ({ background: ok ? "#e91e8c" : "#333", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: ok ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),
    empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#444", gap: 8 },
  };

  return (
    <div style={s.page}>
      {/* Sidebar conversații */}
      <div style={s.sidebar}>
        <div style={s.sideHeader}>💬 Mesaje</div>
        {loading && <div style={{ padding: "2rem", textAlign: "center", color: "#444" }}>Se încarcă...</div>}
        {!loading && conversations.length === 0 && (
          <div style={{ padding: "2rem", textAlign: "center", color: "#444", fontSize: 13 }}>
            Nicio conversație încă.<br />
            <span style={{ color: "#e91e8c", cursor: "pointer" }} onClick={() => navigate("/members")}>Găsește membri →</span>
          </div>
        )}
        {conversations.map(conv => {
          const other = getOther(conv);
          const isActive = activeConv?._id === conv._id;
          const lastMsg = conv.lastMessage;
          return (
            <div key={conv._id} style={s.convItem(isActive)} onClick={() => openConversation(conv)}>
              <Avatar user={other} size={38} />
              <div style={{ flex: 1, overflow: "hidden" }}>
                <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {other?.displayName || other?.username}
                </div>
                {lastMsg && (
                  <div style={{ fontSize: 11, color: "#555", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {lastMsg.sender === me?._id ? "Tu: " : ""}{lastMsg.text}
                  </div>
                )}
              </div>
              {lastMsg && <div style={{ fontSize: 10, color: "#444", flexShrink: 0 }}>{timeAgo(lastMsg.createdAt)}</div>}
            </div>
          );
        })}
      </div>

      {/* Chat activ */}
      <div style={s.chat}>
        {!activeConv ? (
          <div style={s.empty}>
            <span style={{ fontSize: 40 }}>💬</span>
            <span style={{ fontSize: 14 }}>Selectează o conversație</span>
            <span style={{ fontSize: 12, color: "#e91e8c", cursor: "pointer" }} onClick={() => navigate("/members")}>
              sau începe una din profilul unui membru →
            </span>
          </div>
        ) : (
          <>
            <div style={s.chatHeader}>
              <div onClick={() => navigate(`/profile/${getOther(activeConv)?._id}`)} style={{ cursor: "pointer" }}>
                <Avatar user={getOther(activeConv)} size={34} />
              </div>
              <span onClick={() => navigate(`/profile/${getOther(activeConv)?._id}`)} style={{ cursor: "pointer" }}>
                {getOther(activeConv)?.displayName || getOther(activeConv)?.username}
              </span>
            </div>

            <div style={s.messages}>
              {loadingMsgs && <div style={{ textAlign: "center", color: "#444", fontSize: 12 }}>Se încarcă...</div>}
              {messages.map(msg => {
                const mine = msg.sender?._id === me?._id || msg.sender === me?._id;
                return (
                  <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                    <div style={s.bubble(mine)}>{msg.text}</div>
                    <span style={{ fontSize: 10, color: "#444" }}>{timeAgo(msg.createdAt)}</span>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>

            <div style={s.inputRow}>
              <input
                style={s.input}
                placeholder="Scrie un mesaj..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                maxLength={1000}
              />
              <button style={s.sendBtn(text.trim() && !sending)} onClick={sendMessage} disabled={!text.trim() || sending}>
                ➤
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
