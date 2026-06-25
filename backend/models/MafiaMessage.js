const mongoose = require("mongoose");

// Chat de grup dedicat mafiei — toate mesajele sunt într-o singură cameră globală
const mafiaMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, trim: true, maxlength: 1000 },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("MafiaMessage", mafiaMessageSchema);
