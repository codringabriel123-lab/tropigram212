// 🟢 Status online/offline — punct verde dacă userul a fost activ în ultimele 5 min și e prieten
export default function Avatar({ user, size = 40, showOnline = false, friends = [] }) {
  const isUrl = user?.avatar && user.avatar.startsWith("http");

  // Online dacă lastSeen < 5 minute
  const isOnline = showOnline &&
    user?.lastSeen &&
    friends.map(String).includes(String(user?._id)) &&
    (Date.now() - new Date(user.lastSeen)) < 5 * 60 * 1000;

  const avatarEl = isUrl ? (
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
        display: "block",
      }}
    />
  ) : (
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
      {user?.avatar ||
        (user?.displayName ? user.displayName.slice(0, 2).toUpperCase() :
         user?.username ? user.username.slice(0, 2).toUpperCase() : "??")}
    </div>
  );

  if (!isOnline) return avatarEl;

  return (
    <div style={{ position: "relative", flexShrink: 0, width: size, height: size }}>
      {avatarEl}
      <div style={{
        position: "absolute",
        bottom: 1,
        right: 1,
        width: Math.max(8, size * 0.25),
        height: Math.max(8, size * 0.25),
        borderRadius: "50%",
        background: "#22c55e",
        border: "2px solid #0d0d0d",
      }} title="Online" />
    </div>
  );
}
