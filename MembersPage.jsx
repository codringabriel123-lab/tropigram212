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

// Verifică dacă un user curent poate vedea rolurile secrete (mafia)
// Backend-ul maschează deja datele, dar această funcție e utilă pentru logică UI
export function isMafiaUser(user) {
  return user?.customRole?.isMafia === true;
}

// Folosit în admin — returnează badge "🔴 MAFIA" dacă rolul e secret
export function getMafiaBadge(user) {
  return user?.customRole?.isMafia ? "🔴" : "";
}
