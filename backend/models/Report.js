const mongoose = require("mongoose");

const reportSchema = new mongoose.Schema({
  reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  targetUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  targetPost: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
  type: { type: String, enum: ["user", "post"], required: true },
  reason: { type: String, required: true, maxlength: 300 },
  status: { type: String, enum: ["pending", "resolved", "dismissed"], default: "pending" },
  resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  resolvedAt: { type: Date },
  resolveNote: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Report", reportSchema);
