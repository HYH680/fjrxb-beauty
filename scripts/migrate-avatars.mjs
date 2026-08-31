import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRESET_PREFIX = "/avatars/presets/";
const OLD_REGEX = /\/avatars\/presets\/avatar-(\d{2})\.svg$/;

function mapLegacyUrl(url) {
  const match = OLD_REGEX.exec(url);
  if (!match) return null;
  let n = parseInt(match[1], 10);
  if (n < 1 || n > 48) n = 1;
  const mapped = ((n - 1) % 16) + 1;
  const suffix = mapped.toString().padStart(2, "0");
  return `${PRESET_PREFIX}avatar-${suffix}.png`;
}

async function main() {
  const oldRows = await prisma.$queryRawUnsafe(
    `SELECT id, avatarUrl FROM "User" WHERE avatarUrl LIKE '/avatars/presets/avatar-%.svg'`
  );

  if (!Array.isArray(oldRows) || oldRows.length === 0) {
    console.log("No legacy .svg preset avatar URLs found.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Found ${oldRows.length} user(s) with legacy .svg preset avatars.`);

  let updated = 0;
  for (const row of oldRows) {
    const newUrl = mapLegacyUrl(row.avatarUrl);
    if (!newUrl) continue;
    await prisma.user.update({
      where: { id: row.id },
      data: { avatarUrl: newUrl },
    });
    console.log(`  ${row.id}: ${row.avatarUrl} -> ${newUrl}`);
    updated++;
  }

  const remaining = await prisma.$queryRawUnsafe(
    `SELECT COUNT(*) as c FROM "User" WHERE avatarUrl LIKE '/avatars/presets/avatar-%.svg'`
  );

  console.log(`Migrated ${updated} row(s). Remaining .svg preset URLs: ${remaining[0]?.c ?? "?"}`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
