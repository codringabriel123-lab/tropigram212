const router = require("express").Router();
const Notification = require("../models/Notification");
const { auth } = require("../middleware/auth");

// Obține notificările
router.get("/", auth, async (req, res) => {
  try {
    const notifs = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate("sender", "username displayName avatar");
    res.json(notifs);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Număr necitite
router.get("/unread-count", auth, async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user._id, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Marchează toate ca citite
router.put("/read-all", auth, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ message: "Toate marcate ca citite" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
