import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const router = Router();

const statusEnum = ["ACTIVE", "INACTIVE"] as const;
const regionEnum = ["KAMPUS_SUTOMO", "KAMPUS_TUNTUNGAN", "KAMPUS_PANCING", "WILAYAH_LAINNYA"] as const;

const patchSchema = z.object({
  status: z.enum(statusEnum).optional(),
  region: z.enum(regionEnum).optional(),
  locationUrl: z.string().url().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  note: z.string().max(255).optional(),
  openDays: z.string().max(100).optional(), // CSV "Senin,Selasa"
  openTime: z.string().max(10).optional(),  // "08:00"
  closeTime: z.string().max(10).optional(), // "17:00"
});

// GET /store/availability
router.get("/", requireRole(["STORE"]), async (req, res) => {
  const user = (req as any).user!;
  const store = await prisma.storeProfile.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  let availability = await prisma.storeAvailability.findUnique({
    where: { userId: user.id },
  });

  if (!availability) {
    availability = await prisma.storeAvailability.create({
      data: { userId: user.id },
    });
  }

  return res.json({ ok: true, data: { availability, storeStatus: store?.status ?? "PENDING" } });
});

// PATCH /store/availability
router.patch("/", requireRole(["STORE"]), async (req, res) => {
  const user = (req as any).user!;
  const store = await prisma.storeProfile.findUnique({
    where: { userId: user.id },
    select: { status: true },
  });
  if (store?.status !== "APPROVED") {
    return res.status(403).json({ ok: false, error: { message: "Profil toko belum disetujui. Tidak bisa mengubah ketersediaan." } });
  }
  const parsed = patchSchema.safeParse(req.body);
  if (!parsed.success) {
    const detail = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    return res.status(400).json({ ok: false, error: { message: `Invalid payload: ${detail}` } });
  }

  const data = parsed.data;

  // Jika lokasi sudah pernah diset, jangan override kecuali masih null
  const existing = await prisma.storeAvailability.findUnique({
    where: { userId: user.id },
    select: { locationUrl: true, latitude: true, longitude: true },
  });

  const safeData: any = { ...data };
  if (existing?.locationUrl) delete safeData.locationUrl;
  if (existing?.latitude !== null && existing?.latitude !== undefined) delete safeData.latitude;
  if (existing?.longitude !== null && existing?.longitude !== undefined) delete safeData.longitude;

  // Cek saldo tiket > 0
  const bal = await prisma.ticketBalance.findUnique({ where: { userId: user.id } });
  if ((bal?.balance ?? 0) <= 0) {
    return res.status(403).json({ ok: false, error: { message: "Saldo tiket habis. Tidak bisa mengubah ketersediaan." } });
  }

  const availability = await prisma.storeAvailability.upsert({
    where: { userId: user.id },
    update: safeData,
    create: { userId: user.id, ...safeData },
  });

  return res.json({ ok: true, data: { availability } });
});

export default router;
