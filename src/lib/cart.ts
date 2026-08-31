import { prisma } from "@/lib/prisma";
import { listCatalog } from "@/lib/catalog";
import type { CartItem, Product } from "@/types";

async function catalogById() {
  const catalog = await listCatalog();
  return new Map(catalog.map((product) => [product.id, product]));
}

export async function productsFromIds(productIds: string[]): Promise<Product[]> {
  const unique = [...new Set(productIds)];
  const byId = await catalogById();
  return unique
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
}

export async function cartItemsFromIds(productIds: string[]): Promise<CartItem[]> {
  const products = await productsFromIds(productIds);
  return products.map((product) => ({
    product,
    quantity: 1,
  }));
}

export async function getUserCartIds(userId: string): Promise<string[]> {
  try {
    const rows = await prisma.cartItem.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      select: { productId: true },
    });
    const byId = await catalogById();
    return rows.map((row) => row.productId).filter((id) => byId.has(id));
  } catch {
    return [];
  }
}

export async function replaceUserCart(
  userId: string,
  productIds: string[]
): Promise<string[]> {
  const validIds = (await productsFromIds(productIds)).map((product) => product.id);
  await prisma.$transaction(async (tx) => {
    await tx.cartItem.deleteMany({ where: { userId } });
    if (validIds.length > 0) {
      await tx.cartItem.createMany({
        data: validIds.map((productId) => ({ userId, productId })),
      });
    }
  });
  return validIds;
}

export async function clearUserCart(userId: string): Promise<void> {
  try {
    await prisma.cartItem.deleteMany({ where: { userId } });
  } catch {
    // 服务单表异常时不影响已完成的收款
  }
}
