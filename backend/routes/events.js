const router = require("express").Router();
const Event = require("../models/Event");
const { adminAuth, auth } = require("../middleware/auth");

// Toate evenimentele (oricine)
router.get("/", auth, async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ date: 1 })
      .populate("createdBy", "username displayName avatar");
    res.json(events);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Creare eveniment (doar admini)
router.post("/", adminAuth, async (req, res) => {
  try {
    const { title, description, date, time, location, icon, color, entry, prizes } = req.body;
    if (!title || !date || !time) {
      return res.status(400).json({ message: "Titlu, dată și oră sunt obligatorii" });
    }
    const event = await Event.create({
      title, description, date, time, location,
      icon: icon || "🎉",
      color: color || "#e91e8c",
      entry: entry || { type: "gratuit", price: 0, currency: "$" },
      prizes: prizes || [],
      createdBy: req.user._id,
    });
    await event.populate("createdBy", "username displayName avatar");
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: "Eroare la creare eveniment" });
  }
});

// Șterge eveniment (doar admini)
router.delete("/:id", adminAuth, async (req, res) => {
  try {
    const event = await Event.findByIdAndDelete(req.params.id);
    if (!event) return res.status(404).json({ message: "Eveniment negăsit" });
    res.json({ message: "Eveniment șters" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
