import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

const router = Router();

// GET /stats/users -> total per role + kenaikan mingguan (dibanding 7 hari sebelumnya)
router.get("/users", requireAuth, async (_req, res) => {
  const now = new Date();
  const startThisWeek = new Date(now);
  startThisWeek.setDate(startThisWeek.getDate() - 7);
  const startPrevWeek = new Date(now);
  startPrevWeek.setDate(startPrevWeek.getDate() - 14);

  try {
    const roles = ["DRIVER", "CUSTOMER", "STORE"] as const;

    const counts: Record<string, number> = {};
    const weeklyChange: Record<string, number | null> = {};

    for (const role of roles) {
      const current = await prisma.user.count({
        where: { role: role as any, createdAt: { gte: startThisWeek } },
      });
      const previous = await prisma.user.count({
        where: {
          role: role as any,
          createdAt: { gte: startPrevWeek, lt: startThisWeek },
        },
      });

      const total = await prisma.user.count({ where: { role: role as any } });

      counts[role] = total;
      if (previous === 0) {
        weeklyChange[role] = current > 0 ? 100 : 0;
      } else {
        weeklyChange[role] = ((current - previous) / previous) * 100;
      }
    }

    return res.json({
      ok: true,
      data: {
        counts,
        weeklyChange,
      },
    });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: { message: e.message || "Server error" } });
  }
});

export default router;
