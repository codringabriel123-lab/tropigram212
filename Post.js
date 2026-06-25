const jwt = require("jsonwebtoken");
const User = require("../models/User");

const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.status(401).json({ message: "Neautentificat" });
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select("-password");
    if (!user) return res.status(401).json({ message: "User negăsit" });
    if (user.isBanned) return res.status(403).json({ message: `Cont banat: ${user.banReason || "Motiv nespecificat"}` });
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

module.exports = { auth, adminAuth };
