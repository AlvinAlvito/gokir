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

  console.log("Seeded superadmin & admin (PLEASE CHANGE PASSWORDS IN PROD).");
}

main().finally(() => prisma.$disconnect());
