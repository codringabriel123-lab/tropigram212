const router = require("express").Router();
const MafiaMessage = require("../models/MafiaMessage");
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const mafiaAuth = require("../middleware/mafiaAuth");

// Toate rutele necesită autentificare + rol mafia
router.use(auth, mafiaAuth);

// Obține ultimele 100 mesaje din chat-ul mafiei
router.get("/messages", async (req, res) => {
  try {
    const messages = await MafiaMessage.find()
      .sort({ createdAt: -1 })
      .limit(100)
      .populate("sender", "username displayName avatar role customRole");
    res.json(messages.reverse());
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Trimite mesaj în chat-ul mafiei
router.post("/messages", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Mesajul e gol" });

    const msg = await MafiaMessage.create({
      sender: req.user._id,
      text: text.trim(),
    });

    await msg.populate("sender", "username displayName avatar role customRole");
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: "Eroare la trimitere" });
  }
});

// Verifică dacă userul curent are acces la mafia chat
router.get("/check", async (req, res) => {
  res.json({ access: true });
});

module.exports = router;
