const User = require("../models/User");
const CustomRole = require("../models/CustomRole");

// Middleware: permite accesul doar userilor cu rol mafia (isMafia: true) sau adminilor
module.exports = async function mafiaAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ message: "Neautentificat" });

  // Adminii au acces
  if (req.user.isAdmin) return next();

  // Verifică dacă userul are un customRole cu isMafia: true
  const user = await User.findById(req.user._id).populate("customRole");
  if (user?.customRole?.isMafia) return next();

  return res.status(403).json({ message: "Acces interzis" });
};
