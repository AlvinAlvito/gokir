import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import multer from "multer";
import path from "path";
import fs from "fs";

const router = Router();
router.use(requireRole(["DRIVER"]));

const uploadDir = path.join(process.cwd(), "uploads", "order-proofs");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
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
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Hanya file gambar yang diperbolehkan"));
    }
    cb(null, true);
  },
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

// GET /driver/orders/available
router.get("/available", async (req: any, res) => {
  const driverId = req.user.id as string;

  const availability = await prisma.driverAvailability.findUnique({
    where: { userId: driverId },
    select: { region: true, status: true },
  });

  if (!availability) {
    return res.status(400).json({ ok: false, error: { message: "Availability driver belum di-set." } });
  }

  const orders = await prisma.customerOrder.findMany({
    where: {
      status: "SEARCHING_DRIVER",
      driverId: null,
      store: {
        storeAvailability: {
          // hanya ambil order toko dengan region sama
          region: availability.region,
          status: "ACTIVE",
        },
      },
    },
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
      store: {
        select: {
          id: true,
          storeProfile: { select: { storeName: true, photoUrl: true, address: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });

  // Cek apakah driver punya order aktif (DRIVER_ASSIGNED atau ON_DELIVERY)
  const active = await prisma.customerOrder.findFirst({
    where: {
      driverId,
      status: { in: ["DRIVER_ASSIGNED", "ON_DELIVERY"] },
    },
    select: { id: true },
  });

  return res.json({ ok: true, data: { orders, hasActive: !!active } });
});

// GET /driver/orders/active -> ambil order aktif milik driver (status belum selesai/dibatalkan) terbaru
router.get("/active", async (req: any, res) => {
  const driverId = req.user.id as string;
  const order = await prisma.customerOrder.findFirst({
    where: {
      driverId,
      status: {
        notIn: ["COMPLETED", "CANCELLED", "REJECTED"],
      },
    },
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
      store: {
        select: {
          id: true,
          storeProfile: { select: { storeName: true, photoUrl: true, address: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });

  if (!order) return res.status(404).json({ ok: false, error: { message: "Tidak ada order aktif" } });
  return res.json({ ok: true, data: { order: withParsedNote(order) } });
});

// POST /driver/orders/:id/pickup -> upload bukti dan ubah status jadi ON_DELIVERY
router.post("/:id/pickup", upload.single("proof"), async (req: any, res) => {
  const driverId = req.user.id as string;

  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, driverId, status: "DRIVER_ASSIGNED" },
    select: { id: true, note: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan atau status tidak sesuai" } });

  const proofPath = req.file ? `/uploads/order-proofs/${req.file.filename}` : undefined;
  const combinedNote = proofPath ? [order.note || "", `PickupProof: ${proofPath}`].filter(Boolean).join("\n") : order.note || null;

  const updated = await prisma.customerOrder.update({
    where: { id: req.params.id },
    data: {
      status: "ON_DELIVERY",
      note: combinedNote || null,
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
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true, photoUrl: true, address: true } } } },
      customer: { select: { id: true, username: true, email: true, phone: true } },
    },
  });

  return res.json({ ok: true, data: { order: withParsedNote(updated), proofUrl: proofPath } });
});

// POST /driver/orders/:id/complete -> bukti serah terima dan ubah status jadi COMPLETED, kurangi tiket driver & store
router.post("/:id/complete", upload.single("proof"), async (req: any, res) => {
  const driverId = req.user.id as string;

  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, driverId, status: "ON_DELIVERY" },
    select: {
      id: true,
      note: true,
      storeId: true,
    },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan atau status tidak sesuai" } });

  const proofPath = req.file ? `/uploads/order-proofs/${req.file.filename}` : undefined;
  const combinedNote = proofPath ? [order.note || "", `DeliveryProof: ${proofPath}`].filter(Boolean).join("\n") : order.note || null;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedOrder = await tx.customerOrder.update({
      where: { id: order.id },
      data: { status: "COMPLETED", note: combinedNote || null },
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
        customer: { select: { id: true, username: true, email: true, phone: true } },
      },
    });

    // kurangi tiket driver
    await tx.ticketBalance.updateMany({
      where: { userId: driverId },
      data: { balance: { decrement: 1 } },
    });
    // kurangi tiket store jika ada
    if (order.storeId) {
      await tx.ticketBalance.updateMany({
        where: { userId: order.storeId },
        data: { balance: { decrement: 1 } },
      });
    }

    return updatedOrder;
  });

  return res.json({ ok: true, data: { order: withParsedNote(updated), proofUrl: proofPath } });
});

