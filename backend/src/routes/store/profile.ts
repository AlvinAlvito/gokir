// src/routes/store/profile.ts
import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { uploadStorePhoto } from "@/middleware/upload";
import { ok, fail } from "@/utils/http";
import { hashPassword } from "@/lib/auth";
import { z } from "zod";

const router = Router();

// GET /store/profile/me
router.get("/me", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(fail("Unauthorized"));

    let profile = await prisma.storeProfile.findUnique({
      where: { userId },
      select: {
        id: true,
        userId: true,
        storeName: true,
        ownerName: true,
        address: true,
        mapsUrl: true,
        description: true,
        categories: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!profile) {
      profile = await prisma.storeProfile.create({
        data: { userId },
        select: {
          id: true,
          userId: true,
          storeName: true,
          ownerName: true,
          address: true,
          mapsUrl: true,
          description: true,
          categories: true,
          photoUrl: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, phone: true, role: true },
    });

    return res.json(ok({ profile, user }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// PATCH /store/profile
router.patch("/", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(fail("Unauthorized"));

    let { storeName, ownerName, address, mapsUrl, description, categories, photoUrl } = req.body as {
      storeName?: string | null;
      ownerName?: string | null;
      address?: string | null;
      mapsUrl?: string | null;
      description?: string | null;
      categories?: string | string[] | null;
      photoUrl?: string | null;
    };

    if (Array.isArray(categories)) {
      categories = categories.map((s) => `${s}`.trim()).filter(Boolean).join(",");
    }

    const profile = await prisma.storeProfile.upsert({
      where: { userId },
      update: {
        ...(storeName !== undefined ? { storeName } : {}),
        ...(ownerName !== undefined ? { ownerName } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(mapsUrl !== undefined ? { mapsUrl } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(categories !== undefined ? { categories } : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
      },
      create: {
        userId,
        storeName: storeName ?? undefined,
        ownerName: ownerName ?? undefined,
        address: address ?? undefined,
        mapsUrl: mapsUrl ?? undefined,
        description: description ?? undefined,
        categories: (categories as string | null) ?? undefined,
        photoUrl: photoUrl ?? undefined,
      },
      select: {
        id: true,
        userId: true,
        storeName: true,
        ownerName: true,
        address: true,
        mapsUrl: true,
        description: true,
        categories: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return res.json(ok({ profile }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// POST /store/profile/photo
router.post("/photo", (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json(fail("Unauthorized"));

  uploadStorePhoto(req, res, async (err: any) => {
    if (err) return res.status(400).json(fail(err.message || "Upload failed"));
    if (!req.file) return res.status(400).json(fail("No file uploaded"));

    const relative = `/uploads/store/${req.file.filename}`;

    try {
      const profile = await prisma.storeProfile.upsert({
        where: { userId },
        update: { photoUrl: relative },
        create: { userId, photoUrl: relative },
        select: {
          id: true,
          userId: true,
          storeName: true,
          ownerName: true,
          address: true,
          mapsUrl: true,
          description: true,
          categories: true,
          photoUrl: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      return res.json(ok({ photoUrl: relative, profile }));
    } catch (e: any) {
      return res.status(500).json(fail(e.message || "DB error"));
    }
  });
});

// DELETE /store/profile/photo
router.delete("/photo", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(fail("Unauthorized"));

    await prisma.storeProfile.update({
      where: { userId },
      data: { photoUrl: null },
    });

    return res.json(ok(true));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

export default router;

// GET /store/profile/account
router.get("/account", async (req: any, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json(fail("Unauthorized"));

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, username: true, email: true, phone: true, role: true },
    });
    if (!user) return res.status(404).json(fail("User not found"));

    return res.json(ok({ user }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// PATCH /store/profile/account
router.patch("/account", async (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json(fail("Unauthorized"));

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
    return res.status(400).json(fail("No changes provided"));
  }

  try {
    if (username) {
      const exists = await prisma.user.findFirst({
        where: { username, NOT: { id: userId } },
        select: { id: true },
      });
      if (exists) return res.status(409).json(fail("Username sudah dipakai"));
    }
    if (email) {
      const exists = await prisma.user.findFirst({
        where: { email, NOT: { id: userId } },
        select: { id: true },
      });
      if (exists) return res.status(409).json(fail("Email sudah dipakai"));
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

    return res.json(ok({ user }));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});
