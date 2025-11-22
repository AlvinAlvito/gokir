import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { requireRole } from "@/lib/auth";
import { uploadStoreMenuPhoto } from "@/middleware/upload";

const router = Router();
router.use(requireRole(["STORE"]));

// ===== Categories =====
router.get("/categories", async (req: any, res) => {
  const userId = req.user.id;
  const categories = await prisma.menuCategory.findMany({
    where: { storeId: userId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  return res.json({ ok: true, data: { categories } });
});

router.post("/categories", async (req: any, res) => {
  const userId = req.user.id;
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    sortOrder: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  const cat = await prisma.menuCategory.create({
    data: {
      storeId: userId,
      ...parsed.data,
    },
  });
  return res.status(201).json({ ok: true, data: { category: cat } });
});

router.patch("/categories/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    sortOrder: z.coerce.number().optional(),
    isActive: z.boolean().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  const exists = await prisma.menuCategory.findFirst({ where: { id, storeId: userId } });
  if (!exists) return res.status(404).json({ ok: false, error: { message: "Kategori tidak ditemukan" } });

  const updated = await prisma.menuCategory.update({
    where: { id },
    data: parsed.data,
  });
  return res.json({ ok: true, data: { category: updated } });
});

router.delete("/categories/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  await prisma.menuCategory.deleteMany({ where: { id, storeId: userId } });
  return res.json({ ok: true });
});

// ===== Items =====
router.get("/items", async (req: any, res) => {
  const userId = req.user.id;
  const { categoryId } = req.query as { categoryId?: string };
  const items = await prisma.menuItem.findMany({
    where: { storeId: userId, ...(categoryId ? { categoryId } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: {
      optionGroups: {
        orderBy: { sortOrder: "asc" },
        include: {
          options: { orderBy: { sortOrder: "asc" } },
        },
      },
    },
  });
  return res.json({ ok: true, data: { items } });
});

router.post("/items", async (req: any, res) => {
  const userId = req.user.id;
  const schema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    price: z.coerce.number().int().positive(),
    promoPrice: z.coerce.number().int().positive().optional(),
    photoUrl: z.string().optional(),
    categoryId: z.string().optional(),
    isAvailable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  // validate category belongs to store
  if (parsed.data.categoryId) {
    const cat = await prisma.menuCategory.findFirst({ where: { id: parsed.data.categoryId, storeId: userId } });
    if (!cat) return res.status(400).json({ ok: false, error: { message: "Kategori tidak valid" } });
  }

  const item = await prisma.menuItem.create({
    data: {
      storeId: userId,
      ...parsed.data,
    },
  });
  return res.status(201).json({ ok: true, data: { item } });
});

router.patch("/items/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const schema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional().nullable(),
    price: z.coerce.number().int().positive().optional(),
    promoPrice: z.coerce.number().int().positive().optional().nullable(),
    photoUrl: z.string().optional().nullable(),
    categoryId: z.string().optional().nullable(),
    isAvailable: z.boolean().optional(),
    isActive: z.boolean().optional(),
    sortOrder: z.coerce.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  const exists = await prisma.menuItem.findFirst({ where: { id, storeId: userId } });
  if (!exists) return res.status(404).json({ ok: false, error: { message: "Item tidak ditemukan" } });

  if (parsed.data.categoryId) {
    const cat = await prisma.menuCategory.findFirst({ where: { id: parsed.data.categoryId, storeId: userId } });
    if (!cat) return res.status(400).json({ ok: false, error: { message: "Kategori tidak valid" } });
  }

  const updated = await prisma.menuItem.update({
    where: { id },
    data: parsed.data,
  });
  return res.json({ ok: true, data: { item: updated } });
});

// Upload foto menu item
router.post("/items/upload-photo", (req: any, res) => {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ ok: false, error: { message: "Unauthorized" } });

  uploadStoreMenuPhoto(req, res, async (err: any) => {
    if (err) return res.status(400).json({ ok: false, error: { message: err.message || "Upload failed" } });
    if (!req.file) return res.status(400).json({ ok: false, error: { message: "No file uploaded" } });

    const relative = `/uploads/store-menu/${req.file.filename}`;
    return res.json({ ok: true, data: { photoUrl: relative } });
  });
});

