import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const router = Router();
router.use(requireRole(["SUPERADMIN"]));

const schema = z.object({
  under1Km: z.coerce.number().int().min(0),
  km1To1_5: z.coerce.number().int().min(0),
  km1_5To2: z.coerce.number().int().min(0),
  km2To2_5: z.coerce.number().int().min(0),
  km2_5To3: z.coerce.number().int().min(0),
  above3PerKm: z.coerce.number().int().min(0),
});

router.get("/", async (_req, res) => {
  let cfg = await prisma.deliveryPricing.findFirst();
  if (!cfg) {
    cfg = await prisma.deliveryPricing.create({
      data: {},
    });
  }
  return res.json({ ok: true, data: { pricing: cfg } });
});

router.put("/", async (req: any, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  }
  const existing = await prisma.deliveryPricing.findFirst();
  const data = parsed.data;
  const updated = existing
    ? await prisma.deliveryPricing.update({ where: { id: existing.id }, data })
    : await prisma.deliveryPricing.create({ data });
  return res.json({ ok: true, data: { pricing: updated } });
});

export default router;
