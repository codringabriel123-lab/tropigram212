const router = require("express").Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const CustomRole = require("../models/CustomRole");
const { adminAuth } = require("../middleware/auth");

// Durate presetate pentru ban/mute (în milisecunde). "permanent" => null (fără expirare)
const DURATIONS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7zile": 7 * 24 * 60 * 60 * 1000,
  permanent: null,
};

function computeExpiry(duration) {
  if (!(duration in DURATIONS)) return undefined; // durată invalidă
  const ms = DURATIONS[duration];
  return ms === null ? null : new Date(Date.now() + ms);
}

async function logAction({ adminId, action, targetUser, targetPost, reason, details }) {
  try {
    await AuditLog.create({ admin: adminId, action, targetUser, targetPost, reason, details });
  } catch (err) {
    console.error("Eroare audit log:", err);
  }
}

// Dashboard stats
router.get("/stats", adminAuth, async (req, res) => {
  try {
    const [totalUsers, totalPosts, bannedUsers, mutedUsers, recentUsers, recentPosts] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ isDeleted: false }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isMuted: true }),
      User.find().sort({ createdAt: -1 }).limit(5).select("-password"),
      Post.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).populate("author", "username displayName avatar"),
    ]);
    res.json({ totalUsers, totalPosts, bannedUsers, mutedUsers, recentUsers, recentPosts });
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

