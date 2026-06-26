const router = require("express").Router();
const { auth } = require("../middleware/auth");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload imagine (base64)
router.post("/", auth, async (req, res) => {
  try {
    const { data, folder = "posts" } = req.body;
    if (!data) return res.status(400).json({ message: "Nicio imagine trimisă" });

    const result = await cloudinary.uploader.upload(data, {
      folder: `tropical-rp/${folder}`,
      transformation: [
        { width: 1080, crop: "limit" },
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la upload imagine" });
  }
});

module.exports = router;
