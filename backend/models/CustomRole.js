const mongoose = require("mongoose");

const customRoleSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true, maxlength: 30 },
  color: { type: String, required: true, default: "#888888" }, // hex color
  isMafia: { type: Boolean, default: false }, // rol secret — apare ca Civil pt politie/civili
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("CustomRole", customRoleSchema);
