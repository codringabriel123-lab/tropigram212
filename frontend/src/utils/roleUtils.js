export const ROLE_COLORS = {
  Civil: "#888",
  Politie: "#4a90e2",
  Mecanic: "#f5a623",
  Pompier: "#e74c3c",
  Medic: "#2ecc71",
  Admin: "#e91e8c",
};

// Returnează culoarea rolului — custom dacă există, altfel standard
export function getRoleColor(user) {
  if (user?.customRole?.color) return user.customRole.color;
  return ROLE_COLORS[user?.role] || "#888";
}

// Returnează numele rolului
export function getRoleName(user) {
  return user?.role || "Civil";
}
