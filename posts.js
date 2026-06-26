const router = require("express").Router();
const Conversation = require("../models/Conversation");
const Message = require("../models/Message");
const { auth } = require("../middleware/auth");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Selecția folosită la populate-ul mesajului citat (reply)
const REPLY_SELECT = "text image sender isDeleted createdAt";

// Obține toate conversațiile userului curent
router.get("/conversations", auth, async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user._id })
      .sort({ updatedAt: -1 })
      .populate("participants", "username displayName avatar")
      .populate({ path: "lastMessage", select: "text image sender createdAt read" });
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
      .populate({ path: "lastMessage", select: "text image sender createdAt read" });

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
      .populate("sender", "username displayName avatar")
      .populate({ path: "replyTo", select: REPLY_SELECT, populate: { path: "sender", select: "username displayName avatar" } });

    // Marchează mesajele primite ca citite + seenAt
    await Message.updateMany(
      { conversation: req.params.convId, sender: { $ne: req.user._id }, read: false },
      { read: true, seenAt: new Date() }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Trimite mesaj (text și/sau imagine, opțional ca reply la alt mesaj)
router.post("/conversations/:convId/messages", auth, async (req, res) => {
  try {
    const { text, image, replyTo } = req.body;
    if (!text?.trim() && !image) return res.status(400).json({ message: "Mesajul este gol" });

    const conv = await Conversation.findById(req.params.convId);
    if (!conv) return res.status(404).json({ message: "Conversație negăsită" });
    if (!conv.participants.map(String).includes(req.user._id.toString()))
      return res.status(403).json({ message: "Acces interzis" });

    // ↩️ Validează că mesajul citat (reply) apartine acestei conversații
    let replyToId = null;
    if (replyTo) {
      const original = await Message.findOne({ _id: replyTo, conversation: conv._id });
      if (original) replyToId = original._id;
    }

    const msg = await Message.create({
      conversation: conv._id,
      sender: req.user._id,
      text: text?.trim() || "",
      image: image || "",
      replyTo: replyToId,
    });

    conv.lastMessage = msg._id;
    conv.updatedAt = new Date();
    await conv.save();

    await msg.populate("sender", "username displayName avatar");
    await msg.populate({ path: "replyTo", select: REPLY_SELECT, populate: { path: "sender", select: "username displayName avatar" } });
    res.status(201).json(msg);
  } catch (err) {
    res.status(500).json({ message: "Eroare la trimitere" });
  }
});

// 📎 Upload imagine pentru DM (separat de /upload general ca să poată avea folder dedicat)
router.post("/upload-image", auth, async (req, res) => {
  try {
    const { data } = req.body;
    if (!data) return res.status(400).json({ message: "Nicio imagine trimisă" });

    const result = await cloudinary.uploader.upload(data, {
      folder: "tropical-rp/dm",
      transformation: [
        { width: 1080, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la upload imagine" });
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

// 🗑️ Șterge mesaj (doar al tău)
router.delete("/:msgId", auth, async (req, res) => {
  try {
    const msg = await Message.findById(req.params.msgId);
    if (!msg) return res.status(404).json({ message: "Mesaj negăsit" });
    if (msg.sender.toString() !== req.user._id.toString())
      return res.status(403).json({ message: "Poți șterge doar mesajele tale" });
    msg.isDeleted = true;
    await msg.save();
    res.json({ message: "Mesaj șters" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ✏️ Typing indicator — setează că tastează
router.post("/conversations/:convId/typing", auth, async (req, res) => {
  // Stored in-memory via a simple global map (suficient pentru polling)
  if (!global.typingMap) global.typingMap = {};
  global.typingMap[`${req.params.convId}:${req.user._id}`] = Date.now();
  res.json({ ok: true });
});

// ✏️ Typing indicator — obține cine tastează în conversație
router.get("/conversations/:convId/typing", auth, async (req, res) => {
  if (!global.typingMap) global.typingMap = {};
  const conv = await Conversation.findById(req.params.convId);
  if (!conv) return res.status(404).json({ typing: false });

  const otherParticipants = conv.participants.map(String).filter(id => id !== req.user._id.toString());
  const now = Date.now();
  const typing = otherParticipants.some(otherId => {
    const ts = global.typingMap[`${req.params.convId}:${otherId}`];
    return ts && (now - ts) < 3000; // activ în ultimele 3s
  });
  res.json({ typing });
});

module.exports = router;
