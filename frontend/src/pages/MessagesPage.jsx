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

  const [activeTab, setActiveTab] = useState("dm");
  const [hasMafiaAccess, setHasMafiaAccess] = useState(false);

  // DM state
  const [conversations, setConversations] = useState([]);
  const [activeConv, setActiveConv] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // ✏️ Typing indicator
  const [isTyping, setIsTyping] = useState(false);
  const typingPollRef = useRef();
  const typingTimeoutRef = useRef();

  // Mafia chat state
  const [mafiaMessages, setMafiaMessages] = useState([]);
  const [mafiaText, setMafiaText] = useState("");
  const [mafiaSending, setMafiaSending] = useState(false);
  const [mafiaLoading, setMafiaLoading] = useState(false);

  const bottomRef = useRef();
  const mafiaBottomRef = useRef();
  const pollRef = useRef();
  const mafiaPollRef = useRef();

  useEffect(() => {
    api.get("/mafia/check")
      .then(() => setHasMafiaAccess(true))
      .catch(() => setHasMafiaAccess(false));
  }, []);

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
    setIsTyping(false);
    clearInterval(pollRef.current);
    clearInterval(typingPollRef.current);
    try {
      const res = await api.get(`/messages/conversations/${conv._id}/messages`);
      setMessages(res.data);
      fetchConversations();
    } catch {}
    setLoadingMsgs(false);

    // Poll mesaje
    pollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/messages/conversations/${conv._id}/messages`);
        setMessages(res.data);
      } catch {}
    }, 3000);

    // ✏️ Poll typing indicator
    typingPollRef.current = setInterval(async () => {
      try {
        const res = await api.get(`/messages/conversations/${conv._id}/typing`);
        setIsTyping(res.data.typing);
      } catch {}
    }, 1500);
  };

  // ✏️ Trimite typing event când userul scrie
  const handleTextChange = (e) => {
    setText(e.target.value);
    if (!activeConv) return;
    api.post(`/messages/conversations/${activeConv._id}/typing`).catch(() => {});
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {}, 3000);
  };

  // 🗑️ Șterge mesaj propriu
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Ștergi acest mesaj?")) return;
    try {
      await api.delete(`/messages/${msgId}`);
      setMessages(prev => prev.map(m => m._id === msgId ? { ...m, isDeleted: true, text: "Mesaj șters" } : m));
    } catch {}
  };

  // Mafia chat
  const fetchMafiaMessages = async () => {
    try {
      const res = await api.get("/mafia/messages");
      setMafiaMessages(res.data);
    } catch {}
  };

  useEffect(() => {
    if (activeTab === "mafia" && hasMafiaAccess) {
      setMafiaLoading(true);
      fetchMafiaMessages().finally(() => setMafiaLoading(false));
      mafiaPollRef.current = setInterval(fetchMafiaMessages, 3000);
    } else {
      clearInterval(mafiaPollRef.current);
    }
    return () => clearInterval(mafiaPollRef.current);
  }, [activeTab, hasMafiaAccess]);

  const sendMafiaMessage = async () => {
    if (!mafiaText.trim() || mafiaSending) return;
    setMafiaSending(true);
    try {
      const res = await api.post("/mafia/messages", { text: mafiaText.trim() });
      setMafiaMessages(prev => [...prev, res.data]);
      setMafiaText("");
    } catch {}
    setMafiaSending(false);
  };

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  useEffect(() => {
    mafiaBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mafiaMessages]);

  useEffect(() => {
    return () => {
      clearInterval(pollRef.current);
      clearInterval(mafiaPollRef.current);
      clearInterval(typingPollRef.current);
      clearTimeout(typingTimeoutRef.current);
    };
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
    page: { display: "flex", flexDirection: "column", height: "calc(100vh - 120px)", background: "#0d0d0d" },
    tabs: { display: "flex", borderBottom: "1px solid #1f1f1f", flexShrink: 0 },
    tab: (active, mafia) => ({
      flex: 1, padding: "11px 0", textAlign: "center", cursor: "pointer", fontSize: 13, fontWeight: active ? 700 : 400,
      color: active ? (mafia ? "#cc0000" : "#e91e8c") : "#555",
      borderBottom: active ? `2px solid ${mafia ? "#cc0000" : "#e91e8c"}` : "2px solid transparent",
      background: "transparent", border: "none", transition: "color 0.15s",
    }),
    body: { flex: 1, display: "flex", overflow: "hidden" },
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
    bubble: (mine, deleted) => ({
      maxWidth: "70%", padding: "8px 12px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: deleted ? "#111" : mine ? "#e91e8c" : "#1f1f1f",
      color: deleted ? "#555" : "#fff", fontSize: 13, lineHeight: 1.5,
      alignSelf: mine ? "flex-end" : "flex-start",
      fontStyle: deleted ? "italic" : "normal",
    }),
    mafiaBubble: (mine) => ({
      maxWidth: "70%", padding: "8px 12px", borderRadius: mine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
      background: mine ? "#8b0000" : "#1a0000", color: "#ffcccc", fontSize: 13, lineHeight: 1.5,
      alignSelf: mine ? "flex-end" : "flex-start",
      border: mine ? "1px solid #cc0000" : "1px solid #440000",
    }),
    inputRow: { display: "flex", gap: 8, padding: "12px 16px", borderTop: "1px solid #1f1f1f", alignItems: "center" },
    input: { flex: 1, background: "#1a1a1a", border: "1px solid #333", borderRadius: 20, padding: "8px 14px", color: "#fff", fontSize: 13, outline: "none" },
    mafiaInput: { flex: 1, background: "#1a0000", border: "1px solid #550000", borderRadius: 20, padding: "8px 14px", color: "#ffcccc", fontSize: 13, outline: "none" },
    sendBtn: (ok, mafia) => ({ background: ok ? (mafia ? "#8b0000" : "#e91e8c") : "#333", border: "none", borderRadius: "50%", width: 36, height: 36, color: "#fff", fontSize: 18, cursor: ok ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }),
    empty: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#444", gap: 8 },
    mafiaHeader: { padding: "12px 16px", borderBottom: "1px solid #330000", display: "flex", alignItems: "center", gap: 8, background: "#0d0000" },
    mafiaSenderName: { fontSize: 10, color: "#cc4444", marginBottom: 2 },
    typingIndicator: { alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 6, color: "#888", fontSize: 12, padding: "4px 0" },
  };

  return (
    <div style={s.page}>
      <div style={s.tabs}>
        <button style={s.tab(activeTab === "dm", false)} onClick={() => setActiveTab("dm")}>
          💬 Mesaje Directe
        </button>
        {hasMafiaAccess && (
          <button style={s.tab(activeTab === "mafia", true)} onClick={() => setActiveTab("mafia")}>
            🔴 Chat Mafie
          </button>
        )}
      </div>

      <div style={s.body}>
        {activeTab === "dm" && (
          <>
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
                    {messages.map((msg, idx) => {
                      const mine = msg.sender?._id === me?._id || msg.sender === me?._id;
                      const isLast = idx === messages.length - 1;
                      const showSeen = mine && isLast && msg.read && msg.seenAt;
                      return (
                        <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                          <div style={{ position: "relative", maxWidth: "70%", display: "flex", alignItems: "center", gap: 6, flexDirection: mine ? "row-reverse" : "row" }}>
                            <div style={s.bubble(mine, msg.isDeleted)}>{msg.isDeleted ? "🗑️ Mesaj șters" : msg.text}</div>
                            {/* 🗑️ Delete button — doar mesajele proprii, nedeletate */}
                            {mine && !msg.isDeleted && (
                              <button
                                onClick={() => handleDeleteMessage(msg._id)}
                                style={{ background: "none", border: "none", color: "#444", cursor: "pointer", fontSize: 13, padding: "2px", opacity: 0.6, flexShrink: 0 }}
                                title="Șterge mesaj"
                              >🗑️</button>
                            )}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ fontSize: 10, color: "#444" }}>{timeAgo(msg.createdAt)}</span>
                            {showSeen && <span style={{ fontSize: 10, color: "#e91e8c" }}>· Văzut</span>}
                          </div>
                        </div>
                      );
                    })}

                    {/* ✏️ Typing indicator */}
                    {isTyping && (
                      <div style={s.typingIndicator}>
                        <span style={{ fontSize: 16 }}>✏️</span>
                        <span>{getOther(activeConv)?.displayName || getOther(activeConv)?.username} scrie...</span>
                        <span style={{ letterSpacing: 2 }}>
                          <span style={{ animation: "blink 1.4s infinite 0s" }}>●</span>
                          <span style={{ animation: "blink 1.4s infinite 0.2s" }}>●</span>
                          <span style={{ animation: "blink 1.4s infinite 0.4s" }}>●</span>
                        </span>
                      </div>
                    )}

                    <div ref={bottomRef} />
                  </div>

                  <div style={s.inputRow}>
                    <input
                      style={s.input}
                      placeholder="Scrie un mesaj..."
                      value={text}
                      onChange={handleTextChange}
                      onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                      maxLength={1000}
                    />
                    <button style={s.sendBtn(text.trim() && !sending, false)} onClick={sendMessage} disabled={!text.trim() || sending}>
                      ➤
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {activeTab === "mafia" && hasMafiaAccess && (
          <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "#0a0000" }}>
            <div style={s.mafiaHeader}>
              <span style={{ fontSize: 20 }}>🔴</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#ff4444" }}>Chat Intern Mafie</div>
                <div style={{ fontSize: 11, color: "#664444" }}>Criptat • Invizibil pentru poliție</div>
              </div>
            </div>

            <div style={{ ...s.messages, background: "#0a0000" }}>
              {mafiaLoading && <div style={{ textAlign: "center", color: "#440000", fontSize: 12 }}>Se încarcă...</div>}
              {mafiaMessages.map(msg => {
                const mine = msg.sender?._id === me?._id || msg.sender === me?._id;
                return (
                  <div key={msg._id} style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start", gap: 2 }}>
                    {!mine && <div style={s.mafiaSenderName}>{msg.sender?.displayName || msg.sender?.username}</div>}
                    <div style={s.mafiaBubble(mine)}>{msg.text}</div>
                    <span style={{ fontSize: 10, color: "#442222" }}>{timeAgo(msg.createdAt)}</span>
                  </div>
                );
              })}
              <div ref={mafiaBottomRef} />
            </div>

            <div style={{ ...s.inputRow, borderTop: "1px solid #330000", background: "#0d0000" }}>
              <input
                style={s.mafiaInput}
                placeholder="Mesaj intern mafie..."
                value={mafiaText}
                onChange={e => setMafiaText(e.target.value)}
                onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMafiaMessage()}
                maxLength={1000}
              />
              <button style={s.sendBtn(mafiaText.trim() && !mafiaSending, true)} onClick={sendMafiaMessage} disabled={!mafiaText.trim() || mafiaSending}>
                ➤
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes blink {
          0%, 80%, 100% { opacity: 0; }
          40% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
