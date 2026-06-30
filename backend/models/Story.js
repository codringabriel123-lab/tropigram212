const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  image: { type: String, default: "" },
  video: { type: String, default: "" },
  text: { type: String, default: "", maxlength: 200 }, // story de tip text simplu (fără media)
  background: { type: String, default: "#e91e8c" }, // culoare fundal pt story-uri text
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

// 🕐 Story-urile dispar automat după 24h
storySchema.index({ createdAt: 1 }, { expireAfterSeconds: 60 * 60 * 24 });

module.exports = mongoose.model("Story", storySchema);
