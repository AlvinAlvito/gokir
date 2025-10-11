import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueSession, verifyPassword, logAudit } from "@/lib/auth";
import { ok, fail } from "@/utils/http";

const router = Router();

router.post("/login", async (req, res) => {
  const schema = z.object({
    username: z.string().min(3),
    password: z.string().min(3)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { username, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { username }});
  if (!user || !user.passwordHash || (user.role !== "ADMIN" && user.role !== "SUPERADMIN")) {
    return res.status(401).json(fail("Invalid credentials"));
  }

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Invalid credentials"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
  await logAudit(user.id, "ADMIN_LOGIN", req);

  res.json(ok({ user: { id: user.id, role: user.role, username: user.username }}));
});

export default router;
