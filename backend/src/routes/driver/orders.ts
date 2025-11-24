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
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${base || "proof"}-${Date.now()}${ext}`);
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
  return res.json({ ok: true, data: { order } });
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

  return res.json({ ok: true, data: { order: updated, proofUrl: proofPath } });
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

  return res.json({ ok: true, data: { order: updated, proofUrl: proofPath } });
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
  return res.json({ ok: true, data: { order } });
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
