import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueSession, verifyPassword, hashPassword, logAudit } from "@/lib/auth";
import { ok, fail } from "@/utils/http";

const router = Router();

router.post("/register", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1),
    nim: z.string().min(3),
    birthPlace: z.string().min(1),
    birthDate: z.string().min(8), // ISO date
    idCardUrl: z.string().url(),
    studentCardUrl: z.string().url(),
    facePhotoUrl: z.string().url()
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));
  const d = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email: d.email } });
  if (exists) return res.status(409).json(fail("Email already registered"));

  const passwordHash = await hashPassword(d.password);
  const user = await prisma.user.create({
    data: {
      email: d.email,
      passwordHash,
      role: "DRIVER",
      isEmailVerified: false,
      driverProfile: {
        create: {
          name: d.name,
          nim: d.nim,
          birthPlace: d.birthPlace,
          birthDate: new Date(d.birthDate),
          idCardUrl: d.idCardUrl,
          studentCardUrl: d.studentCardUrl,
          facePhotoUrl: d.facePhotoUrl,
          status: "PENDING"
        }
      }
    },
    include: { driverProfile: true }
  });

  // Driver boleh login & akses dashboard, tapi belum aktif menerima order
  await issueSession(res, user.id, user.role);
  await logAudit(user.id, "DRIVER_REGISTER", req);
  res.json(ok({ user: { id: user.id, role: user.role, email: user.email }, driver: user.driverProfile }));
});

router.post("/login-email", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true }});
  if (!user || !user.passwordHash || user.role !== "DRIVER") {
    return res.status(401).json(fail("Invalid credentials"));
  }

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Invalid credentials"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
  await logAudit(user.id, "DRIVER_LOGIN_EMAIL", req);

  res.json(ok({
    user: { id: user.id, role: user.role, email: user.email },
    driver: user.driverProfile // FE bisa cek status APPROVED/PENDING
  }));
});

export default router;
