const router = require("express").Router();
const { auth } = require("../middleware/auth");
const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Limite video (în MB)
const VIDEO_LIMIT_UNVERIFIED = 30;  // 30 MB — conturi neverificate
const VIDEO_LIMIT_VERIFIED = 200;   // 200 MB — conturi verificate

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

// Upload video (base64)
router.post("/video", auth, async (req, res) => {
  try {
    const { data, folder = "posts" } = req.body;
    if (!data) return res.status(400).json({ message: "Niciun video trimis" });

    // Calculează dimensiunea base64 → bytes → MB
    const base64Data = data.includes(",") ? data.split(",")[1] : data;
    const fileSizeMB = (base64Data.length * 3) / 4 / (1024 * 1024);

    const limitMB = req.user.isVerified ? VIDEO_LIMIT_VERIFIED : VIDEO_LIMIT_UNVERIFIED;

    if (fileSizeMB > limitMB) {
      return res.status(400).json({
        message: `Videoul depășește limita de ${limitMB} MB${
          !req.user.isVerified ? ". Verifică-ți contul pentru a putea urca videouri mai mari (până la 200 MB)." : "."
        }`,
      });
    }

    const result = await cloudinary.uploader.upload(data, {
      resource_type: "video",
      folder: `tropical-rp/${folder}`,
      transformation: [
        { quality: "auto" },
        { fetch_format: "auto" },
      ],
    });

    res.json({ url: result.secure_url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la upload video" });
  }
});

module.exports = router;
