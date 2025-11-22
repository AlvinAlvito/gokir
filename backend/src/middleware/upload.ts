import multer from "multer";
import path from "path";
import crypto from "crypto";
import fs from "fs";
  
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), "uploads"));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const base = crypto.randomBytes(16).toString("hex");
    cb(null, `${Date.now()}_${base}${ext}`);
  }
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  // hanya gambar
  if (!file.mimetype.startsWith("image/")) {
    return cb(new Error("Invalid file type. Only images allowed."));
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB per file
  }
});
// helper bikin folder
function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
// ===== DRIVER (baru) =====
const driverStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(process.cwd(), "uploads", "profile");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (req: any, file, cb) => {
    const userId = req.user?.id || "anon";
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".jpg";
    cb(null, `profile-driver-${userId}-${Date.now()}${safeExt}`);
  },
});

export const uploadDriverProfile = multer({
  storage: driverStorage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/i.test(file.mimetype);
    if (!ok) return cb(new Error("File harus JPG/PNG/WEBP"));
    cb(null, true);
  },
}).single("photo");

// ===== STORE PHOTO =====
const storeStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.resolve(process.cwd(), "uploads", "store");
    ensureDir(dir);
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "");
    const safeExt = ext || ".jpg";
    cb(null, `store-${Date.now()}-${crypto.randomBytes(8).toString("hex")}${safeExt}`);
  },
});

export const uploadStorePhoto = multer({
  storage: storeStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /image\/(jpeg|png|webp)/i.test(file.mimetype);
    if (!ok) return cb(new Error("File harus JPG/PNG/WEBP"));
    cb(null, true);
  },
}).single("photo");
