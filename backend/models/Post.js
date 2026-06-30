const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true, maxlength: 500 },
  // 💬 Reply — dacă e răspuns la alt comentariu, ține legătura cu acela
  replyTo: { type: mongoose.Schema.Types.ObjectId, default: null },
  // 🏷️ Tag-uri — userii menționați cu @username în text
  mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  createdAt: { type: Date, default: Date.now },
});

const postSchema = new mongoose.Schema({
  author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 2000 },
  image: { type: String, default: "" },
  video: { type: String, default: "" }, // URL video Cloudinary
  location: { type: String, default: "", maxlength: 60 },
  song: {
    url: { type: String, default: "" },
    type: { type: String, enum: ["youtube", "spotify", ""], default: "" },
    embedId: { type: String, default: "" },
    title: { type: String, default: "", maxlength: 150 },
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  isDeleted: { type: Boolean, default: false },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  deletedAt: { type: Date },
  // 📣 Repost — dacă postarea e un repost, ține legătura cu originalul
  repostOf: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Post", postSchema);
