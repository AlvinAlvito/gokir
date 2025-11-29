import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth, requireRole } from "@/lib/auth";
import { emitOrdersChanged } from "@/lib/socket";

const router = Router();
router.use(requireAuth, requireRole(["CUSTOMER"]));

// POST /customer/ratings/:orderId
router.post("/:orderId", async (req: any, res) => {
  const user = req.user!;
  const orderId = req.params.orderId;
  const driverRating = req.body.driverRating ? Number(req.body.driverRating) : null;
  const storeRating = req.body.storeRating ? Number(req.body.storeRating) : null;
  if (!orderId) return res.status(400).json({ ok: false, error: { message: "Order tidak valid" } });
  if (!driverRating || driverRating < 1 || driverRating > 5) {
    return res.status(400).json({ ok: false, error: { message: "Rating driver 1-5 wajib diisi" } });
  }

  const order = await prisma.customerOrder.findFirst({
    where: { id: orderId, customerId: user.id },
    select: { id: true, status: true, orderType: true, driverId: true, storeId: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });
  if (order.status !== "COMPLETED") {
    return res.status(400).json({ ok: false, error: { message: "Rating hanya bisa diberikan setelah pesanan selesai" } });
  }

  const existing = await prisma.orderRating.findUnique({ where: { orderId } });
  if (existing) {
    return res.status(400).json({ ok: false, error: { message: "Rating untuk transaksi ini sudah pernah dikirim." } });
  }

  const rating = await prisma.orderRating.create({
    data: {
      orderId,
      customerId: user.id,
      driverId: order.driverId || null,
      storeId: order.storeId || null,
      driverRating,
      storeRating: order.orderType !== "FOOD_EXISTING_STORE" ? null : storeRating,
    },
  });

  emitOrdersChanged();
  return res.json({ ok: true, data: { rating } });
});

export default router;
