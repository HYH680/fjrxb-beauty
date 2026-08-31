import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const all = await prisma.user.findMany({ select: { id: true, avatarUrl: true } });
  console.log("total users:", all.length);

  const svgs = all.filter((u) => u.avatarUrl && u.avatarUrl.endsWith(".svg"));
  console.log("users with .svg avatarUrl:", svgs.length);
  if (svgs.length > 0) {
    for (const u of svgs) console.log("  legacy:", u.id, u.avatarUrl);
  }

  const counts = new Map();
  for (const u of all) {
    const k = u.avatarUrl || "(null)";
    counts.set(k, (counts.get(k) || 0) + 1);
  }
  console.log("avatarUrl distribution:");
  for (const [k, v] of counts) console.log(`  ${v} x ${k}`);

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error("FAILED:", err && err.message ? err.message : err);
  process.exit(1);
});
