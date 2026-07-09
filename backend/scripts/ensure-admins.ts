/**
 * Upsert administrator accounts. Run inside backend container:
 *   npx tsx scripts/ensure-admins.ts
 */
import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const PASSWORD = "Admin123";
const DEVELOPER_EMAIL = "codewithsudipto@gmail.com";
const MAIN_ADMIN_EMAIL = "smarnobbd@gmail.com";

const LEGACY_ADMIN_EMAILS = [
  "admin@downloadhub.com",
  "admin@downloaderpro.com",
  "admin@downloadhubpro.com",
];

const ADMINS = [
  { email: MAIN_ADMIN_EMAIL, name: "Main Admin", isDeveloper: false, isSuperAdmin: true },
  { email: DEVELOPER_EMAIL, name: "Developer", isDeveloper: true, isSuperAdmin: false },
];

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const removed = await prisma.user.deleteMany({
    where: { email: { in: LEGACY_ADMIN_EMAILS } },
  });
  if (removed.count) {
    console.log(`  • removed ${removed.count} legacy admin account(s)`);
  }

  for (const admin of ADMINS) {
    const email = admin.email.toLowerCase();
    await prisma.user.upsert({
      where: { email },
      create: {
        email,
        name: admin.name,
        passwordHash,
        role: "admin",
        planId: "business",
        totpExempt: true,
        totpEnabled: false,
        isDeveloper: admin.isDeveloper,
        isSuperAdmin: admin.isSuperAdmin,
      },
      update: {
        name: admin.name,
        passwordHash,
        role: "admin",
        totpExempt: true,
        totpEnabled: false,
        totpSecret: null,
        isDeveloper: admin.isDeveloper,
        isSuperAdmin: admin.isSuperAdmin,
        banned: false,
      },
    });
    console.log(
      `  • ${email}${admin.isDeveloper ? " (hidden developer)" : ""}${admin.isSuperAdmin ? " (main admin)" : ""}`
    );
  }
  console.log("Admin accounts ready. Password: Admin123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
