// src/routes/driver/profile.ts
import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { uploadDriverProfile } from "@/middleware/upload"; // <= perbaiki path

const router = Router();

/**
 * GET /driver/profile/me
 * Ambil profil driver milik user login. Kalau belum ada, buat minimal.
 */
router.get("/me", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    // Cari dulu
    let profile = await prisma.driverProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        name: true,
        nim: true,
        whatsapp: true,
        address: true,
        facePhotoUrl: true, // <= pakai facePhotoUrl
        status: true,
      },
    });

    // Jika belum ada, buat minimal
    if (!profile) {
      profile = await prisma.driverProfile.create({
        data: {
          userId,
          status: "PENDING", // enum DriverStatus
        } as any,
        select: {
          id: true,
          name: true,
          nim: true,
          whatsapp: true,
          address: true,
          facePhotoUrl: true,
          status: true,
        },
      });
    }

    return res.json({ ok: true, data: { profile } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { message: e.message || "Server error" } });
  }
});

/**
 * PATCH /driver/profile
 * Update field teks basic
 */
router.patch("/", async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
  }

  const { name, nim, whatsapp, address, photoUrl } = req.body as {
    name?: string;
    nim?: string | null;
    whatsapp?: string | null;
    address?: string | null;
    photoUrl?: string | null; // FE kirim photoUrl => map ke facePhotoUrl
  };

  try {
    const profile = await prisma.driverProfile.upsert({
      where: { userId },
      update: {
        ...(name !== undefined ? { name } : {}),
        ...(nim !== undefined ? { nim } : {}),
        ...(whatsapp !== undefined ? { whatsapp } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(photoUrl !== undefined ? { facePhotoUrl: photoUrl } : {}), // map
      },
      create: {
        userId,
        name: name ?? undefined,
        nim: nim ?? undefined,
        whatsapp: whatsapp ?? undefined,
        address: address ?? undefined,
        facePhotoUrl: photoUrl ?? undefined,
        status: "PENDING",
      },
      select: {
        id: true,
        name: true,
        nim: true,
        whatsapp: true,
        address: true,
        facePhotoUrl: true,
        status: true,
      },
    });

    return res.json({ ok: true, data: { profile } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { message: e.message || "Server error" } });
  }
});

/**
 * POST /driver/profile/photo
 * Upload foto -> simpan path relatif di facePhotoUrl
 */
router.post("/photo", (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) {
    return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
  }

  uploadDriverProfile(req, res, async (err: any) => {
    if (err) {
      return res.status(400).json({ ok: false, error: { message: err.message || "Upload failed" } });
    }
    if (!req.file) {
      return res.status(400).json({ ok: false, error: { message: "No file uploaded" } });
    }

    // file disimpan di uploads/profile/, jadi URL-nya harus memuat subfolder "profile"
    const relative = `/uploads/profile/${req.file.filename}`;

    try {
      const profile = await prisma.driverProfile.upsert({
        where: { userId },
        update: { facePhotoUrl: relative },
        create: {
          userId,
          facePhotoUrl: relative,
          status: "PENDING",
        },
        select: {
          id: true,
          name: true,
          nim: true,
          whatsapp: true,
          address: true,
          facePhotoUrl: true,
          status: true,
        },
      });

      return res.json({ ok: true, data: { photoUrl: relative, profile } });
    } catch (e: any) {
      return res.status(500).json({ ok: false, error: { message: e.message || "DB error" } });
    }
  });
});

/**
 * DELETE /driver/profile/photo
 * Hapus referensi foto (opsional: sekalian unlink file fisik nanti)
 */
router.delete("/photo", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });
    }

    await prisma.driverProfile.update({
      where: { userId },
      data: { facePhotoUrl: null },
    });

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { message: e.message || "Server error" } });
  }
});

export default router;
