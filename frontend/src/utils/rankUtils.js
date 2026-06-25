// 🎖️ Rang/nivel bazat pe numărul de postări
export const RANKS = [
  { name: "Rookie", minPosts: 0, color: "#888", emoji: "🌱" },
  { name: "Regular", minPosts: 10, color: "#60a5fa", emoji: "⭐" },
  { name: "Veteran", minPosts: 50, color: "#f59e0b", emoji: "🔥" },
  { name: "Legend", minPosts: 150, color: "#e91e8c", emoji: "👑" },
];

export function getRank(postCount) {
  let rank = RANKS[0];
  for (const r of RANKS) {
    if (postCount >= r.minPosts) rank = r;
  }
  return rank;
}

export function getNextRank(postCount) {
  for (let i = RANKS.length - 1; i >= 0; i--) {
    if (RANKS[i].minPosts > postCount) continue;
    return RANKS[i + 1] || null;
  }
  return null;
}
