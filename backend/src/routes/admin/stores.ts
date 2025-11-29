import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/utils/http";
import { requireAuth, requireRole } from "@/lib/auth";

const router = Router();

// GET /admin/stores?status=PENDING|APPROVED|REJECTED (opsional)
router.get("/", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  try {
    const { status } = req.query as { status?: "PENDING" | "APPROVED" | "REJECTED" };
    const where = status ? { status } : {};
    const items = await prisma.storeProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        storeName: true,
        ownerName: true,
        address: true,
        mapsUrl: true,
        description: true,
        categories: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            ticketBalance: { select: { balance: true } },
            storeAvailability: {
              select: {
                status: true,
                region: true,
                locationUrl: true,
                latitude: true,
                longitude: true,
                note: true,
                openDays: true,
                openTime: true,
                closeTime: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    const storeIds = items.map((s) => s.user?.id).filter(Boolean) as string[];
    const ratingAgg = storeIds.length
      ? await prisma.orderRating.groupBy({
          by: ["storeId"],
          where: { storeId: { in: storeIds }, storeRating: { not: null } },
          _avg: { storeRating: true },
        })
      : [];
    const ratingMap = Object.fromEntries(ratingAgg.map((r) => [r.storeId as string, r._avg.storeRating]));
    const enriched = items.map((it) => ({
      ...it,
      ratingAvg: it.user?.id ? ratingMap[it.user.id] ?? null : null,
    }));
    return res.json(ok(enriched));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// GET /admin/stores/:id
router.get("/:id", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  try {
    const item = await prisma.storeProfile.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        storeName: true,
        ownerName: true,
        address: true,
        mapsUrl: true,
        description: true,
        categories: true,
        photoUrl: true,
        status: true,
        createdAt: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            phone: true,
            role: true,
            ticketBalance: { select: { balance: true } },
            storeAvailability: {
              select: {
                status: true,
                region: true,
                locationUrl: true,
                latitude: true,
                longitude: true,
                note: true,
                openDays: true,
                openTime: true,
                closeTime: true,
                updatedAt: true,
              },
            },
          },
        },
      },
    });
    if (!item) return res.status(404).json(fail("Not found"));
    return res.json(ok(item));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// POST /admin/stores/:id/approve
router.post("/:id/approve", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  const id = req.params.id;
  try {
    const sp = await prisma.storeProfile.update({
      where: { id },
      data: { status: "APPROVED" },
      select: { id: true, status: true },
    });
    return res.json(ok(sp));
  } catch {
    return res.status(404).json(fail("Not found"));
  }
});

// POST /admin/stores/:id/reject
router.post("/:id/reject", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  const id = req.params.id;
  try {
    const sp = await prisma.storeProfile.update({
      where: { id },
      data: { status: "REJECTED" },
      select: { id: true, status: true, userId: true },
    });
    if (sp.userId) {
      await prisma.storeAvailability.upsert({
        where: { userId: sp.userId },
        update: { status: "INACTIVE", note: "Dinonaktifkan karena profil ditolak" },
        create: { userId: sp.userId, status: "INACTIVE", note: "Dinonaktifkan karena profil ditolak" },
      });
    }
    return res.json(ok(sp));
  } catch {
    return res.status(404).json(fail("Not found"));
  }
});

export default router;
