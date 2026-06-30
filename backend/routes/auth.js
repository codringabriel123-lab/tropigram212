const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { authenticator } = require("otplib");
const qrcode = require("qrcode");
const User = require("../models/User");
const { auth } = require("../middleware/auth");

router.post("/register", async (req, res) => {
  try {
    const { username, displayName, password, role } = req.body;
    if (!username || !displayName || !password)
      return res.status(400).json({ message: "Completează toate câmpurile" });
    if (password.length < 6)
      return res.status(400).json({ message: "Parola trebuie să aibă minim 6 caractere" });

    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) return res.status(400).json({ message: "Username-ul este deja folosit" });

    const hashed = await bcrypt.hash(password, 12);
    const isFirstUser = (await User.countDocuments()) === 0;
    const clientIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "";

    const user = new User({
      username: username.toLowerCase(),
      displayName,
      password: hashed,
      role: role || "Civil",
      isAdmin: isFirstUser,
      avatar: displayName.slice(0, 2).toUpperCase(),
      registrationIp: clientIp,
      lastIp: clientIp,
    });
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password: _, twoFactorSecret, twoFactorTempSecret, twoFactorBackupCodes, ...userObj } = user.toObject();
    res.status(201).json({ token, user: userObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la înregistrare" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ username: username?.toLowerCase() });
    if (!user) return res.status(400).json({ message: "Username sau parolă greșite" });
    if (user.isBanned) return res.status(403).json({ message: `Cont banat: ${user.banReason || "Motiv nespecificat"}` });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ message: "Username sau parolă greșite" });

    // 🔐 Dacă userul are 2FA activat, nu emitem tokenul final încă —
    // doar un token temporar (5 minute), valabil exclusiv pentru pasul de verificare a codului.
    if (user.twoFactorEnabled) {
      const tempToken = jwt.sign({ id: user._id, step: "2fa" }, process.env.JWT_SECRET, { expiresIn: "5m" });
      return res.json({ requires2FA: true, tempToken });
    }

    user.lastSeen = new Date();
    user.lastIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "";
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password: _, twoFactorSecret, twoFactorTempSecret, twoFactorBackupCodes, ...userObj } = user.toObject();
    res.json({ token, user: userObj });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la conectare" });
  }
});

// 🔐 Pasul 2 al login-ului: verifică codul TOTP (sau un cod de backup) și emite tokenul final
router.post("/2fa/verify-login", async (req, res) => {
  try {
    const { tempToken, code } = req.body;
    if (!tempToken || !code) return res.status(400).json({ message: "Cod necesar" });

    let decoded;
    try {
      decoded = jwt.verify(tempToken, process.env.JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Sesiune de verificare expirată, conectează-te din nou" });
    }
    if (decoded.step !== "2fa") return res.status(401).json({ message: "Token invalid" });

    const user = await User.findById(decoded.id);
    if (!user || !user.twoFactorEnabled) return res.status(400).json({ message: "2FA nu este activat pe acest cont" });
    if (user.isBanned) return res.status(403).json({ message: `Cont banat: ${user.banReason || "Motiv nespecificat"}` });

    const cleanCode = String(code).trim().replace(/\s+/g, "");
    let usedBackupCode = false;

    let validCode = authenticator.check(cleanCode, user.twoFactorSecret);

    // Dacă codul TOTP nu se potrivește, verificăm și printre codurile de backup
    if (!validCode && user.twoFactorBackupCodes?.length) {
      for (const hashed of user.twoFactorBackupCodes) {
        if (await bcrypt.compare(cleanCode.toUpperCase(), hashed)) {
          validCode = true;
          usedBackupCode = true;
          // codul de backup se consumă — poate fi folosit o singură dată
          user.twoFactorBackupCodes = user.twoFactorBackupCodes.filter(h => h !== hashed);
          break;
        }
      }
    }

    if (!validCode) return res.status(400).json({ message: "Cod incorect" });

    user.lastSeen = new Date();
    user.lastIp = req.headers["x-forwarded-for"]?.split(",")[0].trim() || req.socket.remoteAddress || "";
    await user.save();

    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "30d" });
    const { password: _, twoFactorSecret, twoFactorTempSecret, twoFactorBackupCodes, ...userObj } = user.toObject();
    res.json({ token, user: userObj, usedBackupCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la verificarea codului" });
  }
});

// 🔐 Pasul 1 al activării 2FA: generează un secret nou + QR code (neactivat încă)
router.post("/2fa/setup", auth, async (req, res) => {
  try {
    if (req.user.twoFactorEnabled) return res.status(400).json({ message: "2FA este deja activat" });

    const secret = authenticator.generateSecret();
    req.user.twoFactorTempSecret = secret;
    await req.user.save();

    const otpauth = authenticator.keyuri(req.user.username, "TropicalRP", secret);
    const qrCode = await qrcode.toDataURL(otpauth);

    res.json({ secret, qrCode });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la generarea 2FA" });
  }
});

// 🔐 Pasul 2 al activării 2FA: confirmă codul generat de aplicație și activează 2FA definitiv
router.post("/2fa/enable", auth, async (req, res) => {
  try {
    const { code } = req.body;
    if (!req.user.twoFactorTempSecret) return res.status(400).json({ message: "Pornește mai întâi setup-ul 2FA" });

    const valid = authenticator.check(String(code || "").trim().replace(/\s+/g, ""), req.user.twoFactorTempSecret);
    if (!valid) return res.status(400).json({ message: "Cod incorect, încearcă din nou" });

    // Generăm 8 coduri de backup (folosite o singură dată fiecare, pt cazul în care userul își pierde telefonul)
    const plainCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
    );
    const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 10)));

    req.user.twoFactorSecret = req.user.twoFactorTempSecret;
    req.user.twoFactorTempSecret = null;
    req.user.twoFactorEnabled = true;
    req.user.twoFactorBackupCodes = hashedCodes;
    await req.user.save();

    res.json({ message: "2FA activat cu succes", backupCodes: plainCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la activarea 2FA" });
  }
});

// 🔐 Dezactivează 2FA — necesită parola curentă pentru confirmare
router.post("/2fa/disable", auth, async (req, res) => {
  try {
    const { password } = req.body;
    const valid = await bcrypt.compare(password || "", req.user.password);
    if (!valid) return res.status(400).json({ message: "Parolă incorectă" });

    req.user.twoFactorEnabled = false;
    req.user.twoFactorSecret = null;
    req.user.twoFactorTempSecret = null;
    req.user.twoFactorBackupCodes = [];
    await req.user.save();

    res.json({ message: "2FA dezactivat" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la dezactivarea 2FA" });
  }
});

// 🔐 Regenerează codurile de backup (invalidează codurile vechi)
router.post("/2fa/regenerate-backup-codes", auth, async (req, res) => {
  try {
    const { password } = req.body;
    if (!req.user.twoFactorEnabled) return res.status(400).json({ message: "2FA nu este activat" });
    const valid = await bcrypt.compare(password || "", req.user.password);
    if (!valid) return res.status(400).json({ message: "Parolă incorectă" });

    const plainCodes = Array.from({ length: 8 }, () =>
      Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase()
    );
    const hashedCodes = await Promise.all(plainCodes.map(c => bcrypt.hash(c, 10)));
    req.user.twoFactorBackupCodes = hashedCodes;
    await req.user.save();

    res.json({ backupCodes: plainCodes });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Eroare la regenerarea codurilor" });
  }
});

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.user._id).select("-password -twoFactorSecret -twoFactorTempSecret -twoFactorBackupCodes").populate("customRole");
  res.json(user);
});

module.exports = router;
