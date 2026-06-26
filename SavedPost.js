const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Neautentificat" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User negăsit" });

    // Ban temporar expirat -> se ridică automat
    if (user.isBanned && user.banExpiresAt && user.banExpiresAt <= new Date()) {
      user.isBanned = false;
      user.banReason = "";
      user.bannedAt = null;
      user.bannedBy = null;
      user.banExpiresAt = null;
      await user.save();
    }
    if (user.isBanned) return res.status(403).json({ message: `Cont banat: ${user.banReason || "Motiv nespecificat"}` });

    // Mute temporar expirat -> se ridică automat
    if (user.isMuted && user.muteExpiresAt && user.muteExpiresAt <= new Date()) {
      user.isMuted = false;
      user.muteReason = "";
      user.mutedAt = null;
      user.mutedBy = null;
      user.muteExpiresAt = null;
      await user.save();
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: "Token invalid" });
  }
};

const adminAuth = async (req, res, next) => {
  await auth(req, res, () => {
    if (!req.user.isAdmin) return res.status(403).json({ message: "Acces interzis" });
    next();
  });
};

// Blochează postare/comentariu/like dacă userul e mut; navigarea/citirea rămân libere
const muteCheck = (req, res, next) => {
  if (req.user.isMuted) {
    return res.status(403).json({ message: `Nu poți posta, comenta sau da like: ${req.user.muteReason || "Motiv nespecificat"}` });
  }
  next();
};

module.exports = { auth, adminAuth, muteCheck };
