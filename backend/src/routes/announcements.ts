import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { ok, fail } from "@/utils/http";

const router = Router();

const ROLES = ["CUSTOMER", "DRIVER", "STORE", "ADMIN", "SUPERADMIN"] as const;
type Role = (typeof ROLES)[number];

router.get("/", async (req, res) => {
  try {
    const roleParam = (req.query.role as string | undefined)?.toUpperCase() as Role | undefined;
    const role =
      roleParam && ROLES.includes(roleParam) ? roleParam : ((req as any).user?.role as Role | undefined);

    const where: any = { isActive: true };
    if (role) {
      where.OR = [{ forRole: role }, { forRole: null }];
    }

    const items = await prisma.announcement.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        slug: true,
        title: true,
        description: true,
        imageUrl: true,
        link: true,
        forRole: true,
        sortOrder: true
      }
    });

    return res.json(ok(items));
  } catch (e: any) {
    return res.status(500).json(fail(e.message || "Server error"));
  }
});

export default router;
