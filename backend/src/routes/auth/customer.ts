import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueSession, verifyPassword, hashPassword, logAudit } from "@/lib/auth";
import { OAuth2Client } from "google-auth-library";
import { ok, fail } from "@/utils/http";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/register-email", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    name: z.string().min(1).optional()
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { email, password, name } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json(fail("Email already registered", "EMAIL_TAKEN"));

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "CUSTOMER",
      isEmailVerified: false, // bisa dibuat flow verifikasi email OTP nanti
      customerProfile: { create: { name: name ?? null } }
    }
  });

  await issueSession(res, user.id, user.role);
  await logAudit(user.id, "CUSTOMER_REGISTER_EMAIL", req);
  res.json(ok({ user: { id: user.id, role: user.role, email: user.email }}));
});

router.post("/login-email", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }});
  if (!user || !user.passwordHash) return res.status(401).json(fail("Invalid credentials"));

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Invalid credentials"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
  await logAudit(user.id, "CUSTOMER_LOGIN_EMAIL", req);

  res.json(ok({ user: { id: user.id, role: user.role, email: user.email }}));
});

/**
 * Google Sign-In (Front-end kirim { idToken } dari Google One Tap / Sign-In)
 */
router.post("/login-google", async (req, res) => {
  const schema = z.object({ idToken: z.string().min(10) });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: parsed.data.idToken,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();
    if (!payload?.email) return res.status(400).json(fail("Google email missing"));

    const email = payload.email;
    let user = await prisma.user.findUnique({ where: { email }});
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: "CUSTOMER",
          isEmailVerified: true,
          customerProfile: { create: { name: payload.name ?? null, photoUrl: payload.picture ?? null } },
          oauthAccounts: {
            create: {
              provider: "google",
              providerUserId: payload.sub!
            }
          }
        }
      });
      await logAudit(user.id, "CUSTOMER_REGISTER_GOOGLE", req);
    }

    await issueSession(res, user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
    await logAudit(user.id, "CUSTOMER_LOGIN_GOOGLE", req);

    res.json(ok({ user: { id: user.id, role: user.role, email: user.email }}));
  } catch (e) {
    res.status(401).json(fail("Google token invalid"));
  }
});

export default router;
