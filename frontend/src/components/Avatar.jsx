export default function Avatar({ user, size = 40 }) {
  const isUrl = user?.avatar && user.avatar.startsWith("http");

  if (isUrl) {
    return (
      <img
        src={user.avatar}
        alt={user?.displayName || user?.username || "avatar"}
        style={{
          width: size,
          height: size,
          borderRadius: "50%",
          objectFit: "cover",
          border: "2px solid #333",
          flexShrink: 0,
        }}
      />
    );
  }

  // Fallback: inițiale
  const initials = user?.avatar ||
    (user?.displayName ? user.displayName.slice(0, 2).toUpperCase() :
     user?.username ? user.username.slice(0, 2).toUpperCase() : "??");

  return (
    <div style={{
      width: size,
      height: size,
      borderRadius: "50%",
      background: "#e91e8c",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      fontWeight: 700,
      fontSize: size * 0.35,
      color: "#fff",
      flexShrink: 0,
      border: "2px solid #333",
    }}>
      {initials}
    </div>
  );
}