// Ban user (temporar presetat sau permanent)
// body: { reason, duration: "1h" | "24h" | "7zile" | "permanent" }
router.put("/users/:id/ban", adminAuth, async (req, res) => {
  try {
    const { reason, duration = "permanent" } = req.body;
    const expiresAt = computeExpiry(duration);
    if (expiresAt === undefined) {
      return res.status(400).json({ message: "Durată ban invalidă. Folosește: 1h, 24h, 7zile sau permanent" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user.isAdmin) return res.status(403).json({ message: "Nu poți bana un admin" });

    user.isBanned = true;
    user.banReason = reason || "Motiv nespecificat";
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banExpiresAt = expiresAt;
    await user.save();

    await logAction({
      adminId: req.user._id,
      action: "ban",
      targetUser: user._id,
      reason: user.banReason,
      details: `ban ${duration}${expiresAt ? ` (expiră la ${expiresAt.toISOString()})` : ""}`,
    });

    res.json({ message: `${user.username} a fost banat (${duration})`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Unban user
router.put("/users/:id/unban", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isBanned: false, banReason: "", bannedAt: null, bannedBy: null, banExpiresAt: null,
    }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User negăsit" });

    await logAction({ adminId: req.user._id, action: "unban", targetUser: user._id });

    res.json({ message: `${user.username} a fost debanat`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Mute user (temporar presetat sau permanent) — poate naviga, nu poate posta/comenta/like
// body: { reason, duration: "1h" | "24h" | "7zile" | "permanent" }
router.put("/users/:id/mute", adminAuth, async (req, res) => {
  try {
    const { reason, duration = "permanent" } = req.body;
    const expiresAt = computeExpiry(duration);
    if (expiresAt === undefined) {
      return res.status(400).json({ message: "Durată mute invalidă. Folosește: 1h, 24h, 7zile sau permanent" });
    }
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user.isAdmin) return res.status(403).json({ message: "Nu poți pune mute unui admin" });

    user.isMuted = true;
    user.muteReason = reason || "Motiv nespecificat";
    user.mutedAt = new Date();
    user.mutedBy = req.user._id;
    user.muteExpiresAt = expiresAt;
    await user.save();

    await logAction({
      adminId: req.user._id,
      action: "mute",
      targetUser: user._id,
      reason: user.muteReason,
      details: `mute ${duration}${expiresAt ? ` (expiră la ${expiresAt.toISOString()})` : ""}`,
    });

    res.json({ message: `${user.username} a fost pus pe mute (${duration})`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Unmute user
router.put("/users/:id/unmute", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, {
      isMuted: false, muteReason: "", mutedAt: null, mutedBy: null, muteExpiresAt: null,
    }, { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User negăsit" });

    await logAction({ adminId: req.user._id, action: "unmute", targetUser: user._id });

    res.json({ message: `${user.username} a fost scos de pe mute`, user });
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

    await logAction({
      adminId: req.user._id,
      action: "toggle-admin",
      targetUser: user._id,
      details: user.isAdmin ? "promovat admin" : "retrogradat din admin",
    });

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

    await logAction({ adminId: req.user._id, action: "delete-post", targetPost: post._id, targetUser: post.author });

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

    await logAction({ adminId: req.user._id, action: "restore-post", targetPost: post._id, targetUser: post.author?._id });

    res.json({ message: "Postare restaurată", post });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Audit log — istoric acțiuni admin (ban/unban/mute/unmute/delete/etc)
router.get("/audit-log", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, action = "", adminId = "" } = req.query;
    const query = {};
    if (action) query.action = action;
    if (adminId) query.admin = adminId;

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(Number(limit))
        .populate("admin", "username displayName avatar")
        .populate("targetUser", "username displayName avatar")
        .populate("targetPost", "content"),
      AuditLog.countDocuments(query),
    ]);

    res.json({ logs, total });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Toggle verified
router.put("/users/:id/toggle-verify", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    user.isVerified = !user.isVerified;
    await user.save();

    await logAction({
      adminId: req.user._id,
      action: user.isVerified ? "verify" : "unverify",
      targetUser: user._id,
      details: user.isVerified ? "cont verificat ✓" : "verificare eliminată",
    });

    res.json({ message: `${user.username} este acum ${user.isVerified ? "verificat ✓" : "neverificat"}`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── ROLURI CUSTOM ──────────────────────────────────────────

// Lista toate rolurile custom
router.get("/roles", adminAuth, async (req, res) => {
  try {
    const roles = await CustomRole.find().sort({ createdAt: -1 }).populate("createdBy", "username");
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Creează rol custom
router.post("/roles", adminAuth, async (req, res) => {
  try {
    const { name, color, isMafia } = req.body;
    if (!name?.trim()) return res.status(400).json({ message: "Numele rolului e obligatoriu" });
    const exists = await CustomRole.findOne({ name: name.trim() });
    if (exists) return res.status(400).json({ message: "Există deja un rol cu acest nume" });
    const role = await CustomRole.create({ name: name.trim(), color: color || "#888888", isMafia: !!isMafia, createdBy: req.user._id });
    await logAction({ adminId: req.user._id, action: "create-role", details: `Rol creat: ${role.name}` });
    res.status(201).json(role);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Editează rol custom (nume + culoare)
router.put("/roles/:id", adminAuth, async (req, res) => {
  try {
    const { name, color, isMafia } = req.body;
    const role = await CustomRole.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Rol negăsit" });
    if (name?.trim()) role.name = name.trim();
    if (color) role.color = color;
    if (typeof isMafia === "boolean") role.isMafia = isMafia;
    await role.save();
    await logAction({ adminId: req.user._id, action: "edit-role", details: `Rol editat: ${role.name}` });
    res.json(role);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Șterge rol custom
router.delete("/roles/:id", adminAuth, async (req, res) => {
  try {
    const role = await CustomRole.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Rol negăsit" });
    // Resetează userii care aveau acest rol custom
    await User.updateMany({ customRole: role._id }, { customRole: null });
    await role.deleteOne();
    await logAction({ adminId: req.user._id, action: "delete-role", details: `Rol șters: ${role.name}` });
    res.json({ message: "Rol șters" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Atribuie rol unui user (customRole sau role standard)
router.put("/users/:id/role", adminAuth, async (req, res) => {
  try {
    const { customRoleId, standardRole } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });

    if (customRoleId) {
      const role = await CustomRole.findById(customRoleId);
      if (!role) return res.status(404).json({ message: "Rol negăsit" });
      user.customRole = role._id;
      user.role = role.name;
      await user.save();
      await logAction({ adminId: req.user._id, action: "assign-role", targetUser: user._id, details: `Rol atribuit: ${role.name}` });
    } else if (standardRole) {
      user.customRole = null;
      user.role = standardRole;
      await user.save();
      await logAction({ adminId: req.user._id, action: "assign-role", targetUser: user._id, details: `Rol standard atribuit: ${standardRole}` });
    } else {
      return res.status(400).json({ message: "Trimite customRoleId sau standardRole" });
    }

    await user.populate("customRole");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Reset parolă user — generează o parolă temporară aleatorie și o returnează adminului
router.post("/users/:id/reset-password", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });

    // Generează parolă temporară de 10 caractere
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    for (let i = 0; i < 10; i++) {
      tempPassword += chars[Math.floor(Math.random() * chars.length)];
    }

    const bcrypt = require("bcryptjs");
    const hash = await bcrypt.hash(tempPassword, 12);
    user.password = hash;
    await user.save();

    await logAction({
      adminId: req.user._id,
      action: "reset-password",
      targetUser: user._id,
      details: `Parolă resetată pentru ${user.username}`,
    });

    res.json({ message: "Parolă resetată", tempPassword, username: user.username });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
