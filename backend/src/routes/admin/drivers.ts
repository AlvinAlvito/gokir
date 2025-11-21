import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/utils/http";
import { requireAuth, requireRole } from "@/lib/auth";

const router = Router();

// GET /admin/drivers?status=PENDING|APPROVED|REJECTED (opsional)
router.get("/", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  try {
    const { status } = req.query as { status?: "PENDING" | "APPROVED" | "REJECTED" };
    const where = status ? { status } : {};

    const items = await prisma.driverProfile.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        nim: true,
        whatsapp: true,
        address: true,
        facePhotoUrl: true,
        idCardUrl: true,
        studentCardUrl: true,
        status: true,
        createdAt: true,
        user: {
          select: { id: true, username: true, email: true, phone: true, role: true },
        },
        reviewedBy: {
          select: { id: true, username: true, email: true },
        },
      },
    });

    return res.json(ok(items));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

// POST /admin/drivers/:id/approve
router.post("/:id/approve", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  const id = req.params.id;
  const reviewer = (req as any).user!;
  try {
    const dp = await prisma.driverProfile.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedById: reviewer.id,
      },
      select: {
        id: true, name: true, status: true, reviewedById: true,
        reviewedBy: { select: { id: true, username: true } },
      },
    });
    return res.json(ok(dp));
  } catch {
    return res.status(404).json(fail("Not found"));
  }
});

// POST /admin/drivers/:id/reject
router.post("/:id/reject", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  const id = req.params.id;
  const reviewer = (req as any).user!;
  try {
    const dp = await prisma.driverProfile.update({
      where: { id },
      data: {
        status: "REJECTED",
        reviewedById: reviewer.id,
      },
      select: {
        id: true, name: true, status: true, reviewedById: true,
        reviewedBy: { select: { id: true, username: true } },
      },
    });
    return res.json(ok(dp));
  } catch {
    return res.status(404).json(fail("Not found"));
  }
});
// BE: GET /admin/drivers/:id
router.get("/:id", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  try {
    const item = await prisma.driverProfile.findUnique({
      where: { id: req.params.id },
      select: {
        id: true, name: true, nim: true, whatsapp: true, address: true,
        birthPlace: true, birthDate: true, idCardUrl: true, studentCardUrl: true,
        facePhotoUrl: true, status: true, createdAt: true,
        user: { select: { id: true, username: true, email: true, phone: true, role: true } },
        reviewedBy: { select: { id: true, username: true, email: true } },
      },
    });
    if (!item) return res.status(404).json(fail("Not found"));
    return res.json(ok(item));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

export default router;
