import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma() {
  return new PrismaClient();
}

function isCurrentClient(client: PrismaClient | undefined): client is PrismaClient {
  return Boolean(client && "reviewJob" in client && client.reviewJob);
}

export const prisma = isCurrentClient(globalForPrisma.prisma)
  ? globalForPrisma.prisma
  : createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
