import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";

const router = Router();
router.use(requireRole(["CUSTOMER"]));

// GET /customer/stores?region=KAMPUS_SUTOMO|...
router.get("/", async (req, res) => {
  const user = (req as any).user!;
  const { region } = req.query as { region?: string };
  const regionFilter = region ? { region: region as any } : {};

  const stores = await prisma.storeAvailability.findMany({
    where: {
      status: "ACTIVE",
      ...regionFilter,
      user: {
        storeProfile: { status: "APPROVED" },
      },
    },
    select: {
      status: true,
      region: true,
      locationUrl: true,
      note: true,
      user: {
        select: {
          id: true,
          phone: true,
          storeProfile: {
    select: {
      id: true,
      userId: true,
      storeName: true,
      ownerName: true,
      address: true,
      mapsUrl: true,
      description: true,
              photoUrl: true,
            },
          },
        },
      },
    },
    orderBy: [{ region: "asc" }],
  });

  return res.json({ ok: true, data: { stores } });
});

// GET /customer/stores/:id  (id = storeProfile.id)
router.get("/:id", async (req, res) => {
  const storeProfileId = req.params.id;

  const storeProfile = await prisma.storeProfile.findUnique({
    where: { id: storeProfileId },
    select: {
      id: true,
      userId: true,
      storeName: true,
      ownerName: true,
      address: true,
      mapsUrl: true,
      description: true,
      photoUrl: true,
      status: true,
      user: {
        select: {
          id: true,
          phone: true,
          email: true,
          storeAvailability: {
            select: {
              status: true,
              region: true,
              locationUrl: true,
              note: true,
              openDays: true,
              openTime: true,
              closeTime: true,
              latitude: true,
              longitude: true,
              updatedAt: true,
            },
          },
        },
      },
    },
  });

  if (!storeProfile || storeProfile.status !== "APPROVED") {
    return res.status(404).json({ ok: false, error: { message: "Store tidak ditemukan atau belum aktif" } });
  }

  const categories = await prisma.menuCategory.findMany({
    where: { storeId: storeProfile.userId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      menuItems: {
        where: { isActive: true, isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
        include: {
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            include: {
              options: {
                where: { isAvailable: true },
                orderBy: { sortOrder: "asc" },
              },
            },
          },
        },
      },
    },
  });

  return res.json({
    ok: true,
    data: {
      store: storeProfile,
      categories,
    },
  });
});

export default router;
