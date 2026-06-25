export default function EventsPage() {
  const events = [
    { id: 1, title: "Drag Race Event", date: "25", month: "IUN", time: "Sâmbătă, 20:00", participants: 32, icon: "🏎️", color: "#e91e8c", desc: "Cea mai rapidă mașină câștigă! Locație: Industrial District." },
    { id: 2, title: "Party la Maze Bank", date: "28", month: "IUN", time: "Vineri, 21:00", participants: 18, icon: "🎉", color: "#9b59b6", desc: "Petrecere pe acoperișul Maze Bank. DJ live, prize pool 50k$." },
    { id: 3, title: "Vânătoare de Bounty", date: "5", month: "IUL", time: "Duminică, 18:00", participants: 24, icon: "🎯", color: "#e67e22", desc: "3 jucători cu bounty activ. Primul care îi prindem câștigă!" },
    { id: 4, title: "Campionat Fotbal LS", date: "10", month: "IUL", time: "Sâmbătă, 17:00", participants: 44, icon: "⚽", color: "#27ae60", desc: "Turneu 5v5 pe stadionul din LS. Înregistrare obligatorie." },
    { id: 5, title: "Car Show Vespucci", date: "15", month: "IUL", time: "Duminică, 19:00", participants: 30, icon: "🚗", color: "#3498db", desc: "Expozitie auto. Cei mai buni 3 câștigă premii speciale!" },
  ];

  return (
    <div style={{ padding: "16px" }}>
      <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 16 }}>Evenimente viitoare</div>
      {events.map(ev => (
        <div key={ev.id} style={{ background: "#1a1a1a", borderRadius: 14, padding: "16px", marginBottom: 12, border: "1px solid #222" }}>
          <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
            <div style={{ background: "#111", borderRadius: 10, padding: "8px 12px", textAlign: "center", minWidth: 52, border: `1px solid ${ev.color}44` }}>
              <div style={{ fontSize: 10, color: ev.color, fontWeight: 700, letterSpacing: 1 }}>{ev.month}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#fff" }}>{ev.date}</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{ev.icon} {ev.title}</div>
              <div style={{ fontSize: 13, color: "#888", marginTop: 4 }}>📅 {ev.time}</div>
              <div style={{ fontSize: 12, color: "#666", marginTop: 2 }}>👥 {ev.participants} participanți</div>
              <div style={{ fontSize: 13, color: "#aaa", marginTop: 8, lineHeight: 1.5 }}>{ev.desc}</div>
            </div>
          </div>
          <button style={{ marginTop: 12, width: "100%", padding: "9px", borderRadius: 10, border: `1px solid ${ev.color}`, background: "transparent", color: ev.color, fontWeight: 600, cursor: "pointer", fontSize: 13 }}>
            Participă la eveniment
          </button>
        </div>
      ))}
    </div>
  );
}
