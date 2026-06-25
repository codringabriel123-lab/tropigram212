const router = require("express").Router();
const User = require("../models/User");
const { auth } = require("../middleware/auth");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Caută useri
router.get("/search", auth, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({
      $or: [
        { username: { $regex: q, $options: "i" } },
        { displayName: { $regex: q, $options: "i" } },
      ],
      isBanned: false,
    }).select("-password").populate("customRole").limit(10);

    // Verifică dacă viewer-ul e admin sau mafia
    const viewer = await User.findById(req.user._id).populate("customRole");
    const viewerCanSeeMafia = viewer?.isAdmin || viewer?.customRole?.isMafia;

    const result = users.map(u => {
      const obj = u.toObject();
      if (!viewerCanSeeMafia && obj.customRole?.isMafia) {
        // Maschează rolul — apare ca Civil
        obj.role = "Civil";
        obj.customRole = null;
      }
      return obj;
    });

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Toți membrii
router.get("/", auth, async (req, res) => {
  try {
    const users = await User.find({ isBanned: false }).select("-password").populate("customRole").sort({ createdAt: -1 });
    const viewer = await User.findById(req.user._id).populate("customRole");
    const viewerCanSeeMafia = viewer?.isAdmin || viewer?.customRole?.isMafia;

    const result = users.map(u => {
      const obj = u.toObject();
      if (!viewerCanSeeMafia && obj.customRole?.isMafia) {
        obj.role = "Civil";
        obj.customRole = null;
      }
      return obj;
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Profil user
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password")
      .populate("followers", "username displayName avatar")
      .populate("following", "username displayName avatar")
      .populate("customRole");
    if (!user) return res.status(404).json({ message: "User negăsit" });

    const viewer = await User.findById(req.user._id).populate("customRole");
    const viewerCanSeeMafia = viewer?.isAdmin || viewer?.customRole?.isMafia;

    const obj = user.toObject();
    if (!viewerCanSeeMafia && obj.customRole?.isMafia) {
      obj.role = "Civil";
      obj.customRole = null;
    }
    res.json(obj);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Follow / unfollow
router.put("/:id/follow", auth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Nu te poți urmări pe tine" });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User negăsit" });
    const isFollowing = req.user.following.map(id => id.toString()).includes(target._id.toString());

    if (isFollowing) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { following: target._id } });
      await User.findByIdAndUpdate(target._id, { $pull: { followers: req.user._id } });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { following: target._id } });
      await User.findByIdAndUpdate(target._id, { $addToSet: { followers: req.user._id } });
      const Notification = require("../models/Notification");
      await Notification.create({ recipient: target._id, sender: req.user._id, type: "follow" });
    }
    res.json({ following: !isFollowing });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Update profil (cu avatar opțional)
router.put("/me/update", auth, async (req, res) => {
  try {
    const { displayName, bio, location, role, avatarBase64 } = req.body;
    const allowed = ["Civil", "Politie", "Mecanic", "Pompier", "Medic"];
    const update = {};
    if (displayName) update.displayName = displayName;
    if (bio !== undefined) update.bio = bio;
    if (location !== undefined) update.location = location;
    if (role && allowed.includes(role)) update.role = role;

    // Upload avatar pe Cloudinary dacă e trimis
    if (avatarBase64) {
      const result = await cloudinary.uploader.upload(avatarBase64, {
        folder: "tropical-rp/avatars",
        transformation: [
          { width: 300, height: 300, crop: "fill", gravity: "face" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      });
      update.avatar = result.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
