// src/lib/upload.ts
import multer from "multer";
import fs from "fs";
import path from "path";

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dest = path.resolve(process.cwd(), "uploads", "profile"); // ⬅️ sama dengan static
    ensureDir(dest);
    cb(null, dest);
  },
  filename: (req: any, file, cb) => {
    const userId = req.user?.id || "anon";
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `customer-${userId}-${Date.now()}${ext}`);
  },
});

export const upload = multer({ storage });
