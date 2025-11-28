import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth";
import { z } from "zod";

const router = Router();
router.use(requireRole(["SUPERADMIN"]));

const schema = z.object({
  role: z.enum(["CUSTOMER", "DRIVER", "STORE"]),
  whatsappLink: z.string().url().optional().or(z.literal("")),
  youtubeUrl: z.string().url().optional().or(z.literal("")),
  tips: z.string().optional(),
  warning: z.string().optional(),
  terms: z.string().optional(),
});

router.get("/", async (_req: any, res) => {
  const items = await prisma.tutorialSupport.findMany({
    orderBy: { role: "asc" },
  });
  return res.json({ ok: true, data: { items } });
});

router.get("/:role", async (req: any, res) => {
  const role = String(req.params.role || "").toUpperCase();
  if (!["CUSTOMER", "DRIVER", "STORE"].includes(role)) {
    return res.status(400).json({ ok: false, error: { message: "Role tidak valid" } });
  }
  const item = await prisma.tutorialSupport.findFirst({ where: { role: role as any } });
  return res.json({ ok: true, data: { item } });
});

router.post("/", async (req: any, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ ok: false, error: { message: "Payload tidak valid" } });
  }
  const { role, whatsappLink, youtubeUrl, tips, warning, terms } = parsed.data;
  const existing = await prisma.tutorialSupport.findFirst({ where: { role } });
  let saved;
  if (existing) {
    saved = await prisma.tutorialSupport.update({
      where: { id: existing.id },
      data: { whatsappLink: whatsappLink || null, youtubeUrl: youtubeUrl || null, tips, warning, terms },
    });
  } else {
    saved = await prisma.tutorialSupport.create({
      data: { role, whatsappLink: whatsappLink || null, youtubeUrl: youtubeUrl || null, tips, warning, terms },
    });
  }
  return res.status(201).json({ ok: true, data: { item: saved } });
});

export default router;
