import { Router } from "express";
import { prisma } from "@/lib/prisma";
import { requireRole, issueSession } from "@/lib/auth";

const router = Router();
router.use(requireRole(["SUPERADMIN"]));

// GET /superadmin/users?page=1&role=&q=
router.get("/", async (req: any, res) => {
  const pageRaw = Number(req.query.page);
  const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
  const take = 20;
  const skip = (page - 1) * take;
  const role = String(req.query.role || "").toUpperCase();
  const q = String(req.query.q || "").trim();

  const where: any = {};
  if (["CUSTOMER", "STORE", "DRIVER", "ADMIN", "SUPERADMIN"].includes(role)) {
    where.role = role;
  }
  if (q) {
    where.OR = [
      { username: { contains: q } },
      { email: { contains: q } },
      { phone: { contains: q } },
      { id: { contains: q } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip,
    take,
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
    },
  });

  return res.json({ ok: true, data: { users, page, perPage: take } });
});

// GET /superadmin/users/:id -> detail ringkas
router.get("/:id", async (req: any, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: {
      id: true,
      username: true,
      email: true,
      phone: true,
      role: true,
      customerProfile: { select: { name: true, address: true } },
      driverProfile: { select: { name: true, whatsapp: true, address: true, status: true } },
      storeProfile: { select: { storeName: true, address: true, status: true } },
    },
  });
  if (!user) return res.status(404).json({ ok: false, error: { message: "User tidak ditemukan" } });
  return res.json({ ok: true, data: { user } });
});

// POST /superadmin/users/:id/impersonate -> login sebagai user tersebut
router.post("/:id/impersonate", async (req: any, res) => {
  const target = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, role: true },
  });
  if (!target) return res.status(404).json({ ok: false, error: { message: "User tidak ditemukan" } });

  await issueSession(res, target.id, target.role);
  return res.json({ ok: true, data: { user: target } });
});

export default router;
