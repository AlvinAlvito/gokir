import { Router } from "express";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueSession, verifyPassword, hashPassword, logAudit } from "@/lib/auth";
import { ok, fail } from "@/utils/http";
import { upload } from "@/middleware/upload";

const router = Router();

router.post("/register",
  upload.fields([
    { name: "idCard", maxCount: 1 },
    { name: "studentCard", maxCount: 1 },
    { name: "facePhoto", maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      // ambil body fields
      const schema = z.object({
        email: z.string().email(),
        password: z.string().min(6),
        name: z.string().min(1),
        nim: z.string().min(3),
        birthPlace: z.string().min(1),
        birthDate: z.string().min(8),
        whatsapp: z.string().optional()
      });


      const parsed = schema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json(fail("Invalid payload"));
      const d = parsed.data;

      // ambil file paths
      const files = req.files as {
        [field: string]: Express.Multer.File[];
      } | undefined;

      const idCardFile = files?.idCard?.[0];
      const studentCardFile = files?.studentCard?.[0];
      const facePhotoFile = files?.facePhoto?.[0];

      if (!idCardFile || !studentCardFile || !facePhotoFile) {
        return res.status(400).json(fail("Dokumen wajib: idCard, studentCard, facePhoto"));
      }

      const baseURL = process.env.APP_URL || `http://localhost:${process.env.PORT || 4000}`;
      const idCardUrl = `${baseURL}/uploads/${idCardFile.filename}`;
      const studentCardUrl = `${baseURL}/uploads/${studentCardFile.filename}`;
      const facePhotoUrl = `${baseURL}/uploads/${facePhotoFile.filename}`;

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
              idCardUrl,
              studentCardUrl,
              facePhotoUrl,
              whatsapp: d.whatsapp || null, // 👈 disimpan
              status: "PENDING"
            }
          }

        },
        include: { driverProfile: true }
      });

      // (opsi) tidak auto-login → arahkan user untuk signin
      await logAudit(user.id, "DRIVER_REGISTER_WITH_UPLOAD", req);
      return res.status(201).json(ok({
        message: "Registered. Awaiting admin approval. Please sign in.",
        driver: { id: user.driverProfile?.id, status: user.driverProfile?.status }
      }));
    } catch (err: any) {
      if (err?.message?.includes("Invalid file type")) {
        return res.status(400).json(fail("Hanya file gambar yang diperbolehkan"));
      }
      if (err?.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json(fail("Ukuran file maksimal 5MB"));
      }
      return res.status(500).json(fail("Internal server error"));
    }
  }
);

router.post("/login-email", async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(6)
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(fail("Invalid payload"));

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email }, include: { driverProfile: true } });
  if (!user || !user.passwordHash || user.role !== "DRIVER") {
    return res.status(401).json(fail("Invalid credentials"));
  }

  const okPass = await verifyPassword(password, user.passwordHash);
  if (!okPass) return res.status(401).json(fail("Invalid credentials"));

  await issueSession(res, user.id, user.role);
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await logAudit(user.id, "DRIVER_LOGIN_EMAIL", req);

  res.json(ok({
    user: { id: user.id, role: user.role, email: user.email },
    driver: user.driverProfile // FE bisa cek status APPROVED/PENDING
  }));
});

export default router;
