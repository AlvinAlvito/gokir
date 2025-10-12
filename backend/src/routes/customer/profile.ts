// src/routes/customer/profile.ts
import { Router } from "express";
import path from "path";
import { upload } from "@/lib/upload";
import { readSession } from "@/lib/session";
import { prisma } from "@/lib/prisma"; // ⬅️ SESUAIKAN dengan export-mu

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
// body: { name?, nim?, whatsapp?, address?, photoUrl? }
router.patch("/", requireCustomer, async (req: any, res) => {
  try {
    const { name, nim, whatsapp, address, photoUrl } = req.body || {};

    // upsert agar aman jika record belum ada
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
    // (opsional) kalau mau, bisa ambil path lama dan hapus file fisik
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
