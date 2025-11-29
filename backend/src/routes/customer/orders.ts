import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import multer from "multer";
import path from "path";
import fs from "fs";
import fetch from "node-fetch";
import { emitOrdersChanged } from "@/lib/socket";

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

export const getDeliveryPricing = async () => {
  let cfg = await prisma.deliveryPricing.findFirst();
  if (!cfg) {
    cfg = await prisma.deliveryPricing.create({ data: {} });
  }
  return cfg;
};

const orderProofDir = path.join(process.cwd(), "uploads", "order-proofs");
if (!fs.existsSync(orderProofDir)) fs.mkdirSync(orderProofDir, { recursive: true });
const orderStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, orderProofDir),
  filename: (_req, file, cb) => {
    const rawExt = path.extname(file.originalname);
    const guessedExt =
      rawExt ||
      (file.mimetype === "image/jpeg" ? ".jpg" :
      file.mimetype === "image/png" ? ".png" :
      file.mimetype === "image/webp" ? ".webp" :
      file.mimetype === "image/gif" ? ".gif" : "");
    const base = path.basename(file.originalname, rawExt).replace(/[^a-zA-Z0-9-_]/g, "");
    cb(null, `${base || "pickup"}-${Date.now()}${guessedExt}`);
  },
});
const orderUpload = multer({
  storage: orderStorage,
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
  customRegion: z.enum(["KAMPUS_SUTOMO", "KAMPUS_TUNTUNGAN", "KAMPUS_PANCING", "WILAYAH_LAINNYA"]).optional(),
  pickupRegion: z.enum(["KAMPUS_SUTOMO", "KAMPUS_TUNTUNGAN", "KAMPUS_PANCING", "WILAYAH_LAINNYA"]).optional(),
  dropoffRegion: z.enum(["KAMPUS_SUTOMO", "KAMPUS_TUNTUNGAN", "KAMPUS_PANCING", "WILAYAH_LAINNYA"]).optional(),
  pickupMap: z.string().optional(),
  dropoffMap: z.string().optional(),
  pickupAddress: z.string().optional(),
  dropoffAddress: z.string().optional(),
});

const parseLatLng = (url: string): { lat: number; lng: number } | null => {
  try {
    const qMatch = url.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
    if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
    const atMatch = url.match(/@([0-9.+-]+),([0-9.+-]+)/i);
    if (atMatch) return { lat: Number(atMatch[1]), lng: Number(atMatch[2]) };
  } catch {
    return null;
  }
  return null;
};

const resolveMapUrl = async (url?: string | null): Promise<{ lat: number; lng: number } | null> => {
  if (!url) return null;
  const direct = parseLatLng(url);
  if (direct) return direct;
  const ua = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36" };

  const parseFromHtml = (html: string) => {
    const qMatch = html.match(/q=([0-9.+-]+),([0-9.+-]+)/i);
    if (qMatch) return { lat: Number(qMatch[1]), lng: Number(qMatch[2]) };
    const bangAll = [...html.matchAll(/!3d([0-9.+-]+)!4d([0-9.+-]+)/gi)];
    if (bangAll.length > 0) {
      const last = bangAll[bangAll.length - 1];
      return { lat: Number(last[1]), lng: Number(last[2]) };
    }
    const atAll = [...html.matchAll(/@([0-9.+-]+),([0-9.+-]+)/gi)];
    if (atAll.length > 0) {
      const last = atAll[atAll.length - 1];
      return { lat: Number(last[1]), lng: Number(last[2]) };
    }
    return null;
  };
  const parseMetaRefresh = (html: string) => {
    const meta = html.match(/http-equiv=["']refresh["'][^>]*content=["'][^'"]*url=([^"']+)/i);
    if (meta && meta[1]) {
      try {
        return decodeURIComponent(meta[1]);
      } catch {
        return meta[1];
      }
    }
    return null;
  };

  // Manual redirect walker (GET, no auto-follow) up to 5 hops
  let current = url;
  for (let i = 0; i < 5; i++) {
    try {
      const resp = await fetch(current, { method: "GET", redirect: "manual" as any, headers: ua });
      const parsedUrl = parseLatLng(resp.url || current);
      if (parsedUrl) return parsedUrl;
      const loc = resp.headers.get("location");
      if (!loc) {
        const html = await resp.text();
        const metaUrl = parseMetaRefresh(html);
        if (metaUrl) {
          current = metaUrl;
          continue;
        }
        const htmlParsed = parseFromHtml(html);
        if (htmlParsed) return htmlParsed;
        break;
      }
      try {
        const next = new URL(loc, current).toString();
        current = next;
      } catch {
        current = loc;
      }
    } catch { /* ignore and break */ break; }
  }

  // Final GET follow attempt
  try {
    const resp = await fetch(current, { method: "GET", redirect: "follow" as any, headers: ua });
    const parsedFinal = parseLatLng(resp.url || current);
    if (parsedFinal) return parsedFinal;
    const html = await resp.text();
    const fromHtml = parseFromHtml(html);
    if (fromHtml) return fromHtml;
  } catch { /* ignore */ }

  return null;
};

