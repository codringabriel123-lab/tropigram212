const router = require("express").Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const { adminAuth } = require("../middleware/auth");

// Dashboard stats
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalPosts, bannedUsers, recentUsers, recentPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ isDeleted: false }),
      User.countDocuments({ isBanned: true }),
      User.find().sort({ createdAt: -1 }).limit(5).select("-password"),
      Post.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).populate("author", "username displayName avatar"),
    ]);
    res.json({ totalUsers, totalPosts, bannedUsers, recentUsers, recentPosts });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Toți userii (admin)
router.get("/users", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 30, search = "" } = req.query;
    const query = search ? {
      $or: [{ username: { $regex: search, $options: "i" } }, { displayName: { $regex: search, $options: "i" } }]
    } : {};
    const users = await User.find(query).select("-password")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));
    const total = await User.countDocuments(query);
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Ban user
router.put("/users/:id/ban", adminAuth, async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user.isAdmin) return res.status(403).json({ message: "Nu poți bana un admin" });
    user.isBanned = true;
    user.banReason = reason || "Motiv nespecificat";
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    await user.save();
    res.json({ message: `${user.username} a fost banat` });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Unban user
router.put("/users/:id/unban", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isBanned: false, banReason: "", bannedAt: null, bannedBy: null
    }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User negăsit" });
    res.json({ message: `${user.username} a fost debanat`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Toggle admin
router.put("/users/:id/toggle-admin", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Nu îți poți modifica propriul rol de admin" });
    user.isAdmin = !user.isAdmin;
    await user.save();
    res.json({ message: `${user.username} este acum ${user.isAdmin ? "admin" : "user normal"}` });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Toate postările (admin)
router.get("/posts", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 30, includeDeleted = "false" } = req.query;
    const query = includeDeleted === "true" ? {} : { isDeleted: false };
    const posts = await Post.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("author", "username displayName avatar")
      .populate("deletedBy", "username");
    const total = await Post.countDocuments(query);
    res.json({ posts, total });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Șterge postare (admin)
router.delete("/posts/:id", adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Postare negăsită" });
    post.isDeleted = true;
    post.deletedBy = req.user._id;
    post.deletedAt = new Date();
    await post.save();
    res.json({ message: "Postare ștearsă de admin" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Restaurează postare
router.put("/posts/:id/restore", adminAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id,
      { isDeleted: false, deletedBy: null, deletedAt: null }, { new: true }
    ).populate("author", "username displayName avatar");
    if (!post) return res.status(404).json({ message: "Postare negăsită" });
    res.json({ message: "Postare restaurată", post });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
