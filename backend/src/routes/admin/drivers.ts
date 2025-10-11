import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/utils/http";
import { requireAuth, requireRole } from "@/lib/auth";
import { z } from "zod";

const router = Router();

// list pengajuan driver (PENDING)
router.get("/", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (_req, res) => {
  const items = await prisma.driverProfile.findMany({
    where: { status: "PENDING" },
    include: { user: true }
  });
  res.json(ok(items));
});

// approve
router.post("/:id/approve", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  const id = req.params.id;
  const reviewer = (req as any).user!;
  try {
    const dp = await prisma.driverProfile.update({
      where: { id },
      data: { status: "APPROVED", reviewedById: reviewer.id }
    });
    res.json(ok(dp));
  } catch {
    res.status(404).json(fail("Not found"));
  }
});

// reject
router.post("/:id/reject", requireAuth, requireRole(["ADMIN","SUPERADMIN"]), async (req, res) => {
  const id = req.params.id;
  const reviewer = (req as any).user!;
  try {
    const dp = await prisma.driverProfile.update({
      where: { id },
      data: { status: "REJECTED", reviewedById: reviewer.id }
    });
    res.json(ok(dp));
  } catch {
    res.status(404).json(fail("Not found"));
  }
});

export default router;
