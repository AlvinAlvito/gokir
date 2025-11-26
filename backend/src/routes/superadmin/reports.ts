import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const router = Router();
router.use(requireRole(["SUPERADMIN"]));

const statusMap = ["PENDING", "IN_PROGRESS", "REJECTED", "RESOLVED"] as const;

// GET /superadmin/reports?page=1
router.get("/", async (req: any, res) => {
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 20;
  const skip = (page - 1) * take;

  const reports = await prisma.transactionReport.findMany({
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      orderId: true,
      category: true,
      status: true,
      detail: true,
      proofUrl: true,
      createdAt: true,
      reporter: { select: { id: true, username: true, email: true, phone: true, role: true } },
      order: {
        select: {
          id: true,
          customer: { select: { id: true, username: true, email: true, phone: true } },
          driver: { select: { id: true, username: true, email: true, phone: true } },
          store: { select: { id: true, username: true, email: true, phone: true } },
        },
      },
    },
  });

  return res.json({ ok: true, data: { reports, page, perPage: take } });
});

// PATCH /superadmin/reports/:id/status
router.patch("/:id/status", async (req: any, res) => {
  const nextStatus = String(req.body.status || "").toUpperCase();
  if (!statusMap.includes(nextStatus as any)) {
    return res.status(400).json({ ok: false, error: { message: "Status tidak valid" } });
  }

  const report = await prisma.transactionReport.update({
    where: { id: req.params.id },
    data: { status: nextStatus as any },
    select: { id: true, status: true },
  });

  return res.json({ ok: true, data: { report } });
});

export default router;
