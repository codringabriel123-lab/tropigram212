const mongoose = require("mongoose");

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  joinedAt: { type: Date, default: Date.now },
});

const eventSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 80 },
  description: { type: String, default: "", maxlength: 500 },
  date: { type: Date, required: true },
  time: { type: String, required: true, trim: true },
  location: { type: String, default: "", maxlength: 100 },
  icon: { type: String, default: "🎉" },
  color: { type: String, default: "#e91e8c" },
  entry: {
    type: { type: String, enum: ["gratuit", "platit"], default: "gratuit" },
    price: { type: Number, default: 0 },
    currency: { type: String, default: "$" },
  },
  prizes: [
    {
      place: { type: String, trim: true },
      reward: { type: String, trim: true },
    }
  ],
  participants: [participantSchema],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  createdAt: { type: Date, default: Date.now },
});

eventSchema.index({ date: 1 });

module.exports = mongoose.model("Event", eventSchema);
