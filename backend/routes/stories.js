const router = require("express").Router();
const Story = require("../models/Story");
const User = require("../models/User");
const { auth, muteCheck } = require("../middleware/auth");

// Creează un story nou (imagine, video sau text)
router.post("/", auth, muteCheck, async (req, res) => {
  try {
    const { image, video, text, background } = req.body;
    if (!image && !video && !text?.trim()) {
      return res.status(400).json({ message: "Adaugă o imagine, un video sau un text" });
    }
    const story = await Story.create({
      author: req.user._id,
      image: image || "",
      video: video || "",
      text: text?.trim().slice(0, 200) || "",
      background: background || "#e91e8c",
    });
    await story.populate("author", "username displayName avatar isVerified");
    res.status(201).json(story);
  } catch (err) {
    res.status(500).json({ message: "Eroare la postarea story-ului" });
  }
});

// Story-uri active (ultimele 24h) ale userilor urmăriți + ale mele, grupate pe autor
router.get("/", auth, async (req, res) => {
  try {
    const following = [...req.user.following, req.user._id];
    const stories = await Story.find({ author: { $in: following } })
      .sort({ createdAt: 1 })
      .populate("author", "username displayName avatar isVerified");

    const grouped = {};
    for (const s of stories) {
      const aid = s.author._id.toString();
      if (!grouped[aid]) grouped[aid] = { author: s.author, stories: [] };
      grouped[aid].stories.push(s);
    }

    // Userul curent primul, restul sortați după cel mai recent story nevăzut
    const myId = req.user._id.toString();
    const groups = Object.values(grouped).sort((a, b) => {
      if (a.author._id.toString() === myId) return -1;
      if (b.author._id.toString() === myId) return 1;
      const aUnseen = a.stories.some(s => !s.viewers.map(v => v.toString()).includes(myId));
      const bUnseen = b.stories.some(s => !s.viewers.map(v => v.toString()).includes(myId));
      if (aUnseen !== bUnseen) return aUnseen ? -1 : 1;
      return new Date(b.stories[b.stories.length - 1].createdAt) - new Date(a.stories[a.stories.length - 1].createdAt);
    });

    res.json(groups);
  } catch (err) {
    res.status(500).json({ message: "Eroare la încărcarea story-urilor" });
  }
});

// Story-urile unui anumit user (pt. a le revedea direct de pe profil)
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const stories = await Story.find({ author: req.params.userId })
      .sort({ createdAt: 1 })
      .populate("author", "username displayName avatar isVerified");
    res.json(stories);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Marchează un story ca văzut
router.put("/:id/view", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story negăsit" });
    if (!story.viewers.map(v => v.toString()).includes(req.user._id.toString())) {
      story.viewers.push(req.user._id);
      await story.save();
    }
    res.json({ message: "ok" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Like / unlike un story (toggle)
router.put("/:id/like", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story negăsit" });
    const uid = req.user._id.toString();
    const liked = story.likes.map(v => v.toString()).includes(uid);
    if (liked) {
      story.likes = story.likes.filter(v => v.toString() !== uid);
    } else {
      story.likes.push(req.user._id);
      if (story.author.toString() !== uid) {
        const Notification = require("../models/Notification");
        await Notification.create({ recipient: story.author, sender: req.user._id, type: "like", story: story._id }).catch(() => {});
      }
    }
    await story.save();
    res.json({ liked: !liked, likesCount: story.likes.length });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Lista celor care au dat like la un story (doar autorul îl poate vedea)
router.get("/:id/likes", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate("likes", "username displayName avatar isVerified");
    if (!story) return res.status(404).json({ message: "Story negăsit" });
    if (story.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    res.json(story.likes);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Lista celor care au văzut un story (doar autorul îl poate vedea)
router.get("/:id/viewers", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id).populate("viewers", "username displayName avatar isVerified");
    if (!story) return res.status(404).json({ message: "Story negăsit" });
    if (story.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    res.json(story.viewers);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Șterge un story
router.delete("/:id", auth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) return res.status(404).json({ message: "Story negăsit" });
    if (story.author.toString() !== req.user._id.toString() && !req.user.isAdmin) {
      return res.status(403).json({ message: "Acces interzis" });
    }
    await story.deleteOne();
    res.json({ message: "Story șters" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
