const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 500 },
  date: { type: Date, required: true },
  time: { type: String, required: true, trim: true }, // ex: "20:00"
  location: { type: String, default: "", maxlength: 100 },
  icon: { type: String, default: "🎉" },
  color: { type: String, default: "#e91e8c" },
  entry: {
    type: { type: String, enum: ["gratuit", "platit"], default: "gratuit" },
    price: { type: Number, default: 0 }, // 0 dacă gratuit
    currency: { type: String, default: "$" },
  },
  prizes: [
    {
      place: { type: String, trim: true }, // ex: "Locul 1", "Câștigător"
      reward: { type: String, trim: true }, // ex: "50.000$", "Mașină sportivă"
    }
  ],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
