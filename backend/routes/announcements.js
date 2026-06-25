const router = require("express").Router();
const Announcement = require("../models/Announcement");
const { auth, adminAuth } = require("../middleware/auth");

// 📌 Obține anunțul activ curent
router.get("/active", auth, async (req, res) => {
  try {
    const ann = await Announcement.findOne({ active: true })
      .sort({ createdAt: -1 })
      .populate("author", "username displayName avatar");
    res.json(ann || null);
  } catch {
    res.status(500).json({ message: "Eroare" });
  }
});

// 📌 Obține toate anunțurile (admin)
router.get("/", adminAuth, async (req, res) => {
  try {
    const anns = await Announcement.find()
      .sort({ createdAt: -1 })
      .populate("author", "username displayName");
    res.json(anns);
  } catch {
    res.status(500).json({ message: "Eroare" });
  }
});

// 📌 Creare anunț (admin)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { content } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Conținut obligatoriu" });
    // Dezactivează anunțul anterior
    await Announcement.updateMany({}, { active: false });
    const ann = await Announcement.create({
      author: req.user._id,
      content: content.trim(),
      active: true,
    });
    await ann.populate("author", "username displayName avatar");
    res.status(201).json(ann);
  } catch {
    res.status(500).json({ message: "Eroare" });
  }
});

// 📌 Dezactivează un anunț (admin)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    await Announcement.findByIdAndUpdate(req.params.id, { active: false });
    res.json({ message: "Anunț dezactivat" });
  } catch {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
