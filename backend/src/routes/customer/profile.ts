// src/routes/customer/profile.ts
import { Router } from "express";
import path from "path";
import { z } from "zod";
import { upload } from "@/lib/upload";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";

function ok(data: any) { return { ok: true, data }; }
function fail(message: string, code = "BAD_REQUEST") {
  return { ok: false, error: { code, message } };
}

// guard: hanya CUSTOMER
function requireCustomer(req: any, res: any, next: any) {
  const sess = readSession(req);
  if (!sess) return res.status(401).json(fail("Unauthorized", "UNAUTHORIZED"));
  if (sess.role !== "CUSTOMER") {
    return res.status(403).json(fail("Forbidden (customer only)", "FORBIDDEN"));
  }
  req.user = { id: sess.userId, role: sess.role };
  next();
}

const router = Router();

// helper no-cache (opsional)
function noCache(res: any) {
  res.set({
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    Pragma: "no-cache",
    Expires: "0",
    "Surrogate-Control": "no-store",
  });
}

// ===================== USER ACCOUNT (table User) =====================
// GET /customer/profile/account
router.get("/account", requireCustomer, async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, username: true, email: true, phone: true, role: true },
  });
  if (!user) return res.status(404).json(fail("User not found", "NOT_FOUND"));
  return res.json(ok({ user }));
});

// PATCH /customer/profile/account
router.patch("/account", requireCustomer, async (req: any, res) => {
  const schema = z.object({
    username: z.string().min(3).max(50).trim().optional(),
    email: z.string().email().trim().optional(),
    phone: z.string().min(6).max(20).trim().optional(),
    password: z.string().min(6).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return res.status(400).json(fail(`Invalid payload: ${detail}`));
  }

  const { username, email, phone, password } = parsed.data;
  if (!username && !email && !phone && !password) {
    return res.status(400).json(fail("Tidak ada perubahan", "NO_DATA"));
  }

  // cek unik username/email
  if (username) {
    const exists = await prisma.user.findFirst({
      where: { username, NOT: { id: req.user.id } },
      select: { id: true },
    });
    if (exists) return res.status(409).json(fail("Username sudah dipakai", "USERNAME_TAKEN"));
  }
  if (email) {
    const exists = await prisma.user.findFirst({
      where: { email, NOT: { id: req.user.id } },
      select: { id: true },
    });
    if (exists) return res.status(409).json(fail("Email sudah dipakai", "EMAIL_TAKEN"));
  }

  const data: any = {};
  if (username !== undefined) data.username = username;
  if (email !== undefined) data.email = email;
  if (phone !== undefined) data.phone = phone;
  if (password) data.passwordHash = await hashPassword(password);

  const user = await prisma.user.update({
    where: { id: req.user.id },
    data,
    select: { id: true, username: true, email: true, phone: true, role: true },
  });

  return res.json(ok({ user }));
});

// ===================== CUSTOMER PROFILE =====================
// GET /customer/profile/me
router.get("/me", requireCustomer, async (req: any, res) => {
  noCache(res);
  try {
    // pastikan profil ada; kalau tidak, buat kosong
    const existing = await prisma.customerProfile.findUnique({
      where: { userId: req.user.id },
      select: {
        id: true,
        userId: true,
        name: true,
        photoUrl: true,
        nim: true,
        whatsapp: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (existing) return res.json(ok({ profile: existing }));

    const created = await prisma.customerProfile.create({
      data: { userId: req.user.id },
      select: {
        id: true,
        userId: true,
        name: true,
        photoUrl: true,
        nim: true,
        whatsapp: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(ok({ profile: created }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error", "SERVER_ERROR"));
  }
});

// PATCH /customer/profile
router.patch("/", requireCustomer, async (req: any, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1).optional(),
      nim: z.string().optional().nullable(),
      whatsapp: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      photoUrl: z.string().optional().nullable(),
    });

    const parsed = schema.safeParse(req.body || {});
    if (!parsed.success) {
      const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return res.status(400).json(fail(`Invalid payload: ${detail}`));
    }

    const { name, nim, whatsapp, address, photoUrl } = parsed.data;

    const updated = await prisma.customerProfile.upsert({
      where: { userId: req.user.id },
      update: {
        ...(name !== undefined ? { name } : {}),
        ...(nim !== undefined ? { nim } : {}),
        ...(whatsapp !== undefined ? { whatsapp } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
      create: {
        userId: req.user.id,
        ...(name !== undefined ? { name } : {}),
        ...(nim !== undefined ? { nim } : {}),
        ...(whatsapp !== undefined ? { whatsapp } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
      select: {
        id: true,
        userId: true,
        name: true,
        photoUrl: true,
        nim: true,
        whatsapp: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(ok({ profile: updated }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error", "SERVER_ERROR"));
  }
});

// POST /customer/profile/photo (form-data: photo)
router.post("/photo", requireCustomer, upload.single("photo"), async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).json(fail("No file uploaded"));

    // file disajikan lewat express.static("/uploads")
    const publicPath = "/uploads/profile/" + req.file.filename;

    const updated = await prisma.customerProfile.upsert({
      where: { userId: req.user.id },
      update: { photoUrl: publicPath },
      create: { userId: req.user.id, photoUrl: publicPath },
      select: {
        id: true,
        userId: true,
        name: true,
        photoUrl: true,
        nim: true,
        whatsapp: true,
        address: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(ok({ photoUrl: publicPath, profile: updated }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error", "SERVER_ERROR"));
  }
});

// DELETE /customer/profile/photo
router.delete("/photo", requireCustomer, async (req: any, res) => {
  try {
    await prisma.customerProfile.update({
      where: { userId: req.user.id },
      data: { photoUrl: null },
    });
    return res.json(ok({}));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error", "SERVER_ERROR"));
  }
});

export default router;
