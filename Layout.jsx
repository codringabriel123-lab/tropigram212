const router = require("express").Router();
const Post = require("../models/Post");
const Notification = require("../models/Notification");
const SavedPost = require("../models/SavedPost");
const { auth, muteCheck } = require("../middleware/auth");

// Extrage tip + id embed dintr-un link YouTube sau Spotify
function parseSongUrl(url) {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // YouTube: youtu.be/ID, youtube.com/watch?v=ID, youtube.com/shorts/ID, music.youtube.com
  const ytMatch = trimmed.match(
    /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/|music\.youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) {
    return { type: "youtube", embedId: ytMatch[1], url: trimmed };
  }

  // Spotify: open.spotify.com/track/ID sau /intl-xx/track/ID
  const spMatch = trimmed.match(/open\.spotify\.com\/(?:intl-[a-z]{2}\/)?track\/([a-zA-Z0-9]+)/);
  if (spMatch) {
    return { type: "spotify", embedId: spMatch[1], url: trimmed };
  }

  return null;
}

// Adaugă pe fiecare postare (și pe originalul din repostOf) flag-urile
// isSavedByMe / repostedByMe relative la userul curent
async function enrichPosts(posts, userId) {
  const targetIds = new Set();
  posts.forEach(p => {
    targetIds.add(p._id.toString());
    if (p.repostOf) targetIds.add(p.repostOf._id.toString());
  });

  const [savedDocs, repostDocs] = await Promise.all([
    SavedPost.find({ user: userId, post: { $in: [...targetIds] } }).select("post"),
    Post.find({ author: userId, repostOf: { $in: [...targetIds] } }).select("repostOf"),
  ]);
  const savedSet = new Set(savedDocs.map(d => d.post.toString()));
  const repostSet = new Set(repostDocs.map(d => d.repostOf.toString()));

  return posts.map(p => {
    const obj = p.toObject ? p.toObject() : p;
    const targetId = obj.repostOf ? obj.repostOf._id.toString() : obj._id.toString();
    if (obj.repostOf) {
      obj.repostOf.isSavedByMe = savedSet.has(targetId);
      obj.repostOf.repostedByMe = repostSet.has(targetId);
    } else {
      obj.isSavedByMe = savedSet.has(targetId);
      obj.repostedByMe = repostSet.has(targetId);
    }
    return obj;
  });
}

// Feed - postări de la userii urmăriți + proprii
router.get("/feed", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const following = [...req.user.following, req.user._id];
    const posts = await Post.find({ author: { $in: following }, isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("author", "username displayName avatar role location customRole")
      .populate("comments.author", "username displayName avatar")
      .populate({
        path: "repostOf",
        populate: [
          { path: "author", select: "username displayName avatar role location customRole" },
          { path: "comments.author", select: "username displayName avatar" },
        ],
      });
    res.json(await enrichPosts(posts, req.user._id));
  } catch (err) {
    res.status(500).json({ message: "Eroare la încărcarea feed-ului" });
  }
});

// Toate postările (explore)
router.get("/explore", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const posts = await Post.find({ isDeleted: false })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate("author", "username displayName avatar role location customRole")
      .populate("comments.author", "username displayName avatar")
      .populate({
        path: "repostOf",
        populate: [
          { path: "author", select: "username displayName avatar role location customRole" },
          { path: "comments.author", select: "username displayName avatar" },
        ],
      });
    res.json(await enrichPosts(posts, req.user._id));
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Postările unui user
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId, isDeleted: false })
      .sort({ createdAt: -1 })
      .populate("author", "username displayName avatar role customRole")
      .populate("comments.author", "username displayName avatar")
      .populate({
        path: "repostOf",
        populate: [
          { path: "author", select: "username displayName avatar role location customRole" },
          { path: "comments.author", select: "username displayName avatar" },
        ],
      });
    res.json(await enrichPosts(posts, req.user._id));
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Creare postare
router.post("/", auth, muteCheck, async (req, res) => {
  try {
    const { content, image, location, songUrl, songTitle } = req.body;
    if (!content?.trim()) return res.status(400).json({ message: "Conținutul este obligatoriu" });

    let song = undefined;
    if (songUrl?.trim()) {
      const parsed = parseSongUrl(songUrl);
      if (!parsed) {
        return res.status(400).json({ message: "Link de melodie invalid. Folosește un link YouTube sau Spotify." });
      }
      song = { ...parsed, title: songTitle?.trim().slice(0, 150) || "" };
    }

    const post = new Post({
      author: req.user._id,
      content: content.trim(),
      image: image || "",
      location: location || "",
      ...(song ? { song } : {}),
    });
    await post.save();
    await post.populate("author", "username displayName avatar role location customRole");
    res.status(201).json(post);
  } catch (err) {
    res.status(500).json({ message: "Eroare la postare" });
  }
});

