import { Router } from "express";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const router = Router();

router.post("/midtrans", async (req, res) => {
  try {
    const serverKey = process.env.MIDTRANS_SERVER_KEY;
    if (!serverKey) return res.status(500).json({ ok: false, error: { message: "MIDTRANS_SERVER_KEY belum diset" } });

    const {
      order_id,
      transaction_status,
      fraud_status,
      status_code,
      gross_amount,
      signature_key,
    } = req.body || {};

    if (!order_id) return res.status(400).json({ ok: false, error: { message: "order_id tidak ada" } });

    const expected = crypto
      .createHash("sha512")
      .update(order_id + status_code + gross_amount + serverKey)
      .digest("hex");

    if (expected !== signature_key) {
      return res.status(400).json({ ok: false, error: { message: "Signature tidak valid" } });
    }

    const order = await prisma.ticketOrder.findUnique({ where: { midtransOrderId: order_id } });
    if (!order) {
      // unknown order, ignore
      return res.json({ ok: true, message: "Order tidak ditemukan, diabaikan" });
    }

    const success =
      transaction_status === "settlement" ||
      (transaction_status === "capture" && fraud_status === "accept");

    if (success && order.status !== "PAID") {
      await prisma.$transaction([
        prisma.ticketOrder.update({
          where: { id: order.id },
          data: {
            status: "PAID",
            paidAt: new Date(),
            paymentStatusRaw: transaction_status,
          },
        }),
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
            description: `Midtrans order ${order.midtransOrderId}`,
            referenceId: order.id,
          },
        }),
      ]);
    } else if (!success && transaction_status === "cancel") {
      await prisma.ticketOrder.update({
        where: { id: order.id },
        data: { status: "CANCELLED", paymentStatusRaw: transaction_status },
      });
    } else {
      // simpan status mentah
      await prisma.ticketOrder.update({
        where: { id: order.id },
        data: { paymentStatusRaw: transaction_status },
      });
    }

    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { message: e?.message || "Server error" } });
  }
});

export default router;
