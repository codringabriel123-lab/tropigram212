const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, default: "", maxlength: 1000 },
  // 📎 Imagine trimisă în DM (URL Cloudinary)
  image: { type: String, default: "" },
  // ↩️ Reply la un mesaj specific — ține o referință + un mic "ecou" pentru afișare rapidă
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
  read: { type: Boolean, default: false },
  seenAt: { type: Date, default: null },
  isDeleted: { type: Boolean, default: false }, // 🗑️ Ștergere mesaj
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Message", messageSchema);
