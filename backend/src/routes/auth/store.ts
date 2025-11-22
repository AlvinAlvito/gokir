import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueSession, verifyPassword, hashPassword, logAudit } from "@/lib/auth";
import { OAuth2Client } from "google-auth-library";
import { ok, fail } from "@/utils/http";
import { uploadStorePhoto } from "@/middleware/upload";

const router = Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/register-email", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
    storeName: z.string().min(1),
    ownerName: z.string().min(1),
    address: z.string().min(1),
    mapsUrl: z.string().url(),
    photoUrl: z.string().min(1).optional(),
    phone: z.string().min(6).max(20).optional(),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { email, password, storeName, ownerName, address, mapsUrl, photoUrl, phone } = parsed.data;

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) return res.status(409).json(fail("Email already registered"));

  const passwordHash = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      phone: phone ?? undefined,
      passwordHash,
      role: "STORE",
      isEmailVerified: false,
      storeProfile: { create: { storeName, ownerName, address, mapsUrl, photoUrl } }
    }
  });

  await issueSession(res, user.id, user.role);
  await logAudit(user.id, "STORE_REGISTER_EMAIL", req);
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
  if (!user || !user.passwordHash || user.role !== "STORE") {
    return res.status(401).json(fail("Invalid credentials"));
  }

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Invalid credentials"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
  await logAudit(user.id, "STORE_LOGIN_EMAIL", req);

  res.json(ok({ user: { id: user.id, role: user.role, email: user.email }}));
});

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
          role: "STORE",
          isEmailVerified: true,
          storeProfile: { create: { storeName: payload.name ?? "Toko Saya" } },
          oauthAccounts: {
            create: {
              provider: "google",
              providerUserId: payload.sub!
            }
          }
        }
      });
      await logAudit(user.id, "STORE_REGISTER_GOOGLE", req);
    }

    if (user.role !== "STORE") return res.status(403).json(fail("Not a store account"));

    await issueSession(res, user.id, user.role);
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() }});
    await logAudit(user.id, "STORE_LOGIN_GOOGLE", req);

    res.json(ok({ user: { id: user.id, role: user.role, email: user.email }}));
  } catch (e) {
    res.status(401).json(fail("Google token invalid"));
  }
});

// Upload foto toko (tanpa auth karena dipakai saat sign up)
router.post("/upload-photo", (req, res) => {
  uploadStorePhoto(req as any, res as any, async (err: any) => {
    if (err) {
      return res.status(400).json(fail(err.message || "Upload failed"));
    }
    if (!req.file) return res.status(400).json(fail("No file uploaded"));

    const relative = `/uploads/store/${req.file.filename}`;
    return res.json(ok({ photoUrl: relative }));
  });
});

export default router;
