import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
router.use(requireRole(["CUSTOMER"]));

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

const createSchema = z.object({
  orderType: z.enum(["FOOD_EXISTING_STORE", "FOOD_CUSTOM_STORE", "RIDE"]),
  storeProfileId: z.string().optional(),
  menuItemId: z.string().optional(),
  quantity: z.coerce.number().int().min(1).optional(),
  note: z.string().max(255).optional(),
  paymentMethod: z.enum(["CASH", "QRIS"]).default("CASH"),
  customStoreName: z.string().optional(),
  customStoreAddress: z.string().optional(),
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional(),
});

// POST /customer/orders
router.post("/", async (req: any, res) => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  }

  const {
    orderType,
    storeProfileId,
    menuItemId,
    quantity,
    note,
    paymentMethod,
    customStoreName,
    customStoreAddress,
    pickupAddress,
    dropoffAddress,
  } = parsed.data;

  let storeUserId: string | undefined;
  let menuItemValidated: { id: string; name: string; price: number; promoPrice: number | null } | undefined;
  let initialStatus: any = "WAITING_STORE_CONFIRM";

  if (orderType === "FOOD_EXISTING_STORE") {
    if (!storeProfileId || !menuItemId || !quantity) {
      return res.status(400).json({ ok: false, error: { message: "storeProfileId, menuItemId, quantity wajib" } });
    }
    const storeProfile = await prisma.storeProfile.findUnique({
      where: { id: storeProfileId },
      select: { userId: true, status: true },
    });
    if (!storeProfile || storeProfile.status !== "APPROVED") {
      return res.status(400).json({ ok: false, error: { message: "Toko tidak tersedia" } });
    }
    storeUserId = storeProfile.userId;
    const item = await prisma.menuItem.findUnique({
      where: { id: menuItemId },
      select: { id: true, storeId: true, isAvailable: true, isActive: true, name: true, price: true, promoPrice: true },
    });
    if (!item || item.storeId !== storeUserId || !item.isAvailable || !item.isActive) {
      return res.status(400).json({ ok: false, error: { message: "Menu tidak tersedia" } });
    }
    menuItemValidated = { id: item.id, name: item.name, price: item.price, promoPrice: item.promoPrice ?? null };
  } else if (orderType === "FOOD_CUSTOM_STORE") {
    if (!customStoreName || !customStoreAddress || !quantity) {
      return res.status(400).json({ ok: false, error: { message: "Nama & alamat toko custom serta quantity wajib" } });
    }
    // store/menuItem dibiarkan null
  } else if (orderType === "RIDE") {
    if (!pickupAddress || !dropoffAddress) {
      return res.status(400).json({ ok: false, error: { message: "Pickup & dropoff wajib" } });
    }
    initialStatus = "SEARCHING_DRIVER";
  }

  const order = await prisma.customerOrder.create({
    data: {
      customerId: user.id,
      storeId: storeUserId,
      menuItemId: menuItemValidated?.id,
      quantity: quantity ?? null,
      note,
      paymentMethod,
      status: initialStatus,
      orderType,
      customStoreName,
      customStoreAddress,
      pickupAddress,
      dropoffAddress,
    },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      orderType: true,
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true } } } },
    },
  });

  return res.status(201).json({ ok: true, data: { order: withParsedNote(order) } });
});

// POST /customer/orders/:id/report -> laporkan transaksi oleh customer
router.post("/:id/report", reportUpload.single("proof"), async (req: any, res) => {
  const user = req.user!;
  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, customerId: user.id },
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

  const existingCount = await prisma.transactionReport.count({ where: { orderId: order.id, reporterId: user.id } });
  if (existingCount >= 2) {
    return res.status(429).json({ ok: false, error: { message: "Batas laporan untuk transaksi ini telah tercapai" } });
  }

  const proofPath = req.file ? `/uploads/report-proofs/${req.file.filename}` : null;
  const report = await prisma.transactionReport.create({
    data: {
      orderId: order.id,
      reporterId: user.id,
      category: categoryRaw as any,
      detail,
      proofUrl: proofPath || undefined,
    },
    select: { id: true, category: true, detail: true, proofUrl: true, createdAt: true },
  });

  return res.json({ ok: true, data: { report } });
});

// GET /customer/orders
router.get("/", async (req: any, res) => {
  const user = req.user!;
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 3;
  const skip = (page - 1) * take;
  const orders = await prisma.customerOrder.findMany({
    where: { customerId: user.id },
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      orderType: true,
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true } } } },
      driver: { select: { id: true, username: true, email: true, phone: true, driverProfile: { select: { facePhotoUrl: true } } } },
    },
  });
  return res.json({ ok: true, data: { orders: orders.map(withParsedNote), page, perPage: take } });
});

// GET /customer/orders/active -> order aktif (belum selesai/dibatalkan) terbaru
router.get("/active", async (req: any, res) => {
  const user = req.user!;
  const order = await prisma.customerOrder.findFirst({
    where: {
      customerId: user.id,
      status: { notIn: ["COMPLETED", "CANCELLED"] },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      status: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      orderType: true,
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true, photoUrl: true, address: true } } } },
      driver: { select: { id: true, username: true, email: true, phone: true, driverProfile: { select: { facePhotoUrl: true } } } },
    },
  });

  if (!order) return res.status(404).json({ ok: false, error: { message: "Tidak ada order aktif" } });
  return res.json({ ok: true, data: { order: withParsedNote(order) } });
});

export default router;
