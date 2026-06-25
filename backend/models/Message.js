const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, maxlength: 1000 },
  read: { type: Boolean, default: false },
  seenAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false }, // 🗑️ Ștergere mesaj
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
