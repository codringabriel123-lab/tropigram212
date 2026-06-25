export default function Avatar({ user, size = 40 }) {
  if (!user) return <div style={{ width: size, height: size, borderRadius: "50%", background: "#333", flexShrink: 0 }} />;
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%", background: "#e91e8c",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.32, flexShrink: 0,
      border: "2px solid #2a2a2a", color: "#fff"
    }}>
      {user.avatar || user.displayName?.slice(0, 2).toUpperCase() || "??"}
    </div>
  );
}
