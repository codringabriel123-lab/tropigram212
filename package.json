const mongoose = require("mongoose");

const auditLogSchema = new mongoose.Schema({
  admin: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  action: {
    type: String,
    required: true,
    enum: [
      "ban", "unban", "mute", "unmute",
      "toggle-admin", "delete-post", "restore-post", "delete-comment",
      "verify", "unverify",
    ],
  },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  targetPost: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  reason: { type: String, default: "" },
  details: { type: String, default: "" }, // ex: "ban 24h", "mute permanent"
  createdAt: { type: Date, default: Date.now },
});

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model("AuditLog", auditLogSchema);
