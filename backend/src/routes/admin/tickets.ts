import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole, verifyPassword } from "@/lib/auth";

const router = Router();

// Admin/Superadmin boleh lihat order dan mark paid
router.use(requireRole(["ADMIN", "SUPERADMIN"]));

const grantSchema = z.object({
  userId: z.string().min(1),
  amount: z.coerce.number().int().positive(),
  password: z.string().min(3),
});

// Daftar order
router.get("/orders", async (_req, res) => {
  const orders = await prisma.ticketOrder.findMany({
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, username: true, email: true, role: true } } },
  });
  return res.json({ ok: true, data: { orders } });
});

// Riwayat grant manual (oleh admin/superadmin)
router.get("/grants", async (_req, res) => {
  const tx = await prisma.ticketTransaction.findMany({
    where: { type: "GRANT_INITIAL" },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, username: true, email: true, role: true } },
    },
    take: 200,
  });
  return res.json({ ok: true, data: { transactions: tx } });
});

// Daftar transaksi grant manual untuk laporan
router.get("/grants", async (_req, res) => {
  const tx = await prisma.ticketTransaction.findMany({
    where: { type: "GRANT_INITIAL" },
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { id: true, username: true, email: true, role: true } } },
  });
  return res.json({ ok: true, data: { transactions: tx } });
});

// Mark paid
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

// Grant manual (butuh password superadmin)
router.post("/grant", async (req: any, res) => {
  const parsed = grantSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  }

  const { userId, amount, password } = parsed.data;

  // validasi password milik admin yang sedang login
  const admin = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!admin?.passwordHash || !(await verifyPassword(password, admin.passwordHash))) {
    return res.status(401).json({ ok: false, error: { message: "Password superadmin salah" } });
  }

  // target hanya DRIVER atau STORE
  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!target || !["DRIVER", "STORE"].includes(target.role)) {
    return res.status(400).json({ ok: false, error: { message: "Target bukan driver/store atau tidak ditemukan" } });
  }

  await prisma.$transaction([
    prisma.ticketBalance.upsert({
      where: { userId },
      update: { balance: { increment: amount } },
      create: { userId, balance: amount },
    }),
    prisma.ticketTransaction.create({
      data: {
        userId,
        type: "GRANT_INITIAL",
        amount,
        description: `Grant manual oleh ${req.user.id}`,
        referenceId: req.user.id,
      },
    }),
  ]);

  const balance = await prisma.ticketBalance.findUnique({ where: { userId } });
  return res.json({ ok: true, data: { userId, balance: balance?.balance ?? 0 } });
});

// Daftar penerima (driver/store) untuk dropdown
router.get("/recipients", async (req, res) => {
  const role = (req.query.role as string)?.toUpperCase();
  if (!["DRIVER", "STORE"].includes(role)) {
    return res.status(400).json({ ok: false, error: { message: "Role harus DRIVER atau STORE" } });
  }
  const users = await prisma.user.findMany({
    where: { role: role as any },
    select: { id: true, username: true, email: true, role: true },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ ok: true, data: { users } });
});

export default router;
