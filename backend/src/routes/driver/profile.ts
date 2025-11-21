// src/routes/driver/profile.ts
import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { uploadDriverProfile } from "@/middleware/upload"; // <= perbaiki path
import { z } from "zod";
import { hashPassword } from "@/lib/auth";

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
        birthPlace: true,
        birthDate: true,
        idCardUrl: true,
        studentCardUrl: true,
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
          birthPlace: true,
          birthDate: true,
          idCardUrl: true,
          studentCardUrl: true,
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

  const schema = z.object({
    name: z.string().min(1).optional(),
    nim: z.string().optional().nullable(),
    whatsapp: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    birthPlace: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(), // parse to Date
    idCardUrl: z.string().optional().nullable(),
    studentCardUrl: z.string().optional().nullable(),
    photoUrl: z.string().optional().nullable() // FE kirim photoUrl => map ke facePhotoUrl
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return res.status(400).json({ ok: false, error: { message: `Invalid payload: ${detail}` } });
  }

  const { name, nim, whatsapp, address, birthPlace, birthDate, idCardUrl, studentCardUrl, photoUrl } = parsed.data;
  const birthDateVal = birthDate ? new Date(birthDate) : undefined;
  if (birthDate && Number.isNaN(birthDateVal?.getTime())) {
    return res.status(400).json({ ok: false, error: { message: "Invalid birthDate" } });
  }

  try {
    const profile = await prisma.driverProfile.upsert({
      where: { userId },
      update: {
        ...(name !== undefined ? { name } : {}),
        ...(nim !== undefined ? { nim } : {}),
        ...(whatsapp !== undefined ? { whatsapp } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(birthPlace !== undefined ? { birthPlace } : {}),
        ...(birthDate !== undefined ? { birthDate: birthDateVal ?? null } : {}),
        ...(idCardUrl !== undefined ? { idCardUrl } : {}),
        ...(studentCardUrl !== undefined ? { studentCardUrl } : {}),
        ...(photoUrl !== undefined ? { facePhotoUrl: photoUrl } : {}), // map
      },
      create: {
        userId,
        name: name ?? undefined,
        nim: nim ?? undefined,
        whatsapp: whatsapp ?? undefined,
        address: address ?? undefined,
        birthPlace: birthPlace ?? undefined,
        birthDate: birthDateVal ?? undefined,
        idCardUrl: idCardUrl ?? undefined,
        studentCardUrl: studentCardUrl ?? undefined,
        facePhotoUrl: photoUrl ?? undefined,
        status: "PENDING",
      },
      select: {
        id: true,
        name: true,
        nim: true,
        whatsapp: true,
        address: true,
        birthPlace: true,
        birthDate: true,
        idCardUrl: true,
        studentCardUrl: true,
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

/**
 * GET /driver/account
 * Ambil data user (table User) milik driver login
 */
router.get("/account", async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, phone: true, role: true }
  });
  if (!user) return res.status(404).json({ ok: false, error: { message: "User not found" } });

  return res.json({ ok: true, data: { user } });
});

/**
 * PATCH /driver/account
 * Update data user (username/email/phone/password) dgn validasi sederhana + cek unik
 */
router.patch("/account", async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });

  const schema = z.object({
    username: z.string().min(3).max(50).trim().optional(),
    email: z.string().email().trim().optional(),
    phone: z.string().min(6).max(20).trim().optional(),
    password: z.string().min(6).optional(),
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return res.status(400).json({ ok: false, error: { message: `Invalid payload: ${detail}` } });
  }

  const { username, email, phone, password } = parsed.data;
  if (!username && !email && !phone && !password) {
    return res.status(400).json({ ok: false, error: { message: "No changes provided" } });
  }

  try {
    // cek unik username/email bila ada
    if (username) {
      const exists = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
        select: { id: true },
      });
      if (exists) return res.status(409).json({ ok: false, error: { message: "Username sudah dipakai" } });
    }
    if (email) {
      const exists = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (exists) return res.status(409).json({ ok: false, error: { message: "Email sudah dipakai" } });
    }

    const data: any = {};
    if (username !== undefined) data.username = username;
    if (email !== undefined) data.email = email;
    if (phone !== undefined) data.phone = phone;
    if (password) data.passwordHash = await hashPassword(password);

    const user = await prisma.user.update({
      where: { id: userId },
      data,
      select: { id: true, username: true, email: true, phone: true, role: true },
    });

    return res.json({ ok: true, data: { user } });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { message: e.message || "Server error" } });
  }
});
