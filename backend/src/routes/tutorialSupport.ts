import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/", async (req: any, res) => {
  const role = (req.user?.role || "").toUpperCase();
  if (!["CUSTOMER", "DRIVER", "STORE"].includes(role)) {
    return res.status(403).json({ ok: false, error: { message: "Role tidak didukung" } });
  }
  const item = await prisma.tutorialSupport.findFirst({ where: { role: role as any } });
  return res.json({ ok: true, data: { item } });
});

export default router;
