const router = require("express").Router();
const Report = require("../models/Report");
const { auth } = require("../middleware/auth");

// Trimite un raport (user → post sau user → user)
router.post("/", auth, async (req, res) => {
  try {
    const { targetUser, targetPost, type, reason } = req.body;
    if (!reason?.trim()) return res.status(400).json({ message: "Motivul e obligatoriu" });
    if (!["user", "post"].includes(type)) return res.status(400).json({ message: "Tip invalid" });

    // Un user nu poate raporta același target de mai mult de 3 ori
    const existing = await Report.countDocuments({ reporter: req.user._id, targetUser, targetPost });
    if (existing >= 3) return res.status(400).json({ message: "Ai raportat deja acest conținut" });

    const report = await Report.create({
      reporter: req.user._id,
      targetUser: targetUser || null,
      targetPost: targetPost || null,
      type,
      reason: reason.trim(),
    });
    res.status(201).json({ message: "Raport trimis. Echipa admin îl va analiza.", report });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
