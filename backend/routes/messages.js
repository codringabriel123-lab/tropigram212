const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");

// Obține toate conversațiile userului curent
router.get("/conversations", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("participants", "username displayName avatar")
      .populate({ path: "lastMessage", select: "text sender createdAt read" });
    res.json(conversations);
  } catch (err) {
    res.status(500).json({ message: "Eroare la încărcarea conversațiilor" });
  }
});

// Creează sau obține conversația cu un user
router.post("/conversations", auth, async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId lipsă" });
    if (userId === req.user._id.toString()) return res.status(400).json({ message: "Nu poți trimite mesaj ție însuți" });

    let conv = await Conversation.findOne({
      participants: { $all: [req.user._id, userId], $size: 2 },
    })
      .populate("participants", "username displayName avatar")
      .populate({ path: "lastMessage", select: "text sender createdAt read" });

    if (!conv) {
      conv = await Conversation.create({ participants: [req.user._id, userId] });
      await conv.populate("participants", "username displayName avatar");
    }

    res.json(conv);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Obține mesajele dintr-o conversație
router.get("/conversations/:convId/messages", auth, async (req, res) => {
  try {
    const conv = await Conversation.findById(req.params.convId);
    if (!conv) return res.status(404).json({ message: "Conversație negăsită" });
    if (!conv.participants.map(String).includes(req.user._id.toString()))
      return res.status(403).json({ message: "Acces interzis" });

    const messages = await Message.find({ conversation: req.params.convId })
      .sort({ createdAt: 1 })
      .populate("sender", "username displayName avatar");

    // Marchează mesajele primite ca citite
    await Message.updateMany(
      { conversation: req.params.convId, sender: { $ne: req.user._id }, read: false },
      { read: true }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Trimite mesaj
router.post("/conversations/:convId/messages", auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Mesajul este gol" });

    const conv = await Conversation.findById(req.params.convId);
    if (!conv) return res.status(404).json({ message: "Conversație negăsită" });
    if (!conv.participants.map(String).includes(req.user._id.toString()))
      return res.status(403).json({ message: "Acces interzis" });

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      text: text.trim(),
    });

    conv.lastMessage = msg._id;
    conv.updatedAt = new Date();
    await conv.save();

    await msg.populate("sender", "username displayName avatar");
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: "Eroare la trimitere" });
  }
});

// Număr mesaje necitite (pentru badge)
router.get("/unread-count", auth, async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id });
    const convIds = convs.map(c => c._id);
    const count = await Message.countDocuments({
      conversation: { $in: convIds },
      sender: { $ne: req.user._id },
      read: false,
    });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ count: 0 });
  }
});

module.exports = router;
