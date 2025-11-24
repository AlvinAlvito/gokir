import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const router = Router();
router.use(requireRole(["STORE"]));

// GET /store/orders -> semua order untuk toko (storeId = user.id)
router.get("/", async (req: any, res) => {
  const storeId = req.user.id;
  const orders = await prisma.customerOrder.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      orderType: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      customer: { select: { id: true, username: true, email: true, phone: true } },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });
  return res.json({ ok: true, data: { orders } });
});

const statusSchema = z.object({
  status: z.enum([
    "WAITING_STORE_CONFIRM",
    "REJECTED",
    "CONFIRMED_COOKING",
    "SEARCHING_DRIVER",
    "DRIVER_ASSIGNED",
    "ON_DELIVERY",
    "COMPLETED",
    "CANCELLED",
  ]),
});

// PATCH /store/orders/:id/status { status }
router.patch("/:id/status", async (req: any, res) => {
  const storeId = req.user.id;
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  }

  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, storeId },
    select: { id: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });

  const updated = await prisma.customerOrder.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      orderType: true,
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
    },
  });

  return res.json({ ok: true, data: { order: updated } });
});

export default router;
