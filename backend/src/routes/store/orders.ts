import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { emitOrdersChanged } from "@/lib/socket";
import { z } from "zod";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
router.use(requireRole(["STORE"]));

const parseNote = (note?: string | null) => {
  const proofsPickup: string[] = [];
  const proofsDelivery: string[] = [];
  let mapUrl: string | null = null;
  let cleaned = note || "";
  if (note) {
    const mapR = /Maps:\s*(https?:\S+)/i;
    const pickupR = /PickupProof:\s*([^\n,;]+)/gi;
    const deliveryR = /DeliveryProof:\s*([^\n,;]+)/gi;
    const mapM = note.match(mapR);
    if (mapM) mapUrl = mapM[1];
    let m;
    while ((m = pickupR.exec(note))) {
      const target = m[1]?.trim().replace(/,+$/, "");
      if (target) proofsPickup.push(target);
    }
    while ((m = deliveryR.exec(note))) {
      const target = m[1]?.trim().replace(/,+$/, "");
      if (target) proofsDelivery.push(target);
    }
    cleaned = cleaned
      .replace(/PickupProof:[^\n]*/gi, "")
      .replace(/DeliveryProof:[^\n]*/gi, "")
      .replace(/Maps:\s*https?:\S+/gi, "")
      .trim();
  }
  return { noteText: cleaned, mapUrl, proofsPickup, proofsDelivery };
};

const withParsedNote = <T extends { note?: string | null }>(order: T) => ({
  ...order,
  ...parseNote(order.note),
});

const reportUploadDir = path.join(process.cwd(), "uploads", "report-proofs");
if (!fs.existsSync(reportUploadDir)) fs.mkdirSync(reportUploadDir, { recursive: true });
const reportStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, reportUploadDir),
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname);
    const guessedExt =
      rawExt ||
      (file.mimetype === "image/jpeg" ? ".jpg" :
      file.mimetype === "image/png" ? ".png" :
      file.mimetype === "image/webp" ? ".webp" :
      file.mimetype === "image/gif" ? ".gif" : "");
    const base = path.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${base || "proof"}-${Date.now()}${guessedExt}`);
  },
});
const reportUpload = multer({
  storage: reportStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) return cb(new Error("Hanya file gambar yang diperbolehkan"));
    cb(null, true);
  },
});

// GET /store/orders -> semua order untuk toko (storeId = user.id)
router.get("/", async (req: any, res) => {
  const storeId = req.user.id;
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 3;
  const skip = (page - 1) * take;
  const orders = await prisma.customerOrder.findMany({
    where: { storeId, status: { notIn: ["COMPLETED", "REJECTED"] } },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      status: true,
      orderType: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      customer: { select: { id: true, username: true, email: true, phone: true } },
      driver: { select: { id: true, username: true, email: true, phone: true } },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });
  return res.json({ ok: true, data: { orders: orders.map(withParsedNote), page, perPage: take } });
});

// GET /store/orders/history -> seluruh riwayat transaksi toko (paginasi)
router.get("/history", async (req: any, res) => {
  const storeId = req.user.id;
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 3;
  const skip = (page - 1) * take;
  const orders = await prisma.customerOrder.findMany({
    where: { storeId },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      status: true,
      orderType: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      customer: { select: { id: true, username: true, email: true, phone: true } },
      driver: { select: { id: true, username: true, email: true, phone: true } },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });
  return res.json({ ok: true, data: { orders: orders.map(withParsedNote), page, perPage: take } });
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
  reason: z.string().max(255).optional(),
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
    select: { id: true, note: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });

  if (parsed.data.status !== "REJECTED") {
    const ticket = await prisma.ticketBalance.findUnique({ where: { userId: storeId }, select: { balance: true } });
    if (!ticket || ticket.balance < 1) {
      return res.status(400).json({ ok: false, error: { message: "Tiket tidak mencukupi, silakan top up tiket." } });
    }
  }

  let newNote = null as string | null;
  if (parsed.data.status === "REJECTED") {
    const reason = parsed.data.reason?.trim() || "Pesanan ditolak toko";
    newNote = [order.note || "", `RejectReason: ${reason}`].filter(Boolean).join("\n");
  }

  const updated = await prisma.customerOrder.update({
    where: { id: req.params.id },
    data: { status: parsed.data.status, note: newNote ?? order.note },
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

  if (parsed.data.status === "SEARCHING_DRIVER") {
    emitOrdersChanged();
  }
  return res.json({ ok: true, data: { order: updated } });
});

// POST /store/orders/:id/report -> laporkan transaksi oleh store
router.post("/:id/report", reportUpload.single("proof"), async (req: any, res) => {
  const storeId = req.user.id;
  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, storeId },
    select: { id: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });

  const categoryRaw = String(req.body.category || "").toUpperCase();
  const validCategories = ["DRIVER", "CUSTOMER", "STORE"];
  if (!validCategories.includes(categoryRaw)) {
    return res.status(400).json({ ok: false, error: { message: "Kategori laporan tidak valid" } });
  }
  const detail = String(req.body.detail || "").trim();
  if (!detail) return res.status(400).json({ ok: false, error: { message: "Detail permasalahan wajib diisi" } });

  const existingCount = await prisma.transactionReport.count({ where: { orderId: order.id, reporterId: storeId } });
  if (existingCount >= 2) {
    return res.status(429).json({ ok: false, error: { message: "Batas laporan untuk transaksi ini telah tercapai" } });
  }

  const proofPath = req.file ? `/uploads/report-proofs/${req.file.filename}` : null;
  const report = await prisma.transactionReport.create({
    data: {
      orderId: order.id,
      reporterId: storeId,
      category: categoryRaw as any,
      detail,
      proofUrl: proofPath || undefined,
    },
    select: { id: true, category: true, detail: true, proofUrl: true, createdAt: true },
  });

  return res.json({ ok: true, data: { report } });
});

export default router;