// POST /driver/orders/:id/report -> laporkan transaksi oleh driver
router.post("/:id/report", reportUpload.single("proof"), async (req: any, res) => {
  const driverId = req.user.id as string;
  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, driverId },
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

  const existingCount = await prisma.transactionReport.count({ where: { orderId: order.id, reporterId: driverId } });
  if (existingCount >= 2) {
    return res.status(429).json({ ok: false, error: { message: "Batas laporan untuk transaksi ini telah tercapai" } });
  }

  const proofPath = req.file ? `/uploads/report-proofs/${req.file.filename}` : null;
  const report = await prisma.transactionReport.create({
    data: {
      orderId: order.id,
      reporterId: driverId,
      category: categoryRaw as any,
      detail,
      proofUrl: proofPath || undefined,
    },
    select: { id: true, category: true, detail: true, proofUrl: true, createdAt: true },
  });

  return res.json({ ok: true, data: { report } });
});

// GET /driver/orders/history -> daftar riwayat order driver
router.get("/history", async (req: any, res) => {
  const driverId = req.user.id as string;
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 3;
  const skip = (page - 1) * take;

  const orders = await prisma.customerOrder.findMany({
    where: { driverId },
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
      store: {
        select: {
          id: true,
          storeProfile: { select: { storeName: true, photoUrl: true, address: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });

  return res.json({ ok: true, data: { orders: orders.map(withParsedNote), page, perPage: take } });
});

// GET /driver/orders/:id -> detail order milik driver ini (atau status searching)
router.get("/:id", async (req: any, res) => {
  const driverId = req.user.id as string;
  const order = await prisma.customerOrder.findFirst({
    where: {
      id: req.params.id,
      OR: [
        { driverId },
        { status: "SEARCHING_DRIVER", driverId: null }, // bisa lihat detail sebelum claim jika perlu
      ],
    },
    select: {
      id: true,
      status: true,
      orderType: true,
      paymentMethod: true,
      quantity: true,
      note: true,
      createdAt: true,
      customer: { select: { id: true, username: true, email: true, phone: true } },
      store: {
        select: {
          id: true,
          storeProfile: { select: { storeName: true, photoUrl: true, address: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });

  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });
  return res.json({ ok: true, data: { order: withParsedNote(order) } });
});

// GET /driver/orders/active -> ambil order aktif milik driver (status belum selesai/dibatalkan) terbaru
router.get("/active", async (req: any, res) => {
  const driverId = req.user.id as string;
  const order = await prisma.customerOrder.findFirst({
    where: {
      driverId,
      status: {
        notIn: ["COMPLETED", "CANCELLED", "REJECTED"],
      },
    },
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
      store: {
        select: {
          id: true,
          storeProfile: { select: { storeName: true, photoUrl: true, address: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupAddress: true,
      dropoffAddress: true,
    },
  });

  if (!order) return res.status(404).json({ ok: false, error: { message: "Tidak ada order aktif" } });
  return res.json({ ok: true, data: { order } });
});

// POST /driver/orders/:id/claim
router.post("/:id/claim", async (req: any, res) => {
  const driverId = req.user.id as string;

  const order = await prisma.customerOrder.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      status: true,
      driverId: true,
      store: {
        select: {
          storeAvailability: { select: { region: true, status: true } },
        },
      },
    },
  });

  if (!order || order.status !== "SEARCHING_DRIVER" || order.driverId) {
    return res.status(400).json({ ok: false, error: { message: "Order tidak tersedia untuk diambil." } });
  }

  const driverAvail = await prisma.driverAvailability.findUnique({
    where: { userId: driverId },
    select: { region: true },
  });

  if (!driverAvail || order.store?.storeAvailability?.region !== driverAvail.region) {
    return res.status(400).json({ ok: false, error: { message: "Wilayah tidak cocok atau driver tidak memiliki data availability." } });
  }

  const updated = await prisma.customerOrder.update({
    where: { id: req.params.id },
    data: { driverId, status: "DRIVER_ASSIGNED" },
    select: {
      id: true,
      status: true,
      driverId: true,
    },
  });

  return res.json({ ok: true, data: { order: updated } });
});

export default router;