// 📣 Repost — redistribuie o postare existentă pe profilul/feedul propriu
router.post("/:id/repost", auth, muteCheck, async (req, res) => {
  try {
    const original = await Post.findById(req.params.id);
    if (!original || original.isDeleted) return res.status(404).json({ message: "Postare negăsită" });

    // Nu permite repost la un repost — întotdeauna leagă către postarea originală
    const targetId = original.repostOf ? original.repostOf : original._id;

    const existing = await Post.findOne({ author: req.user._id, repostOf: targetId });
    if (existing) return res.status(400).json({ message: "Ai repostat deja această postare" });

    const { comment } = req.body;
    const repost = await Post.create({
      author: req.user._id,
      content: comment?.trim() || "",
      repostOf: targetId,
    });
    await repost.populate("author", "username displayName avatar role location customRole");
    await repost.populate({
      path: "repostOf",
      populate: [
        { path: "author", select: "username displayName avatar role location customRole" },
        { path: "comments.author", select: "username displayName avatar" },
      ],
    });

    const targetPost = await Post.findById(targetId);
    if (targetPost && targetPost.author.toString() !== req.user._id.toString()) {
      await Notification.create({ recipient: targetPost.author, sender: req.user._id, type: "repost", post: targetId });
    }

    res.status(201).json(repost);
  } catch (err) {
    res.status(500).json({ message: "Eroare la repostare" });
  }
});

// 📣 Anulează repost-ul propriu pentru o postare
router.delete("/:id/repost", auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const repost = await Post.findOne({ author: req.user._id, repostOf: targetId });
    if (!repost) return res.status(404).json({ message: "Nu ai repostat această postare" });
    await repost.deleteOne();
    res.json({ message: "Repost anulat" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// 🔖 Salvează / desalvează o postare — colecție privată
router.put("/:id/save", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Postare negăsită" });

    const existing = await SavedPost.findOne({ user: req.user._id, post: post._id });
    if (existing) {
      await existing.deleteOne();
      return res.json({ saved: false });
    }
    await SavedPost.create({ user: req.user._id, post: post._id });
    res.json({ saved: true });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// 🔖 Lista postărilor salvate de userul curent
router.get("/saved", auth, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const saved = await SavedPost.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit))
      .populate({
        path: "post",
        populate: [
          { path: "author", select: "username displayName avatar role location customRole" },
          { path: "comments.author", select: "username displayName avatar" },
          {
            path: "repostOf",
            populate: [
              { path: "author", select: "username displayName avatar role location customRole" },
              { path: "comments.author", select: "username displayName avatar" },
            ],
          },
        ],
      });

    // Filtrează postările care au fost șterse sau au autorul șters
    const validSaved = saved.filter(s => s.post && !s.post.isDeleted);
    const enriched = await enrichPosts(validSaved.map(s => s.post), req.user._id);
    const posts = enriched.map((p, i) => ({ ...p, isSavedByMe: true, savedAt: validSaved[i].createdAt }));

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Eroare la încărcarea postărilor salvate" });
  }
});


router.put("/:id/like", auth, muteCheck, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Postare negăsită" });
    const liked = post.likes.includes(req.user._id);
    if (liked) {
      post.likes.pull(req.user._id);
    } else {
      post.likes.push(req.user._id);
      if (post.author.toString() !== req.user._id.toString()) {
        await Notification.create({ recipient: post.author, sender: req.user._id, type: "like", post: post._id });
      }
    }
    await post.save();
    res.json({ likes: post.likes, liked: !liked });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Adaugă comentariu
router.post("/:id/comment", auth, muteCheck, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: "Comentariul este gol" });
    const post = await Post.findById(req.params.id);
    if (!post || post.isDeleted) return res.status(404).json({ message: "Postare negăsită" });
    post.comments.push({ author: req.user._id, text: text.trim() });
    await post.save();
    if (post.author.toString() !== req.user._id.toString()) {
      await Notification.create({ recipient: post.author, sender: req.user._id, type: "comment", post: post._id });
    }
    const updated = await Post.findById(post._id).populate("comments.author", "username displayName avatar");
    res.json(updated.comments[updated.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Șterge comentariu
router.delete("/:postId/comment/:commentId", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Postare negăsită" });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comentariu negăsit" });
    if (comment.author.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: "Acces interzis" });
    post.comments.pull(req.params.commentId);
    await post.save();
    res.json({ message: "Comentariu șters" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

// Șterge postare
router.delete("/:id", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Postare negăsită" });
    if (post.author.toString() !== req.user._id.toString() && !req.user.isAdmin)
      return res.status(403).json({ message: "Acces interzis" });
    post.isDeleted = true;
    post.deletedBy = req.user._id;
    post.deletedAt = new Date();
    await post.save();
    res.json({ message: "Postare ștearsă" });
  } catch (err) {
    res.status(500).json({ message: "Eroare" });
  }
});

module.exports = router;
