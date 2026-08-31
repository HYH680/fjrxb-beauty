import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  // Force client awareness by raw alter if needed
  try {
    await prisma.$executeRawUnsafe(
      `ALTER TABLE User ADD COLUMN avatarUrl TEXT`
    );
    console.log("added avatarUrl via raw SQL");
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/duplicate column|already exists/i.test(msg)) {
      console.log("avatarUrl already present");
    } else {
      console.log("alter result:", msg);
    }
  }
  const rows = await prisma.$queryRawUnsafe(`PRAGMA table_info(User)`);
  console.log(rows);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
