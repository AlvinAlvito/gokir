import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function main() {
  const saltRounds = 10;

  // superadmin: username=superadmin pw=123
  const superHash = await bcrypt.hash("123", saltRounds);
  await prisma.user.upsert({
    where: { username: "superadmin" },
    update: {},
    create: {
      username: "superadmin",
      role: "SUPERADMIN",
      passwordHash: superHash,
      isEmailVerified: true
    }
  });

  // admin: username=admin pw=123
  const adminHash = await bcrypt.hash("123", saltRounds);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      role: "ADMIN",
      passwordHash: adminHash,
      isEmailVerified: true
    }
  });

  const announcements = [
    {
      slug: "welcome-all",
      title: "Selamat datang di Gokir",
      description: "Pantau info terbaru seputar layanan dan promo langsung dari dashboard.",
      imageUrl: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
      link: null,
      forRole: null,
      sortOrder: 1,
      isActive: true
    },
    {
      slug: "driver-onboarding",
      title: "Lengkapi profil driver kamu",
      description: "Unggah dokumen lengkap agar verifikasi cepat disetujui admin.",
      imageUrl: "https://images.unsplash.com/photo-1529429617124-aee5f4ae7890?auto=format&fit=crop&w=1200&q=80",
      link: null,
      forRole: "DRIVER",
      sortOrder: 2,
      isActive: true
    },
    {
      slug: "store-promo",
      title: "Optimalkan profil tokomu",
      description: "Tambahkan deskripsi dan foto terbaik supaya pelanggan mudah mengenal tokomu.",
      imageUrl: "https://images.unsplash.com/photo-1522199710521-72d69614c702?auto=format&fit=crop&w=1200&q=80",
      link: null,
      forRole: "STORE",
      sortOrder: 3,
      isActive: true
    }
  ];

  for (const a of announcements) {
    await prisma.announcement.upsert({
      where: { slug: a.slug },
      update: {
        title: a.title,
        description: a.description,
        imageUrl: a.imageUrl,
        link: a.link,
        forRole: a.forRole,
        sortOrder: a.sortOrder,
        isActive: a.isActive
      },
      create: a
    });
  }

  console.log("Seeded superadmin, admin, and announcements (PLEASE CHANGE PASSWORDS IN PROD).");
}

main().finally(() => prisma.$disconnect());
