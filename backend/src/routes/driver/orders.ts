import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import { emitOrdersChanged } from "@/lib/socket";

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

const regionMatch = (orderRegion?: any, driverRegion?: any) => {
  if (!orderRegion || !driverRegion) return false;
  if (orderRegion === "WILAYAH_LAINNYA" || driverRegion === "WILAYAH_LAINNYA") return true;
  return orderRegion === driverRegion;
};

const haversineKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};

const osrmDistanceKm = async (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false&alternatives=false&steps=false`;
    const resp = await fetch(url);
    const j: any = await resp.json();
    if (resp.ok && j?.code === "Ok" && j?.routes?.[0]?.distance) {
      return j.routes[0].distance / 1000;
    }
  } catch {
    /* ignore */
  }
  return null;
};

const computeFare = (distance: number | null | undefined, pricing: any) => {
  if (!distance) return null;
  if (!pricing) return Math.round(Math.max(4000, 4000 + distance * 2000));
  if (distance < 1) return pricing.under1Km;
  if (distance < 1.5) return pricing.km1To1_5;
  if (distance < 2) return pricing.km1_5To2;
  if (distance < 2.5) return pricing.km2To2_5;
  if (distance < 3) return pricing.km2_5To3;
  return pricing.km2_5To3 + Math.max(0, distance - 3) * pricing.above3PerKm;
};

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

  const rawOrders = await prisma.customerOrder.findMany({
    where: {
      status: "SEARCHING_DRIVER",
      driverId: null,
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
          storeAvailability: { select: { region: true, status: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupRegion: true,
      dropoffRegion: true,
      customRegion: true,
      pickupAddress: true,
      dropoffAddress: true,
      pickupMap: true,
      dropoffMap: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
    },
  });

  const orders = rawOrders.filter((o) => {
    if (o.store?.storeAvailability) {
      const sa = o.store.storeAvailability;
      if (sa.status !== "ACTIVE") return false;
      return regionMatch(sa.region, availability.region);
    }
    if (o.orderType === "RIDE") {
      return regionMatch(o.pickupRegion, availability.region);
    }
    if (o.orderType === "FOOD_CUSTOM_STORE") {
      return regionMatch(o.customRegion, availability.region);
    }
    return false;
  });

  // Cek apakah driver punya order aktif (DRIVER_ASSIGNED atau ON_DELIVERY)
  const active = await prisma.customerOrder.findFirst({
    where: {
      driverId,
      status: { in: ["DRIVER_ASSIGNED", "ON_DELIVERY"] },
    },
    select: { id: true },
  });

  const pricing = await prisma.deliveryPricing.findFirst({ orderBy: { createdAt: "desc" } });

  const enriched = await Promise.all(
    orders.map(async (o) => {
      let distanceKm: number | null = null;
      if (o.pickupLat && o.pickupLng && o.dropoffLat && o.dropoffLng) {
        distanceKm = await osrmDistanceKm({ lat: o.pickupLat, lng: o.pickupLng }, { lat: o.dropoffLat, lng: o.dropoffLng });
        if (distanceKm == null) distanceKm = haversineKm({ lat: o.pickupLat, lng: o.pickupLng }, { lat: o.dropoffLat, lng: o.dropoffLng }) * 1.3;
        distanceKm = Number(distanceKm.toFixed(2));
      }
      const estimatedFare = computeFare(distanceKm, pricing);
      return { ...o, distanceKm, estimatedFare };
    })
  );

  return res.json({ ok: true, data: { orders: enriched, hasActive: !!active } });
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
          storeProfile: { select: { storeName: true, photoUrl: true, address: true, mapsUrl: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupRegion: true,
      dropoffRegion: true,
      pickupAddress: true,
      dropoffAddress: true,
      pickupMap: true,
      dropoffMap: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
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
    where: { id: req.params.id, driverId, status: { in: ["ON_DELIVERY", "DRIVER_ASSIGNED"] } },
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
          storeProfile: { select: { storeName: true, photoUrl: true, address: true, mapsUrl: true } },
          storeAvailability: { select: { region: true } },
        },
      },
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      customStoreName: true,
      customStoreAddress: true,
      pickupRegion: true,
      dropoffRegion: true,
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
      pickupRegion: true,
      dropoffRegion: true,
      pickupAddress: true,
      dropoffAddress: true,
      pickupMap: true,
      dropoffMap: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
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
      pickupRegion: true,
      dropoffRegion: true,
      pickupAddress: true,
      dropoffAddress: true,
      pickupMap: true,
      dropoffMap: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
    },
  });

  if (!order) return res.status(404).json({ ok: false, error: { message: "Tidak ada order aktif" } });
  return res.json({ ok: true, data: { order: withParsedNote(order) } });
});

// PATCH /driver/orders/:id/cancel -> batalkan pesanan custom (toko luar) saat DRIVER_ASSIGNED
router.patch("/:id/cancel", async (req: any, res) => {
  const driverId = req.user.id as string;
  const reasonRaw = String(req.body.reason || "").trim().toUpperCase();
  const validReasons = [
    "TOKO_TIDAK_DITEMUKAN",
    "TOKO_TUTUP",
    "SALDO_DRIVER_KURANG",
    "CUSTOMER_MEMINTA_BATAL",
    "DRIVER_TIDAK_BISA",
    "LAINNYA",
  ];
  if (!validReasons.includes(reasonRaw)) {
    return res.status(400).json({ ok: false, error: { message: "Alasan batal tidak valid" } });
  }

  const order = await prisma.customerOrder.findFirst({
    where: { id: req.params.id, driverId },
    select: { id: true, status: true, orderType: true, note: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });
  if (!(order.orderType === "FOOD_CUSTOM_STORE" && order.status === "DRIVER_ASSIGNED")) {
    return res.status(400).json({ ok: false, error: { message: "Pesanan tidak bisa dibatalkan pada status ini" } });
  }

  const reasonText = {
    TOKO_TIDAK_DITEMUKAN: "Toko tidak ditemukan",
    TOKO_TUTUP: "Toko tutup",
    SALDO_DRIVER_KURANG: "Saldo driver kurang",
    CUSTOMER_MEMINTA_BATAL: "Customer meminta dibatalkan",
    DRIVER_TIDAK_BISA: "Driver mendadak tidak bisa bekerja",
    LAINNYA: "Lainnya",
  }[reasonRaw];

  const newNote = `${order.note || ""}\nDriverCancelReason: ${reasonText}`.trim();
  const updated = await prisma.customerOrder.update({
    where: { id: order.id },
    data: { status: "CANCELLED", note: newNote },
    select: { id: true, status: true, note: true },
  });
  emitOrdersChanged();
  return res.json({ ok: true, data: { order: updated } });
});

// POST /driver/orders/:id/claim
router.post("/:id/claim", async (req: any, res) => {
  const driverId = req.user.id as string;

  const ticket = await prisma.ticketBalance.findUnique({ where: { userId: driverId }, select: { balance: true } });
  if (!ticket || ticket.balance < 1) {
    return res.status(400).json({ ok: false, error: { message: "Tiket tidak mencukupi, silakan top up tiket." } });
  }

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
      customRegion: true,
      orderType: true,
      pickupRegion: true,
    },
  });

  if (!order || order.status !== "SEARCHING_DRIVER" || order.driverId) {
    return res.status(400).json({ ok: false, error: { message: "Order tidak tersedia untuk diambil." } });
  }

  const driverAvail = await prisma.driverAvailability.findUnique({
    where: { userId: driverId },
    select: { region: true },
  });

  const orderRegion = order.orderType === "RIDE"
    ? order.pickupRegion
    : (order.store?.storeAvailability?.region || order.customRegion);
  if (!driverAvail || !orderRegion || !regionMatch(orderRegion, driverAvail.region)) {
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

  emitOrdersChanged();
  return res.json({ ok: true, data: { order: updated } });
});

export default router;
