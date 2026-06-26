import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { ROLE_COLORS } from "../utils/roleUtils";
import api from "../api";
import Avatar from "../components/Avatar";

const ROLES = ["Civil", "Politie", "Mecanic", "Pompier", "Medic"];
const ROLE_EMOJIS = { Civil: "🧑", Politie: "👮", Mecanic: "🔧", Pompier: "🚒", Medic: "🏥" };
const GAME_DURATION = 30; // seconds per round

export default function MinigamePage() {
  const { theme: t } = useTheme();
  const { user: me } = useAuth();
  const navigate = useNavigate();

  const [screen, setScreen] = useState("menu"); // menu | playing | gameover
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(true);

  // game state
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [current, setCurrent] = useState(null);
  const [choices, setChoices] = useState([]);
  const [answered, setAnswered] = useState(null); // null | "correct" | "wrong"
  const [wrongChoice, setWrongChoice] = useState(null);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [highscore, setHighscore] = useState(() => parseInt(localStorage.getItem("trp_minigame_hs") || "0"));

  useEffect(() => {
    api.get("/users/")
      .then(res => {
        // filter only users with real roles
        const valid = (res.data || []).filter(u => ROLES.includes(u.role) && u._id !== me?._id);
        setMembers(valid);
      })
      .catch(() => {})
      .finally(() => setLoadingMembers(false));
  }, []);

  const pickQuestion = useCallback((pool) => {
    if (pool.length < 2) return;
    const correct = pool[Math.floor(Math.random() * pool.length)];
    const wrongOptions = ROLES.filter(r => r !== correct.role);
    // shuffle wrong + correct
    const opts = [correct.role, ...wrongOptions.sort(() => Math.random() - 0.5).slice(0, 3)];
    opts.sort(() => Math.random() - 0.5);
    setCurrent(correct);
    setChoices(opts);
    setAnswered(null);
    setWrongChoice(null);
  }, []);

  const startGame = () => {
    setScore(0);
    setStreak(0);
    setBestStreak(0);
    setTimeLeft(GAME_DURATION);
    setTotalAnswered(0);
    setCorrect(0);
    setScreen("playing");
    pickQuestion(members);
  };

  // timer
  useEffect(() => {
    if (screen !== "playing") return;
    if (timeLeft <= 0) {
      endGame();
      return;
    }
    const t = setTimeout(() => setTimeLeft(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [screen, timeLeft]);

  const endGame = () => {
    setScreen("gameover");
    if (score > highscore) {
      setHighscore(score);
      localStorage.setItem("trp_minigame_hs", String(score));
    }
  };

  const handleAnswer = (role) => {
    if (answered) return;
    const isCorrect = role === current.role;
    setTotalAnswered(p => p + 1);
    if (isCorrect) {
      const bonus = Math.min(streak, 5); // max 5x streak bonus
      const pts = 10 + bonus * 2;
      setScore(p => p + pts);
      setCorrect(p => p + 1);
      setStreak(p => {
        const ns = p + 1;
        setBestStreak(b => Math.max(b, ns));
        return ns;
      });
      setAnswered("correct");
      setTimeout(() => pickQuestion(members), 600);
    } else {
      setStreak(0);
      setWrongChoice(role);
      setAnswered("wrong");
      setTimeout(() => pickQuestion(members), 1000);
    }
  };

  const pct = (correct / Math.max(1, totalAnswered)) * 100;
  const timerColor = timeLeft > 15 ? t.accent : timeLeft > 7 ? "#f5a623" : "#e74c3c";

  if (screen === "menu") {
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🎮</div>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: t.text, marginBottom: 6 }}>Ghicește Rolul!</h2>
        <p style={{ color: t.textMuted, fontSize: 13, marginBottom: 24, lineHeight: 1.6 }}>
          Îți apare un profil de pe TropicaRP.<br/>
          Ghicește ce rol are cât mai repede!<br/>
          <b style={{ color: t.accent }}>Streak = puncte bonus</b> 🔥
        </p>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap", marginBottom: 24 }}>
          {ROLES.map(r => (
            <div key={r} style={{ padding: "6px 14px", borderRadius: 20, background: t.surface, border: `1px solid ${t.border}`, fontSize: 13, color: ROLE_COLORS[r] || t.textMuted }}>
              {ROLE_EMOJIS[r]} {r}
            </div>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24, padding: "16px", background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.accent }}>{highscore}</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>Record personal</div>
          </div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: t.text }}>{members.length}</div>
            <div style={{ fontSize: 11, color: t.textMuted }}>Membri în joc</div>
          </div>
        </div>

        <button onClick={startGame} disabled={loadingMembers || members.length < 2}
          style={{ width: "100%", padding: "14px", borderRadius: 14, background: t.accent, border: "none", color: "#fff", fontWeight: 800, fontSize: 16, cursor: members.length < 2 ? "not-allowed" : "pointer", opacity: members.length < 2 ? 0.5 : 1 }}>
          {loadingMembers ? "⏳ Se încarcă..." : members.length < 2 ? "Prea puțini membri" : "🎮 Începe Jocul"}
        </button>
      </div>
    );
  }

  if (screen === "gameover") {
    const isNewRecord = score >= highscore && score > 0;
    return (
      <div style={{ padding: 20, maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>{isNewRecord ? "🎉" : "😅"}</div>
        <h2 style={{ fontWeight: 800, fontSize: 22, color: t.text, marginBottom: 4 }}>
          {isNewRecord ? "Nou record!" : "Timp expirat!"}
        </h2>
        {isNewRecord && <div style={{ color: t.accent, fontWeight: 700, marginBottom: 8 }}>🏆 Felicitări!</div>}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "20px 0", padding: 16, background: t.surface, borderRadius: 14, border: `1px solid ${t.border}` }}>
          <StatBox label="Scor" value={score} accent color={t.accent} t={t} />
          <StatBox label="Record" value={highscore} t={t} />
          <StatBox label="Corect" value={`${correct}/${totalAnswered}`} t={t} />
          <StatBox label="Acuratețe" value={`${Math.round(pct)}%`} t={t} />
          <StatBox label="Max Streak" value={`🔥 ${bestStreak}`} t={t} />
          <StatBox label="Timp" value={`${GAME_DURATION}s`} t={t} />
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button onClick={startGame} style={{ flex: 1, padding: "12px", borderRadius: 12, background: t.accent, border: "none", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🔄 Din nou
          </button>
          <button onClick={() => setScreen("menu")} style={{ flex: 1, padding: "12px", borderRadius: 12, background: t.surface, border: `1px solid ${t.border}`, color: t.text, fontWeight: 700, fontSize: 14, cursor: "pointer" }}>
            🏠 Meniu
          </button>
        </div>
      </div>
    );
  }

  // PLAYING
  return (
    <div style={{ padding: "16px", maxWidth: 480, margin: "0 auto" }}>
      {/* HUD */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        {/* Timer */}
        <div style={{ flex: 1, height: 6, background: t.surface2, borderRadius: 3, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${(timeLeft / GAME_DURATION) * 100}%`, background: timerColor, borderRadius: 3, transition: "width 1s linear, background 0.3s" }} />
        </div>
        <div style={{ fontWeight: 800, fontSize: 16, color: timerColor, minWidth: 28, textAlign: "right" }}>{timeLeft}</div>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20, padding: "10px 14px", background: t.surface, borderRadius: 12, border: `1px solid ${t.border}` }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: t.accent }}>{score}</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Scor</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: streak > 2 ? "#f5a623" : t.text }}>{streak > 0 ? `🔥 ${streak}` : "—"}</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Streak</div>
        </div>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 800, fontSize: 20, color: t.text }}>{correct}/{totalAnswered}</div>
          <div style={{ fontSize: 10, color: t.textMuted }}>Corect</div>
        </div>
      </div>

      {/* CARD */}
      {current && (
        <div style={{ background: t.surface, border: `1px solid ${t.border}`, borderRadius: 18, padding: "24px 20px", textAlign: "center", marginBottom: 20, boxShadow: `0 4px 24px ${t.shadow}` }}>
          <div style={{ width: 80, height: 80, borderRadius: "50%", overflow: "hidden", margin: "0 auto 12px", border: `3px solid ${t.border}` }}>
            <Avatar user={current} size={80} />
          </div>
          <div style={{ fontWeight: 700, fontSize: 16, color: t.text }}>{current.displayName || current.username}</div>
          <div style={{ fontSize: 12, color: t.textMuted, marginTop: 2 }}>@{current.username}</div>
          {current.bio && (
            <div style={{ fontSize: 12, color: t.textFaint, marginTop: 8, padding: "0 16px", lineHeight: 1.5, maxHeight: 40, overflow: "hidden" }}>
              {current.bio}
            </div>
          )}
          <div style={{ marginTop: 12, fontSize: 14, color: t.textMuted, fontWeight: 600 }}>
            Ce rol are? 🤔
          </div>
        </div>
      )}

      {/* CHOICES */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {choices.map(role => {
          let bg = t.surface;
          let border = t.border;
          let color = t.text;

          if (answered) {
            if (role === current.role) { bg = "#2ecc7133"; border = "#2ecc71"; color = "#2ecc71"; }
            else if (role === wrongChoice) { bg = "#e74c3c33"; border = "#e74c3c"; color = "#e74c3c"; }
          }

          return (
            <button key={role} onClick={() => handleAnswer(role)}
              style={{
                padding: "14px 10px", borderRadius: 14,
                background: bg, border: `2px solid ${border}`,
                color, fontWeight: 700, fontSize: 14, cursor: answered ? "default" : "pointer",
                transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              }}>
              <span style={{ fontSize: 18 }}>{ROLE_EMOJIS[role]}</span>
              {role}
            </button>
          );
        })}
      </div>

      {answered && (
        <div style={{ marginTop: 14, textAlign: "center", fontWeight: 700, fontSize: 15, color: answered === "correct" ? "#2ecc71" : "#e74c3c", animation: "fadeIn 0.2s ease" }}>
          {answered === "correct"
            ? `✅ Corect! +${10 + Math.min(streak - 1, 5) * 2} pts ${streak > 1 ? `🔥 x${streak}` : ""}`
            : `❌ Era ${ROLE_EMOJIS[current.role]} ${current.role}`}
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value, color, accent, t }) {
  return (
    <div style={{ padding: "10px", background: t.surface2, borderRadius: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 20, color: color || t.text }}>{value}</div>
      <div style={{ fontSize: 11, color: t.textMuted }}>{label}</div>
    </div>
  );
}
