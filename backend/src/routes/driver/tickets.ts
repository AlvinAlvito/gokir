import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/auth";

const router = Router();

const MIN_PURCHASE = 5;
const PRICE_PER_TICKET = 1000;

router.use(requireRole(["DRIVER"]));

async function getBalance(userId: string) {
  const bal = await prisma.ticketBalance.findUnique({ where: { userId } });
  return bal?.balance ?? 0;
}

async function addBalance(userId: string, amount: number, type: any, description?: string, referenceId?: string) {
  const bal = await prisma.ticketBalance.upsert({
    where: { userId },
    update: { balance: { increment: amount } },
    create: { userId, balance: amount },
  });
  await prisma.ticketTransaction.create({
    data: {
      userId,
      type,
      amount,
      description,
      referenceId,
    },
  });
  return bal;
}

// GET /driver/tickets
router.get("/", async (req: any, res) => {
  const userId = req.user.id;
  const balance = await getBalance(userId);
  const recent = await prisma.ticketTransaction.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return res.json({ ok: true, data: { balance, transactions: recent } });
});

// POST /driver/tickets/consume { amount }
router.post("/consume", async (req: any, res) => {
  const userId = req.user.id;
  const schema = z.object({ amount: z.coerce.number().int().positive() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  const amount = parsed.data.amount;
  const bal = await prisma.ticketBalance.findUnique({ where: { userId } });
  const current = bal?.balance ?? 0;
  if (current < amount) return res.status(400).json({ ok: false, error: { message: "Tiket tidak cukup" } });

  await prisma.$transaction([
    prisma.ticketBalance.update({ where: { userId }, data: { balance: { decrement: amount } } }),
    prisma.ticketTransaction.create({
      data: { userId, type: "CONSUME", amount: -amount, description: "Konsumsi tiket" },
    }),
  ]);
  const balance = await getBalance(userId);
  return res.json({ ok: true, data: { balance } });
});

// POST /driver/tickets/order { quantity }
router.post("/order", async (req: any, res) => {
  const userId = req.user.id;
  const schema = z.object({ quantity: z.coerce.number().int().min(MIN_PURCHASE) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: `Minimal pembelian ${MIN_PURCHASE} tiket` } });
  }
  const quantity = parsed.data.quantity;
  const total = quantity * PRICE_PER_TICKET;

  const order = await prisma.ticketOrder.create({
    data: {
      userId,
      quantity,
      pricePerTicket: PRICE_PER_TICKET,
      totalAmount: total,
      status: "PENDING",
      paymentMethod: "QRIS",
      paymentPayload: `QRIS|TOTAL=${total}|USER=${userId}|ORDER=${Date.now()}`,
    },
  });

  return res.status(201).json({ ok: true, data: { order } });
});

// GET /driver/tickets/orders
router.get("/orders", async (req: any, res) => {
  const userId = req.user.id;
  const orders = await prisma.ticketOrder.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ ok: true, data: { orders } });
});

export default router;
