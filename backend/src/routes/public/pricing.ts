import { Router } from "express";
import { getDeliveryPricing } from "@/routes/customer/orders";
import { requireAuth } from "@/lib/auth";

const router = Router();
router.use(requireAuth);

router.get("/delivery", async (_req, res) => {
  const cfg = await getDeliveryPricing();
  return res.json({ ok: true, data: { pricing: cfg } });
});

export default router;
