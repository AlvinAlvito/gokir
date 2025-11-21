import { Router } from "express";
import { z, ZodError } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/utils/http";
import { requireAuth, requireRole } from "@/lib/auth";

const router = Router();

// === Upload setup ===
const uploadDir = path.resolve(process.cwd(), "uploads", "announcements");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\W+/g, "-").toLowerCase();
    cb(null, `${base}-${Date.now()}${ext || ".jpg"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

const ROLE_ENUM = ["CUSTOMER", "DRIVER", "STORE", "ADMIN", "SUPERADMIN"] as const;

const baseSchema = z.object({
  slug: z.string().min(3),
  title: z.string().min(3),
  description: z.string().min(5),
  imageUrl: z.string().url().optional(), // fallback jika tidak upload
  link: z.string().url().optional(),
  forRole: z.enum(ROLE_ENUM).optional(),
  sortOrder: z.coerce.number().int().min(0).optional(),
  isActive: z.coerce.boolean().optional()
});

const createSchema = baseSchema;
const updateSchema = baseSchema.partial().extend({ slug: z.string().optional() });

const normalizeBody = (body: any) => ({
  slug: body.slug?.trim(),
  title: body.title?.trim(),
  description: body.description?.trim(),
  imageUrl: body.imageUrl ? String(body.imageUrl).trim() : undefined,
  link: body.link ? String(body.link).trim() : undefined,
  forRole: body.forRole ? String(body.forRole).toUpperCase() : undefined,
  sortOrder: body.sortOrder ?? 0,
  isActive: body.isActive ?? true,
});

router.use(requireAuth, requireRole(["ADMIN", "SUPERADMIN"]));

const formatZod = (err: ZodError<any>) =>
  err.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");

// List semua pengumuman
router.get("/", async (_req, res) => {
  try {
    const items = await prisma.announcement.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }]
    });
    return res.json(ok(items));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// Create
router.post("/", upload.single("image"), async (req, res) => {
  const parsed = createSchema.safeParse(normalizeBody(req.body));
  if (!parsed.success) {
    const detail = formatZod(parsed.error);
    return res.status(400).json(fail(`Invalid payload: ${detail}`));
  }

  // Wajib ada gambar, entah via upload atau URL
  const file = req.file;
  const imageUrl = file
    ? `/uploads/announcements/${file.filename}`
    : parsed.data.imageUrl;
  if (!imageUrl) return res.status(400).json(fail("Image diperlukan"));

  try {
    const item = await prisma.announcement.create({
      data: {
        ...parsed.data,
        imageUrl,
        isActive: parsed.data.isActive ?? true,
      },
    });
    return res.status(201).json(ok(item));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// Update
router.put("/:id", upload.single("image"), async (req, res) => {
  const parsed = updateSchema.safeParse(normalizeBody(req.body));
  if (!parsed.success) {
    const detail = formatZod(parsed.error);
    return res.status(400).json(fail(`Invalid payload: ${detail}`));
  }

  const file = req.file;
  const data: any = { ...parsed.data };
  if (file) data.imageUrl = `/uploads/announcements/${file.filename}`;

  try {
    const item = await prisma.announcement.update({
      where: { id: req.params.id },
      data,
    });
    return res.json(ok(item));
  } catch {
    return res.status(404).json(fail("Not found"));
  }
});

// Delete
router.delete("/:id", async (req, res) => {
  try {
    await prisma.announcement.delete({ where: { id: req.params.id } });
    return res.json(ok({ id: req.params.id }));
  } catch {
    return res.status(404).json(fail("Not found"));
  }
});

export default router;
