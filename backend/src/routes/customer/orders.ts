import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/auth";

const router = Router();
router.use(requireRole(["CUSTOMER"]));

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

  return res.status(201).json({ ok: true, data: { order } });
});

// GET /customer/orders
router.get("/", async (req: any, res) => {
  const user = req.user!;
  const orders = await prisma.customerOrder.findMany({
    where: { customerId: user.id },
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
      store: { select: { id: true, storeProfile: { select: { id: true, storeName: true } } } },
      driver: { select: { id: true, username: true, email: true, phone: true, driverProfile: { select: { facePhotoUrl: true } } } },
    },
  });
  return res.json({ ok: true, data: { orders } });
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
  return res.json({ ok: true, data: { order } });
});

export default router;
