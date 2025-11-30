import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, issueSession, logAudit, verifyPassword } from "@/lib/auth";
import { ok, fail } from "@/utils/http";
import { upload } from "@/middleware/upload";

const router = Router();

const publicBaseUrl = process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
const toUrl = (file: Express.Multer.File) => `/uploads/${file.filename}`;

// Helper untuk handle upload multipart
const handleDriverUpload = upload.fields([
  { name: "idCard", maxCount: 1 },
  { name: "studentCard", maxCount: 1 },
  { name: "simCard", maxCount: 1 },
  { name: "facePhoto", maxCount: 1 },
]);

// REGISTER DRIVER (email + password + dokumen)
router.post("/register", (req, res) => {
  handleDriverUpload(req as any, res as any, async (err: any) => {
    if (err) return res.status(400).json(fail(err.message || "Upload gagal"));

    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6),
      name: z.string().min(1),
      nim: z.string().min(1),
      birthPlace: z.string().min(1),
      birthDate: z.string().min(1),
      whatsapp: z.string().min(6).max(20).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(fail("Payload tidak valid"));

    const files = req.files as Record<string, Express.Multer.File[]>;
    const needed = ["idCard", "studentCard", "simCard", "facePhoto"] as const;
    const missing = needed.filter((k) => !files?.[k]?.[0]);
    if (missing.length) return res.status(400).json(fail(`File wajib: ${missing.join(", ")}`));

    const { email, password, name, nim, birthPlace, birthDate, whatsapp } = parsed.data;

    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) return res.status(409).json(fail("Email sudah terdaftar"));

    const birth = new Date(birthDate);
    if (Number.isNaN(birth.getTime())) return res.status(400).json(fail("Tanggal lahir tidak valid"));

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username: name,
        phone: whatsapp ?? null,
        passwordHash,
        role: "DRIVER",
        driverProfile: {
          create: {
            name,
            nim,
            birthPlace,
            birthDate: birth,
            whatsapp: whatsapp ?? null,
            idCardUrl: toUrl(files.idCard[0]),
            studentCardUrl: toUrl(files.studentCard[0]),
            simCardUrl: toUrl(files.simCard[0]),
            facePhotoUrl: toUrl(files.facePhoto[0]),
            status: "PENDING",
          },
        },
      },
      include: { driverProfile: true },
    });

    await issueSession(res, user.id, user.role);
    await logAudit(user.id, "DRIVER_REGISTER_EMAIL", req);

    return res.json(
      ok({
        user: {
          id: user.id,
          role: user.role,
          email: user.email,
          driverProfile: user.driverProfile,
        },
        baseUrl: publicBaseUrl,
      })
    );
  });
});

// LOGIN DRIVER (email + password)
router.post("/login-email", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Payload tidak valid"));

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({
    where: { email },
    include: { driverProfile: true },
  });

  if (!user || !user.passwordHash || user.role !== "DRIVER") {
    return res.status(401).json(fail("Email atau password salah"));
  }

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Email atau password salah"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit(user.id, "DRIVER_LOGIN_EMAIL", req);

  return res.json(
    ok({
      user: {
        id: user.id,
        role: user.role,
        email: user.email,
        driverProfile: user.driverProfile,
      },
      baseUrl: publicBaseUrl,
    })
  );
});

export default router;
