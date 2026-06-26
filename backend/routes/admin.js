const router = require("express").Router();
const User = require("../models/User");
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const CustomRole = require("../models/CustomRole");
const Report = require("../models/Report");
const Message = require("../models/Message");
const Conversation = require("../models/Conversation");
const bcrypt = require("bcryptjs");
const { adminAuth } = require("../middleware/auth");

// ── Constante ──────────────────────────────────────────────
const DURATIONS = {
  "1h": 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
  "7zile": 7 * 24 * 60 * 60 * 1000,
  permanent: null,
};

function computeExpiry(duration) {
  if (!(duration in DURATIONS)) return undefined;
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

// ── Auto-unban / auto-unmute (rulat la fiecare request admin) ──
async function processExpiredSanctions() {
  const now = new Date();
  await User.updateMany(
    { isBanned: true, banExpiresAt: { $lte: now, $ne: null } },
    { isBanned: false, banReason: "", bannedAt: null, bannedBy: null, banExpiresAt: null }
  );
  await User.updateMany(
    { isMuted: true, muteExpiresAt: { $lte: now, $ne: null } },
    { isMuted: false, muteReason: "", mutedAt: null, mutedBy: null, muteExpiresAt: null }
  );
}

// ── Dashboard stats ────────────────────────────────────────
router.get("/stats", adminAuth, async (req, res) => {
  try {
    await processExpiredSanctions();

    // Înregistrări pe zi — ultimele 14 zile
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 13);
    fourteenDaysAgo.setHours(0, 0, 0, 0);

    const [totalUsers, totalPosts, bannedUsers, mutedUsers, pendingReports, recentUsers, recentPosts, regByDay] = await Promise.all([
      User.countDocuments(),
      Post.countDocuments({ isDeleted: false }),
      User.countDocuments({ isBanned: true }),
      User.countDocuments({ isMuted: true }),
      Report.countDocuments({ status: "pending" }),
      User.find().sort({ createdAt: -1 }).limit(5).select("-password"),
      Post.find({ isDeleted: false }).sort({ createdAt: -1 }).limit(5).populate("author", "username displayName avatar"),
      User.aggregate([
        { $match: { createdAt: { $gte: fourteenDaysAgo } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ]);

    res.json({ totalUsers, totalPosts, bannedUsers, mutedUsers, pendingReports, recentUsers, recentPosts, regByDay });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Toți userii ────────────────────────────────────────────
router.get("/users", adminAuth, async (req, res) => {
  try {
    await processExpiredSanctions();
    const { page = 1, limit = 30, search = "", sortBy = "createdAt", filterIp = "" } = req.query;

    let query = {};
    if (search) {
      query.$or = [
        { username: { $regex: search, $options: "i" } },
        { displayName: { $regex: search, $options: "i" } },
      ];
    }
    if (filterIp) {
      query.$or = [{ lastIp: filterIp }, { registrationIp: filterIp }];
    }

    const sortMap = {
      createdAt: { createdAt: -1 },
      lastSeen: { lastSeen: -1 },
      username: { username: 1 },
    };
    const sort = sortMap[sortBy] || { createdAt: -1 };

    const users = await User.find(query).select("-password").sort(sort)
      .skip((page - 1) * limit).limit(Number(limit));
    const total = await User.countDocuments(query);

    // Detectează IP-uri duplicate (potențiale conturi fake)
    const allIps = users.map(u => u.lastIp || u.registrationIp).filter(Boolean);
    const ipCounts = {};
    allIps.forEach(ip => { ipCounts[ip] = (ipCounts[ip] || 0) + 1; });
    const duplicateIps = Object.keys(ipCounts).filter(ip => ipCounts[ip] > 1);

    res.json({ users, total, duplicateIps });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Conturi cu același IP ──────────────────────────────────
router.get("/users/by-ip/:ip", adminAuth, async (req, res) => {
  try {
    const ip = decodeURIComponent(req.params.ip);
    const users = await User.find({
      $or: [{ lastIp: ip }, { registrationIp: ip }],
    }).select("-password").sort({ createdAt: -1 });
    res.json({ users, ip });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Ban user ───────────────────────────────────────────────
router.put("/users/:id/ban", adminAuth, async (req, res) => {
  try {
    const { reason, duration = "permanent" } = req.body;
    const expiresAt = computeExpiry(duration);
    if (expiresAt === undefined)
      return res.status(400).json({ message: "Durată ban invalidă. Folosește: 1h, 24h, 7zile sau permanent" });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user.isAdmin) return res.status(403).json({ message: "Nu poți bana un admin" });
    user.isBanned = true;
    user.banReason = reason || "Motiv nespecificat";
    user.bannedAt = new Date();
    user.bannedBy = req.user._id;
    user.banExpiresAt = expiresAt;
    await user.save();
    await logAction({ adminId: req.user._id, action: "ban", targetUser: user._id, reason: user.banReason, details: `ban ${duration}` });
    res.json({ message: `${user.username} a fost banat (${duration})`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Unban user ─────────────────────────────────────────────
router.put("/users/:id/unban", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isBanned: false, banReason: "", bannedAt: null, bannedBy: null, banExpiresAt: null },
      { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User negăsit" });
    await logAction({ adminId: req.user._id, action: "unban", targetUser: user._id });
    res.json({ message: `${user.username} a fost debanat`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Mute user ──────────────────────────────────────────────
router.put("/users/:id/mute", adminAuth, async (req, res) => {
  try {
    const { reason, duration = "permanent" } = req.body;
    const expiresAt = computeExpiry(duration);
    if (expiresAt === undefined)
      return res.status(400).json({ message: "Durată mute invalidă." });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user.isAdmin) return res.status(403).json({ message: "Nu poți pune mute unui admin" });
    user.isMuted = true;
    user.muteReason = reason || "Motiv nespecificat";
    user.mutedAt = new Date();
    user.mutedBy = req.user._id;
    user.muteExpiresAt = expiresAt;
    await user.save();
    await logAction({ adminId: req.user._id, action: "mute", targetUser: user._id, reason: user.muteReason, details: `mute ${duration}` });
    res.json({ message: `${user.username} a fost pus pe mute (${duration})`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Unmute user ────────────────────────────────────────────
router.put("/users/:id/unmute", adminAuth, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isMuted: false, muteReason: "", mutedAt: null, mutedBy: null, muteExpiresAt: null },
      { new: true }).select("-password");
    if (!user) return res.status(404).json({ message: "User negăsit" });
    await logAction({ adminId: req.user._id, action: "unmute", targetUser: user._id });
    res.json({ message: `${user.username} a fost scos de pe mute`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Toggle admin ───────────────────────────────────────────
router.put("/users/:id/toggle-admin", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user._id.toString() === req.user._id.toString())
      return res.status(400).json({ message: "Nu îți poți modifica propriul rol de admin" });
    user.isAdmin = !user.isAdmin;
    await user.save();
    await logAction({ adminId: req.user._id, action: "toggle-admin", targetUser: user._id, details: user.isAdmin ? "promovat admin" : "retrogradat din admin" });
    res.json({ message: `${user.username} este acum ${user.isAdmin ? "admin" : "user normal"}` });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Toggle verify ──────────────────────────────────────────
router.put("/users/:id/toggle-verify", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    user.isVerified = !user.isVerified;
    await user.save();
    await logAction({ adminId: req.user._id, action: user.isVerified ? "verify" : "unverify", targetUser: user._id });
    res.json({ message: `${user.username} ${user.isVerified ? "verificat ✓" : "neverificat"}`, user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Editare profil forțată ─────────────────────────────────
router.put("/users/:id/edit-profile", adminAuth, async (req, res) => {
  try {
    const { displayName, bio, location } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    const changes = [];
    if (displayName !== undefined && displayName.trim()) { user.displayName = displayName.trim(); changes.push("displayName"); }
    if (bio !== undefined) { user.bio = bio.trim(); changes.push("bio"); }
    if (location !== undefined) { user.location = location.trim(); changes.push("location"); }
    await user.save();
    await logAction({ adminId: req.user._id, action: "edit-profile", targetUser: user._id, details: `Câmpuri modificate: ${changes.join(", ")}` });
    res.json({ message: "Profil actualizat", user });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Reset parolă ───────────────────────────────────────────
router.post("/users/:id/reset-password", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let tempPassword = "";
    for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];
    user.password = await bcrypt.hash(tempPassword, 12);
    await user.save();
    await logAction({ adminId: req.user._id, action: "reset-password", targetUser: user._id, details: `Parolă resetată pentru ${user.username}` });
    res.json({ message: "Parolă resetată", tempPassword, username: user.username });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Șterge cont ────────────────────────────────────────────
router.delete("/users/:id", adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (user.isAdmin) return res.status(403).json({ message: "Nu poți șterge un admin" });
    if (user._id.toString() === req.user._id.toString())
      return res.status(403).json({ message: "Nu îți poți șterge propriul cont" });

    await Post.deleteMany({ author: user._id });
    await Notification.deleteMany({ $or: [{ recipient: user._id }, { sender: user._id }] });
    await Message.deleteMany({ sender: user._id });
    await User.updateMany({ followers: user._id }, { $pull: { followers: user._id } });
    await User.updateMany({ following: user._id }, { $pull: { following: user._id } });
    await Conversation.deleteMany({ participants: user._id });
    await Report.deleteMany({ $or: [{ reporter: user._id }, { targetUser: user._id }] });

    await logAction({ adminId: req.user._id, action: "delete-user", targetUser: user._id, details: `Cont @${user.username} șters permanent` });
    await User.findByIdAndDelete(user._id);
    res.json({ message: `Contul @${user.username} a fost șters permanent` });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la ștergere" });
  }
});

// ── Atribuie rol ───────────────────────────────────────────
router.put("/users/:id/role", adminAuth, async (req, res) => {
  try {
    const { customRoleId, standardRole } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User negăsit" });
    if (customRoleId) {
      const role = await CustomRole.findById(customRoleId);
      if (!role) return res.status(404).json({ message: "Rol negăsit" });
      user.customRole = role._id; user.role = role.name;
      await user.save();
      await logAction({ adminId: req.user._id, action: "assign-role", targetUser: user._id, details: `Rol atribuit: ${role.name}` });
    } else if (standardRole) {
      user.customRole = null; user.role = standardRole;
      await user.save();
      await logAction({ adminId: req.user._id, action: "assign-role", targetUser: user._id, details: `Rol standard: ${standardRole}` });
    } else {
      return res.status(400).json({ message: "Trimite customRoleId sau standardRole" });
    }
    await user.populate("customRole");
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Postări (admin) ────────────────────────────────────────
router.get("/posts", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 30, includeDeleted = "false" } = req.query;
    const query = includeDeleted === "true" ? {} : { isDeleted: false };
    const posts = await Post.find(query).sort({ createdAt: -1 })
      .skip((page - 1) * limit).limit(Number(limit))
      .populate("author", "username displayName avatar")
      .populate("deletedBy", "username");
    const total = await Post.countDocuments(query);
    res.json({ posts, total });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

router.delete("/posts/:id", adminAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Postare negăsită" });
    post.isDeleted = true; post.deletedBy = req.user._id; post.deletedAt = new Date();
    await post.save();
    await logAction({ adminId: req.user._id, action: "delete-post", targetPost: post._id, targetUser: post.author });
    res.json({ message: "Postare ștearsă de admin" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

router.put("/posts/:id/restore", adminAuth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(req.params.id,
      { isDeleted: false, deletedBy: null, deletedAt: null }, { new: true })
      .populate("author", "username displayName avatar");
    if (!post) return res.status(404).json({ message: "Postare negăsită" });
    await logAction({ adminId: req.user._id, action: "restore-post", targetPost: post._id, targetUser: post.author?._id });
    res.json({ message: "Postare restaurată", post });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Audit log ──────────────────────────────────────────────
router.get("/audit-log", adminAuth, async (req, res) => {
  try {
    const { page = 1, limit = 50, action = "", adminId = "" } = req.query;
    const query = {};
    if (action) query.action = action;
    if (adminId) query.admin = adminId;
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(Number(limit))
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

// ── Roluri custom ──────────────────────────────────────────
router.get("/roles", adminAuth, async (req, res) => {
  try {
    const roles = await CustomRole.find().sort({ createdAt: -1 }).populate("createdBy", "username");
    res.json(roles);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

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

router.delete("/roles/:id", adminAuth, async (req, res) => {
  try {
    const role = await CustomRole.findById(req.params.id);
    if (!role) return res.status(404).json({ message: "Rol negăsit" });
    await User.updateMany({ customRole: role._id }, { customRole: null });
    await role.deleteOne();
    await logAction({ adminId: req.user._id, action: "delete-role", details: `Rol șters: ${role.name}` });
    res.json({ message: "Rol șters" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Broadcast (notificare la toți userii) ─────────────────
router.post("/broadcast", adminAuth, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message?.trim()) return res.status(400).json({ message: "Mesajul e obligatoriu" });
    const users = await User.find({ isAdmin: false }).select("_id");
    const notifications = users.map(u => ({
      recipient: u._id,
      sender: req.user._id,
      type: "broadcast",
      message: message.trim(),
    }));
    // Salvăm în Notification cu un tip special — adaptăm schema mai jos
    await Notification.insertMany(notifications);
    await logAction({ adminId: req.user._id, action: "broadcast", details: `Mesaj broadcast: "${message.trim().slice(0, 80)}"` });
    res.json({ message: `Broadcast trimis la ${users.length} useri` });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Export users CSV ───────────────────────────────────────
router.get("/users/export-csv", adminAuth, async (req, res) => {
  try {
    const users = await User.find().select("-password").sort({ createdAt: -1 });
    const header = "username,displayName,role,isAdmin,isVerified,isBanned,banReason,registrationIp,lastIp,createdAt,lastSeen\n";
    const rows = users.map(u => [
      u.username,
      `"${(u.displayName || "").replace(/"/g, '""')}"`,
      u.role,
      u.isAdmin,
      u.isVerified,
      u.isBanned,
      `"${(u.banReason || "").replace(/"/g, '""')}"`,
      u.registrationIp || "",
      u.lastIp || "",
      u.createdAt ? u.createdAt.toISOString() : "",
      u.lastSeen ? u.lastSeen.toISOString() : "",
    ].join(",")).join("\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="users_${Date.now()}.csv"`);
    res.send("\uFEFF" + header + rows); // BOM pentru Excel
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// ── Rapoarte ───────────────────────────────────────────────
router.get("/reports", adminAuth, async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 30 } = req.query;
    const query = status === "all" ? {} : { status };
    const [reports, total] = await Promise.all([
      Report.find(query).sort({ createdAt: -1 })
        .skip((page - 1) * limit).limit(Number(limit))
        .populate("reporter", "username displayName avatar")
        .populate("targetUser", "username displayName avatar isBanned")
        .populate("targetPost", "content author")
        .populate("resolvedBy", "username"),
      Report.countDocuments(query),
    ]);
    res.json({ reports, total });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

router.put("/reports/:id/resolve", adminAuth, async (req, res) => {
  try {
    const { action, note } = req.body; // action: "resolved" | "dismissed"
    const report = await Report.findById(req.params.id);
    if (!report) return res.status(404).json({ message: "Raport negăsit" });
    report.status = action === "dismissed" ? "dismissed" : "resolved";
    report.resolvedBy = req.user._id;
    report.resolvedAt = new Date();
    report.resolveNote = note || "";
    await report.save();
    await logAction({ adminId: req.user._id, action: "resolve-report", details: `Raport ${report._id} ${report.status}` });
    res.json({ message: "Raport actualizat", report });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
