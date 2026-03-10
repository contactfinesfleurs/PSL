/**
 * Promote an existing profile to SUPER_ADMIN by email.
 *
 * Usage:
 *   npx dotenv -e .env.local -- npx tsx scripts/make-super-admin.ts you@example.com
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/make-super-admin.ts <email>");
    process.exit(1);
  }

  const profile = await prisma.profile.findUnique({ where: { email } });
  if (!profile) {
    console.error(`No profile found with email: ${email}`);
    process.exit(1);
  }

  if (profile.role === "SUPER_ADMIN") {
    console.log(`${email} is already SUPER_ADMIN. Nothing to do.`);
    process.exit(0);
  }

  await prisma.profile.update({
    where: { email },
    data: { role: "SUPER_ADMIN" },
  });

  console.log(`✓ ${profile.name} (${email}) is now SUPER_ADMIN.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
