const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, lowercase: true, trim: true, minlength: 3, maxlength: 30 },
  displayName: { type: String, required: true, trim: true, maxlength: 40 },
  password: { type: String, required: true, minlength: 6 },
  avatar: { type: String, default: "" },
  bio: { type: String, default: "", maxlength: 200 },
  role: { type: String, default: "Civil", maxlength: 30 },
  customRole: { type: mongoose.Schema.Types.ObjectId, ref: "CustomRole", default: null },
  location: { type: String, default: "Los Santos", maxlength: 50 },
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  isAdmin: { type: Boolean, default: false },
  isVerified: { type: Boolean, default: false },
  isBanned: { type: Boolean, default: false },
  banReason: { type: String, default: "" },
  bannedAt: { type: Date },
  bannedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  banExpiresAt: { type: Date, default: null }, // null = ban permanent
  isMuted: { type: Boolean, default: false },
  muteReason: { type: String, default: "" },
  mutedAt: { type: Date },
  mutedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  muteExpiresAt: { type: Date, default: null }, // null = mute permanent
  createdAt: { type: Date, default: Date.now },
  lastSeen: { type: Date, default: Date.now },
});

userSchema.virtual("postCount", {
  ref: "Post",
  localField: "_id",
  foreignField: "author",
  count: true,
});

module.exports = mongoose.model("User", userSchema);
