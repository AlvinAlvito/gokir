import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueSession, verifyPassword, logAudit } from "@/lib/auth";
import { ok, fail } from "@/utils/http";

const router = Router();

/**
 * Universal login: identifier bisa email ATAU username
 * Body: { identifier: string, password: string }
 * Return: { user: { id, role, email?, username? } }
 */
router.post("/login", async (req, res) => {
  const schema = z.object({
    identifier: z.string().min(3),
    password: z.string().min(3)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { identifier, password } = parsed.data;

  // cari by email dulu, kalau tidak ada coba username
  const user =
    (await prisma.user.findUnique({ where: { email: identifier }, include: { driverProfile: true }})) ||
    (await prisma.user.findUnique({ where: { username: identifier }, include: { driverProfile: true }}));

  if (!user || !user.passwordHash) {
    return res.status(401).json(fail("Invalid credentials"));
  }

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Invalid credentials"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
  await logAudit(user.id, "UNIVERSAL_LOGIN", req);

  return res.json(
    ok({
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        username: user.username
      },
      // Opsional: expose status driver agar FE bisa arahkan/menampilkan banner
      driver: user.driverProfile ? { status: user.driverProfile.status } : undefined
    })
  );
});

export default router;
