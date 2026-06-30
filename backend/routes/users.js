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
    // 🟢 Flag relativ la viewer-ul curent — e userul ăsta în lista mea de close friends?
    obj.isCloseFriend = req.user.closeFriends?.map(id => id.toString()).includes(user._id.toString()) || false;
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

// Adaugă / elimină din Close Friends (lista mea privată)
router.put("/:id/close-friend", auth, async (req, res) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(400).json({ message: "Nu te poți adăuga pe tine" });
    const target = await User.findById(req.params.id);
    if (!target) return res.status(404).json({ message: "User negăsit" });
    const isClose = req.user.closeFriends.map(id => id.toString()).includes(target._id.toString());

    if (isClose) {
      await User.findByIdAndUpdate(req.user._id, { $pull: { closeFriends: target._id } });
    } else {
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { closeFriends: target._id } });
    }
    res.json({ closeFriend: !isClose });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Update profil (cu avatar si banner optional)
router.put("/me/update", auth, async (req, res) => {
  try {
    const { displayName, bio, location, role, avatarBase64, bannerBase64 } = req.body;
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

    // 🖼️ Upload banner pe Cloudinary dacă e trimis
    if (bannerBase64) {
      const bannerResult = await cloudinary.uploader.upload(bannerBase64, {
        folder: "tropical-rp/banners",
        transformation: [
          { width: 1200, height: 400, crop: "fill" },
          { quality: "auto" },
          { fetch_format: "auto" },
        ],
      });
      update.banner = bannerResult.secure_url;
    }

    const user = await User.findByIdAndUpdate(req.user._id, update, { new: true }).select("-password");
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare" });
  }
});

// 🟢 Update lastSeen (apelat periodic din frontend)
router.post("/me/ping", auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, { lastSeen: new Date() });
    res.json({ ok: true });
  } catch {
    res.status(500).json({ message: "Eroare" });
  }
});

// 🏆 Leaderboard — top useri după postări, like-uri primite, urmăritori
router.get("/leaderboard/all", auth, async (req, res) => {
  try {
    const Post = require("../models/Post");

    // Top urmăritori — direct din User
    const byFollowers = await User.find({ isBanned: false })
      .select("username displayName avatar role customRole followers")
      .populate("customRole")
      .lean();

    // Număr postări per user
    const postCounts = await Post.aggregate([
      { $match: { isDeleted: false, repostOf: { $exists: false } } },
      { $group: { _id: "$author", count: { $sum: 1 } } },
    ]);
    const postMap = {};
    postCounts.forEach(p => { postMap[p._id.toString()] = p.count; });

    // Like-uri primite per user (suma likes pe toate postările)
    const likeCounts = await Post.aggregate([
      { $match: { isDeleted: false } },
      { $group: { _id: "$author", likes: { $sum: { $size: "$likes" } } } },
    ]);
    const likeMap = {};
    likeCounts.forEach(l => { likeMap[l._id.toString()] = l.likes; });

    const viewer = await User.findById(req.user._id).populate("customRole");
    const viewerCanSeeMafia = viewer?.isAdmin || viewer?.customRole?.isMafia;

    const enriched = byFollowers.map(u => {
      const id = u._id.toString();
      if (!viewerCanSeeMafia && u.customRole?.isMafia) {
        u.role = "Civil"; u.customRole = null;
      }
      return {
        _id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        role: u.role,
        customRole: u.customRole,
        followerCount: u.followers?.length || 0,
        postCount: postMap[id] || 0,
        likeCount: likeMap[id] || 0,
      };
    });

    const topFollowers = [...enriched].sort((a, b) => b.followerCount - a.followerCount).slice(0, 20);
    const topPosts = [...enriched].sort((a, b) => b.postCount - a.postCount).slice(0, 20);
    const topLikes = [...enriched].sort((a, b) => b.likeCount - a.likeCount).slice(0, 20);
    const topOverall = [...enriched]
      .map(u => ({ ...u, score: u.followerCount * 2 + u.postCount * 3 + u.likeCount }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 20);

    res.json({ topFollowers, topPosts, topLikes, topOverall });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare leaderboard" });
  }
});

module.exports = router;
