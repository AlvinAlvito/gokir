import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const router = Router();
router.use(requireRole(["SUPERADMIN"]));

// GET /superadmin/orders?page=1&q=search
router.get("/", async (req: any, res) => {
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 20;
  const skip = (page - 1) * take;
  const q = String(req.query.q || "").trim();

  const where = q
    ? {
        OR: [
          { id: { contains: q } },
          { customer: { username: { contains: q } } },
          { driver: { username: { contains: q } } },
          { store: { username: { contains: q } } },
          { store: { storeProfile: { storeName: { contains: q } } } },
        ],
      }
    : {};

  const orders = await prisma.customerOrder.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      status: true,
      orderType: true,
      paymentMethod: true,
      quantity: true,
      createdAt: true,
      customer: { select: { id: true, username: true, email: true, phone: true } },
      driver: { select: { id: true, username: true, email: true, phone: true } },
      store: { select: { id: true, username: true, email: true, phone: true, storeProfile: { select: { storeName: true } } } },
    },
  });

  return res.json({ ok: true, data: { orders, page, perPage: take } });
});

export default router;
