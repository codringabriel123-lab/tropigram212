const router = require("express").Router();
const Event = require("../models/Event");
const { adminAuth, auth } = require("../middleware/auth");

// Toate evenimentele (oricine autentificat)
router.get("/", auth, async (req, res) => {
  try {
    const events = await Event.find()
      .sort({ date: 1 })
      .populate("createdBy", "username displayName avatar")
      .populate("participants.user", "username displayName avatar");
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
      participants: [],
      createdBy: req.user._id,
    });
    await event.populate("createdBy", "username displayName avatar");
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ message: "Eroare la creare eveniment" });
  }
});

// Înregistrare la eveniment (orice utilizator)
// - gratuit => status "approved" automat
// - platit  => status "pending" (necesită aprobare admin)
router.post("/:id/join", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Eveniment negăsit" });

    const already = event.participants.find(p => p.user.toString() === req.user._id.toString());
    if (already) return res.status(400).json({ message: "Ești deja înscris" });

    const status = event.entry.type === "gratuit" ? "approved" : "pending";
    event.participants.push({ user: req.user._id, status });
    await event.save();
    await event.populate("participants.user", "username displayName avatar");

    res.json({ message: status === "approved" ? "Înscris cu succes!" : "Cerere trimisă, în așteptarea aprobării.", participants: event.participants });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Retragere din eveniment
router.delete("/:id/join", auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Eveniment negăsit" });

    event.participants = event.participants.filter(p => p.user.toString() !== req.user._id.toString());
    await event.save();
    await event.populate("participants.user", "username displayName avatar");

    res.json({ message: "Te-ai retras din eveniment.", participants: event.participants });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Admin: aprobă un participant (doar pentru evenimente plătite)
router.patch("/:id/participants/:userId/approve", adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Eveniment negăsit" });

    const participant = event.participants.find(p => p.user.toString() === req.params.userId);
    if (!participant) return res.status(404).json({ message: "Participant negăsit" });

    participant.status = "approved";
    await event.save();
    await event.populate("participants.user", "username displayName avatar");

    res.json({ message: "Participant aprobat.", participants: event.participants });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Admin: respinge un participant
router.patch("/:id/participants/:userId/reject", adminAuth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    if (!event) return res.status(404).json({ message: "Eveniment negăsit" });

    const participant = event.participants.find(p => p.user.toString() === req.params.userId);
    if (!participant) return res.status(404).json({ message: "Participant negăsit" });

    participant.status = "rejected";
    await event.save();
    await event.populate("participants.user", "username displayName avatar");

    res.json({ message: "Participant respins.", participants: event.participants });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
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