// POST /customer/orders
router.post("/", orderUpload.single("pickupPhoto"), async (req: any, res) => {
  const user = req.user!;
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  }

  const hasActive = await prisma.customerOrder.count({
    where: {
      customerId: user.id,
      status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
    },
  });
  if (hasActive > 0) {
    return res.status(400).json({
      ok: false,
      error: { message: "Ups, anda memiliki transaksi yang sedang berlangsung sekarang, harap tunggu sampai transaksi itu selesai lalu coba lagi." },
    });
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
  const pickupMapRaw = parsed.data.pickupMap || null;
  const dropoffMapRaw = parsed.data.dropoffMap || null;
  const mapFromNote = note?.match(/Maps:\s*(https?:\S+)/i)?.[1] || null;
  let pickupMap: string | null = pickupMapRaw;
  let dropoffMap: string | null = dropoffMapRaw || mapFromNote || null;
  let pickupCoords = await resolveMapUrl(pickupMap || undefined);
  let dropoffCoords = await resolveMapUrl(dropoffMap || undefined);

  let storeUserId: string | undefined;
  let menuItemValidated: { id: string; name: string; price: number; promoPrice: number | null } | undefined;
  let initialStatus: any = "WAITING_STORE_CONFIRM";

  if (orderType === "FOOD_EXISTING_STORE") {
    if (!storeProfileId || !menuItemId || !quantity) {
      return res.status(400).json({ ok: false, error: { message: "storeProfileId, menuItemId, quantity wajib" } });
    }
    const storeProfile = await prisma.storeProfile.findUnique({
      where: { id: storeProfileId },
      select: { userId: true, status: true, mapsUrl: true },
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
    pickupMap = storeProfile.mapsUrl || pickupMapRaw;
    dropoffMap = dropoffMapRaw || mapFromNote || null;
    pickupCoords = await resolveMapUrl(pickupMap || undefined);
    dropoffCoords = await resolveMapUrl(dropoffMap || undefined);

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
        pickupMap,
        dropoffMap,
        pickupLat: pickupCoords?.lat,
    pickupLng: pickupCoords?.lng,
    dropoffLat: dropoffCoords?.lat,
    dropoffLng: dropoffCoords?.lng,
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
        pickupMap: true,
        dropoffMap: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
        store: { select: { id: true, storeProfile: { select: { id: true, storeName: true, mapsUrl: true } } } },
      },
    });
    emitOrdersChanged();
    return res.status(201).json({ ok: true, data: { order: withParsedNote(order) } });
  } else if (orderType === "FOOD_CUSTOM_STORE") {
    if (!customStoreName || !customStoreAddress || !quantity) {
      return res.status(400).json({ ok: false, error: { message: "Nama & alamat toko custom serta quantity wajib" } });
    }
    initialStatus = "SEARCHING_DRIVER";
    const customRegion = parsed.data.customRegion || "WILAYAH_LAINNYA";
    const addressHasUrl = customStoreAddress && /^https?:\/\//i.test(customStoreAddress);
    // pickup = lokasi toko luar
    pickupMap = pickupMapRaw || (addressHasUrl ? customStoreAddress : null) || mapFromNote || null;
    // dropoff = lokasi customer
    dropoffMap = dropoffMapRaw || mapFromNote || null;
    pickupCoords = await resolveMapUrl(pickupMap || undefined);
    dropoffCoords = await resolveMapUrl(dropoffMap || undefined);
    const order = await prisma.customerOrder.create({
      data: {
        customerId: user.id,
        storeId: null,
        menuItemId: null,
        quantity: quantity ?? null,
        note,
        paymentMethod,
        status: initialStatus,
        orderType,
        customStoreName,
        customStoreAddress,
        customRegion,
        pickupAddress,
        dropoffAddress,
        pickupMap,
        dropoffMap,
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        dropoffLat: dropoffCoords?.lat,
        dropoffLng: dropoffCoords?.lng,
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
    emitOrdersChanged();
    return res.status(201).json({ ok: true, data: { order: withParsedNote(order) } });
    // store/menuItem dibiarkan null
  } else if (orderType === "RIDE") {
    if (!pickupAddress || !dropoffAddress || !parsed.data.pickupRegion || !parsed.data.dropoffRegion) {
      return res.status(400).json({ ok: false, error: { message: "Pickup/dropoff, wilayah pickup, wilayah tujuan wajib" } });
    }
    initialStatus = "SEARCHING_DRIVER";
    const noteParts = [
      note,
      pickupMap ? `Maps: ${pickupMap}` : "",
      dropoffMap ? `DropoffMap: ${dropoffMap}` : "",
    ].filter(Boolean);
    const pickupPhotoPath = req.file ? `/uploads/order-proofs/${req.file.filename}` : null;
    if (pickupPhotoPath) noteParts.push(`PickupPhoto: ${pickupPhotoPath}`);

    const order = await prisma.customerOrder.create({
      data: {
        customerId: user.id,
        storeId: null,
        menuItemId: null,
        quantity: quantity ?? null,
        note: noteParts.join("\n") || null,
        paymentMethod,
        status: initialStatus,
        orderType,
        pickupAddress,
        dropoffAddress,
        pickupMap,
        dropoffMap,
        pickupLat: pickupCoords?.lat,
        pickupLng: pickupCoords?.lng,
        dropoffLat: dropoffCoords?.lat,
        dropoffLng: dropoffCoords?.lng,
        pickupRegion: parsed.data.pickupRegion,
        dropoffRegion: parsed.data.dropoffRegion,
      },
      select: {
        id: true,
        status: true,
        paymentMethod: true,
        quantity: true,
        note: true,
        createdAt: true,
        orderType: true,
        pickupAddress: true,
        dropoffAddress: true,
        pickupMap: true,
        dropoffMap: true,
        pickupLat: true,
        pickupLng: true,
        dropoffLat: true,
        dropoffLng: true,
        pickupRegion: true,
        dropoffRegion: true,
      },
    });
    emitOrdersChanged();
    return res.status(201).json({ ok: true, data: { order: withParsedNote(order) } });
  }

  // fallback (should not reach here because each branch returns)
  return res.status(400).json({ ok: false, error: { message: "Tipe order tidak didukung" } });
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

// PATCH /customer/orders/:id/cancel -> batalkan pesanan custom yang masih mencari driver
router.patch("/:id/cancel", async (req: any, res) => {
  const user = req.user!;
  const order = await prisma.customerOrder.findFirst({
    where: {
      id: req.params.id,
      customerId: user.id,
    },
    select: { id: true, status: true, orderType: true },
  });
  if (!order) return res.status(404).json({ ok: false, error: { message: "Order tidak ditemukan" } });

  const isCustomSearching = order.orderType === "FOOD_CUSTOM_STORE" && order.status === "SEARCHING_DRIVER";
  const isStoreWaiting = order.orderType === "FOOD_EXISTING_STORE" && order.status === "WAITING_STORE_CONFIRM";
  const isRideSearching = order.orderType === "RIDE" && order.status === "SEARCHING_DRIVER";
  if (!isCustomSearching && !isStoreWaiting && !isRideSearching) {
    return res.status(400).json({ ok: false, error: { message: "Pesanan tidak bisa dibatalkan pada status ini" } });
  }

  const updated = await prisma.customerOrder.update({
    where: { id: order.id },
    data: { status: "CANCELLED" },
    select: { id: true, status: true },
  });
  emitOrdersChanged();
  return res.json({ ok: true, data: { order: updated } });
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
      pickupMap: true,
      dropoffMap: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true, mapsUrl: true } } } },
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
      status: { notIn: ["COMPLETED", "CANCELLED", "REJECTED"] },
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
      pickupMap: true,
      dropoffMap: true,
      pickupLat: true,
      pickupLng: true,
      dropoffLat: true,
      dropoffLng: true,
      menuItem: { select: { id: true, name: true, price: true, promoPrice: true } },
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true, photoUrl: true, address: true, mapsUrl: true } } } },
      driver: { select: { id: true, username: true, email: true, phone: true, driverProfile: { select: { facePhotoUrl: true } } } },
    },
  });

  if (!order) return res.status(404).json({ ok: false, error: { message: "Tidak ada order aktif" } });
  return res.json({ ok: true, data: { order: withParsedNote(order) } });
});

export default router;
