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
    name: z.string().min(2),
    whatsapp: z.string().min(8).max(20).optional(), // validasi sederhana
    email: z.string().email(),
    password: z.string().min(6)
  });

  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { name, whatsapp, email, password } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json(fail("Email already registered", "EMAIL_TAKEN"));

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      passwordHash,
      role: "CUSTOMER",
      isEmailVerified: false,
      phone: whatsapp ?? null,
      customerProfile: { create: { name, whatsapp: whatsapp ?? null } }
    }
  });

  // Tidak auto-login: cukup catat audit & balas sukses
  await logAudit(user.id, "CUSTOMER_REGISTER_EMAIL", req);
  return res.status(201).json(ok({ message: "Registered. Please sign in." }));
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

  const expectedAud = process.env.GOOGLE_CLIENT_ID!;
  const idToken = parsed.data.idToken;

  try {
    // 1) Verifikasi tanda tangan token dulu (tanpa audience) untuk bisa baca payload
    const ticket = await googleClient.verifyIdToken({ idToken });
    const payload = ticket.getPayload();

    if (!payload) return res.status(401).json(fail("No payload from Google"));
    const { email, sub, aud, iss, email_verified } = payload;

    // 2) Cek audience manual supaya error message jelas
    if (aud !== expectedAud) {
      return res.status(401).json(
        fail(
          `Google token audience mismatch. got_aud=${aud} expected_aud=${expectedAud}`
        )
      );
    }

    if (!email) return res.status(400).json(fail("Google email missing"));
    if (!email_verified) {
      return res.status(401).json(fail("Google email not verified"));
    }

    // 3) Lanjutkan login/registrasi seperti biasa
    let user = await prisma.user.findUnique({ where: { email }});
    if (!user) {
      user = await prisma.user.create({
        data: {
          email,
          role: "CUSTOMER",
          isEmailVerified: true,
          customerProfile: { create: { name: payload.name ?? null, photoUrl: payload.picture ?? null } },
          oauthAccounts: {
            create: { provider: "google", providerUserId: sub! }
          }
        }
      });
      await logAudit(user.id, "CUSTOMER_REGISTER_GOOGLE", req);
    }

    await issueSession(res, user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
    await logAudit(user.id, "CUSTOMER_LOGIN_GOOGLE", req);

    res.json(ok({ user: { id: user.id, role: user.role, email: user.email }, meta: { iss, aud } }));
  } catch (e: any) {
    // Tambahin sedikit detail biar ketahuan kenapa
    res.status(401).json(fail(`Google token invalid: ${e?.message || "unknown"}`));
  }
});


export default router;