router.delete("/items/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  await prisma.menuItem.deleteMany({ where: { id, storeId: userId } });
  return res.json({ ok: true });
});

// ===== Option Groups =====
router.post("/items/:itemId/option-groups", async (req: any, res) => {
  const userId = req.user.id;
  const { itemId } = req.params;
  const schema = z.object({
    name: z.string().min(1),
    type: z.enum(["SINGLE", "MULTIPLE"]),
    isRequired: z.boolean().optional(),
    minSelect: z.coerce.number().int().optional(),
    maxSelect: z.coerce.number().int().optional(),
    sortOrder: z.coerce.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  const item = await prisma.menuItem.findFirst({ where: { id: itemId, storeId: userId } });
  if (!item) return res.status(404).json({ ok: false, error: { message: "Item tidak ditemukan" } });

  const group = await prisma.menuOptionGroup.create({
    data: {
      menuItemId: itemId,
      ...parsed.data,
    },
  });
  return res.status(201).json({ ok: true, data: { group } });
});

router.patch("/option-groups/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const schema = z.object({
    name: z.string().min(1).optional(),
    type: z.enum(["SINGLE", "MULTIPLE"]).optional(),
    isRequired: z.boolean().optional(),
    minSelect: z.coerce.number().int().optional().nullable(),
    maxSelect: z.coerce.number().int().optional().nullable(),
    sortOrder: z.coerce.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  const group = await prisma.menuOptionGroup.findFirst({
    where: { id },
    include: { menuItem: true },
  });
  if (!group || group.menuItem.storeId !== userId) return res.status(404).json({ ok: false, error: { message: "Group tidak ditemukan" } });

  const updated = await prisma.menuOptionGroup.update({
    where: { id },
    data: parsed.data,
  });
  return res.json({ ok: true, data: { group: updated } });
});

router.delete("/option-groups/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const group = await prisma.menuOptionGroup.findFirst({
    where: { id },
    include: { menuItem: true },
  });
  if (!group || group.menuItem.storeId !== userId) return res.status(404).json({ ok: false, error: { message: "Group tidak ditemukan" } });
  await prisma.menuOptionGroup.delete({ where: { id } });
  return res.json({ ok: true });
});

// ===== Options =====
router.post("/option-groups/:groupId/options", async (req: any, res) => {
  const userId = req.user.id;
  const { groupId } = req.params;
  const schema = z.object({
    name: z.string().min(1),
    priceDelta: z.coerce.number().int().optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: z.coerce.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  const group = await prisma.menuOptionGroup.findFirst({
    where: { id: groupId },
    include: { menuItem: true },
  });
  if (!group || group.menuItem.storeId !== userId) return res.status(404).json({ ok: false, error: { message: "Group tidak ditemukan" } });

  const option = await prisma.menuOption.create({
    data: {
      groupId,
      ...parsed.data,
    },
  });
  return res.status(201).json({ ok: true, data: { option } });
});

router.patch("/options/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const schema = z.object({
    name: z.string().min(1).optional(),
    priceDelta: z.coerce.number().int().optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: z.coerce.number().optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });

  const opt = await prisma.menuOption.findFirst({
    where: { id },
    include: { group: { include: { menuItem: true } } },
  });
  if (!opt || opt.group.menuItem.storeId !== userId) return res.status(404).json({ ok: false, error: { message: "Opsi tidak ditemukan" } });

  const updated = await prisma.menuOption.update({
    where: { id },
    data: parsed.data,
  });
  return res.json({ ok: true, data: { option: updated } });
});

router.delete("/options/:id", async (req: any, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const opt = await prisma.menuOption.findFirst({
    where: { id },
    include: { group: { include: { menuItem: true } } },
  });
  if (!opt || opt.group.menuItem.storeId !== userId) return res.status(404).json({ ok: false, error: { message: "Opsi tidak ditemukan" } });
  await prisma.menuOption.delete({ where: { id } });
  return res.json({ ok: true });
});

export default router;
