import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/auth";

const router = Router();
router.use(requireRole(["SUPERADMIN", "ADMIN"]));

async function addBalance(userId: string, amount: number, description?: string, referenceId?: string) {
  await prisma.ticketBalance.upsert({
    where: { userId },
    update: { balance: { increment: amount } },
    create: { userId, balance: amount },
  });
  await prisma.ticketTransaction.create({
    data: {
      userId,
      type: "GRANT_INITIAL",
      amount,
      description: description ?? "Grant",
      referenceId,
    },
  });
}

// GET orders
router.get("/orders", async (_req, res) => {
  const orders = await prisma.ticketOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, username: true, email: true, role: true } } },
  });
  return res.json({ ok: true, data: { orders } });
});

// POST /admin/tickets/orders/:id/mark-paid
router.post("/orders/:id/mark-paid", async (req, res) => {
  const orderId = req.params.id;
  const order = await prisma.ticketOrder.findUnique({ where: { id: orderId } });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });
  if (order.status === "PAID") return res.json({ ok: true, data: { order } });

  await prisma.$transaction([
    prisma.ticketOrder.update({ where: { id: orderId }, data: { status: "PAID", paidAt: new Date() } }),
    prisma.ticketBalance.upsert({
      where: { userId: order.userId },
      update: { balance: { increment: order.quantity } },
      create: { userId: order.userId, balance: order.quantity },
    }),
    prisma.ticketTransaction.create({
      data: {
        userId: order.userId,
        type: "PURCHASE",
        amount: order.quantity,
        description: `Order ${order.id} dibayar`,
        referenceId: order.id,
      },
    }),
  ]);

  const updated = await prisma.ticketOrder.findUnique({ where: { id: orderId } });
  return res.json({ ok: true, data: { order: updated } });
});

// POST /admin/tickets/grant-initial { userId, amount? }
router.post("/grant-initial", async (req, res) => {
  const schema = z.object({
    userId: z.string().min(1),
    amount: z.coerce.number().int().positive().default(3),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  const { userId, amount } = parsed.data;

  await addBalance(userId, amount, "Grant awal", "GRANT");
  return res.json({ ok: true, data: { userId, amount } });
});

// GET /admin/tickets/balance/:userId
router.get("/balance/:userId", async (req, res) => {
  const userId = req.params.userId;
  const bal = await prisma.ticketBalance.findUnique({ where: { userId } });
  const tx = await prisma.ticketTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return res.json({ ok: true, data: { balance: bal?.balance ?? 0, transactions: tx } });
});

export default router;
