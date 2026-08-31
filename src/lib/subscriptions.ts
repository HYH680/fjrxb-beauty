import { prisma } from "@/lib/prisma";
import { isDeveloperEmail } from "@/lib/admin";

const USABLE_STATUSES = ["active", "paid"];

export function isUsableSubscriptionStatus(status: string) {
  return USABLE_STATUSES.includes(status);
}

export async function userHasFullServiceAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  return isDeveloperEmail(user?.email);
}

export async function getActiveSubscription(userId: string, productId: string) {
  if (await userHasFullServiceAccess(userId)) {
    return {
      id: `dev:${productId}`,
      userId,
      productId,
      status: "active",
      paymentMethod: "developer",
    };
  }

  return prisma.subscription.findFirst({
    where: {
      userId,
      productId,
      status: { in: USABLE_STATUSES },
    },
  });
}

export async function hasActiveSubscription(userId: string, productId: string) {
  const row = await getActiveSubscription(userId, productId);
  return Boolean(row);
}
