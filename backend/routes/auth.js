const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

router.post("/register", async (req, res) => {
  try {
    const { username, displayName, password, role } = req.body;
    if (!username || !displayName || !password)
      return res.status(400).json({ message: "Completează toate câmpurile" });
    if (password.length < 6)
      return res.status(400).json({ message: "Parola trebuie să aibă minim 6 caractere" });

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Username-ul este deja folosit" });

    const hashed = await bcrypt.hash(password, 12);
    const isFirstUser = (await User.countDocuments()) === 0;

    const user = new User({
      username: username.toLowerCase(),
      displayName,
      password: hashed,
      role: role || "Civil",
      isAdmin: isFirstUser,
      avatar: displayName.slice(0, 2).toUpperCase(),
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password: _, ...userObj } = user.toObject();
    res.status(201).json({ token, user: userObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la înregistrare" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username?.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Username sau parolă greșite" });
    if (user.isBanned) return res.status(403).json({ message: `Cont banat: ${user.banReason || "Motiv nespecificat"}` });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Username sau parolă greșite" });

    user.lastSeen = new Date();
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password: _, ...userObj } = user.toObject();
    res.json({ token, user: userObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la conectare" });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password");
  res.json(user);
});

module.exports = router;
