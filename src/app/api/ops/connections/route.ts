import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { encryptSecret, maskSecret, decryptSecret } from "@/lib/secret-box";
import { productIdFrom, requireProductOps } from "@/lib/ops-guard";
import { pullShopReviews, testShopConnection } from "@/lib/shop-adapters";

function publicConnection(row: {
  id: string;
  platform: string;
  shopName: string;
  shopId: string;
  appKeyEnc: string;
  pullUrl: string;
  replyUrl: string;
  inboundToken: string;
  status: string;
  lastError: string;
  lastSyncAt: Date | null;
}) {
  return {
    id: row.id,
    platform: row.platform,
    shopName: row.shopName,
    shopId: row.shopId,
    appKeyMasked: maskSecret(decryptSecret(row.appKeyEnc)),
    hasSecret: Boolean(row.appKeyEnc),
    pullUrl: row.pullUrl,
    replyUrl: row.replyUrl,
    inboundToken: row.inboundToken,
    status: row.status,
    lastError: row.lastError,
    lastSyncAt: row.lastSyncAt,
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireProductOps(productIdFrom(request));
  if (auth.error) return auth.error;
  const rows = await prisma.shopConnection.findMany({
    where: { userId: auth.session.id, productId: auth.productId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ connections: rows.map(publicConnection) });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  if (body.password || body.loginPassword) {
    return NextResponse.json(
      { error: "不要发商家 App 登录密码。只要开放平台 AppKey / Secret。" },
      { status: 400 }
    );
  }
  const platform = String(body.platform || "meituan");
  const shopName = String(body.shopName || "").trim().slice(0, 40);
  if (!shopName) {
    return NextResponse.json({ error: "请填写店铺名称" }, { status: 400 });
  }

  const appKey = String(body.appKey || "").trim();
  const appSecret = String(body.appSecret || "").trim();
  const inboundToken = randomBytes(16).toString("hex");

  const created = await prisma.shopConnection.create({
    data: {
      userId: auth.session.id,
      productId: auth.productId,
      platform,
      shopName,
      shopId: String(body.shopId || "").slice(0, 80),
      appKeyEnc: encryptSecret(appKey),
      appSecretEnc: encryptSecret(appSecret),
      pullUrl: String(body.pullUrl || "").slice(0, 300),
      replyUrl: String(body.replyUrl || "").slice(0, 300),
      inboundToken,
      status: "draft",
    },
  });

  const test = await testShopConnection(created);
  const saved = await prisma.shopConnection.update({
    where: { id: created.id },
    data: { status: test.status, lastError: test.error || test.note || "" },
  });

  return NextResponse.json({
    ok: true,
    connection: publicConnection(saved),
    note: test.note || test.error,
  });
}

export async function PATCH(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  if (body.password || body.loginPassword) {
    return NextResponse.json(
      { error: "不要发商家 App 登录密码。只要开放平台 AppKey / Secret。" },
      { status: 400 }
    );
  }
  const id = String(body.id || "");
  const row = await prisma.shopConnection.findFirst({
    where: { id, userId: auth.session.id, productId: auth.productId },
  });
  if (!row) return NextResponse.json({ error: "店铺不存在" }, { status: 404 });

  const appKey = String(body.appKey || "").trim();
  const appSecret = String(body.appSecret || "").trim();
  const next = await prisma.shopConnection.update({
    where: { id: row.id },
    data: {
      shopName: body.shopName ? String(body.shopName).slice(0, 40) : row.shopName,
      shopId: body.shopId !== undefined ? String(body.shopId).slice(0, 80) : row.shopId,
      pullUrl: body.pullUrl !== undefined ? String(body.pullUrl).slice(0, 300) : row.pullUrl,
      replyUrl: body.replyUrl !== undefined ? String(body.replyUrl).slice(0, 300) : row.replyUrl,
      ...(appKey ? { appKeyEnc: encryptSecret(appKey) } : {}),
      ...(appSecret ? { appSecretEnc: encryptSecret(appSecret) } : {}),
    },
  });
  const test = await testShopConnection(next);
  const saved = await prisma.shopConnection.update({
    where: { id: next.id },
    data: { status: test.status, lastError: test.error || test.note || "" },
  });
  return NextResponse.json({
    ok: true,
    connection: publicConnection(saved),
    note: test.note || test.error,
  });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  const id = String(body.id || "");
  const row = await prisma.shopConnection.findFirst({
    where: { id, userId: auth.session.id, productId: auth.productId },
  });
  if (!row) return NextResponse.json({ error: "店铺不存在" }, { status: 404 });

  const pulled = await pullShopReviews(row);
  await prisma.shopConnection.update({
    where: { id: row.id },
    data: {
      lastSyncAt: pulled.ok ? new Date() : row.lastSyncAt,
      lastError: pulled.error,
    },
  });
  return NextResponse.json({
    ok: pulled.ok,
    created: pulled.created,
    error: pulled.error || undefined,
  });
}
