import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { listCatalog, getCatalogProduct } from "@/lib/catalog";
import { isDeveloperEmail } from "@/lib/admin";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  if (isDeveloperEmail(session.email)) {
    const catalog = await listCatalog({ includeHidden: true });
    const subscriptions = catalog.map((product) => ({
      id: `dev:${product.id}`,
      productId: product.id,
      status: "active",
      paymentMethod: "developer",
      createdAt: new Date(0).toISOString(),
      name: product.name,
      price: product.price,
      unit: product.unit,
    }));
    return NextResponse.json({ subscriptions, fullAccess: true });
  }

  const rows = await prisma.subscription.findMany({
    where: { userId: session.id },
    orderBy: { createdAt: "desc" },
  });

  const subscriptions = [];
  for (const row of rows) {
    const product = await getCatalogProduct(row.productId, { includeHidden: true });
    subscriptions.push({
      id: row.id,
      productId: row.productId,
      status: row.status,
      paymentMethod: row.paymentMethod,
      createdAt: row.createdAt,
      name: product?.name ?? row.productId,
      price: product?.price ?? 0,
      unit: product?.unit ?? "月",
    });
  }

  return NextResponse.json({ subscriptions, fullAccess: false });
}
