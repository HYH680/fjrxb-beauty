import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import {
  formatMemoryForPrompt,
  loadShopMemory,
  upsertShopMemory,
  type ShopFacts,
} from "@/lib/shop-consultant";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const productId = request.nextUrl.searchParams.get("productId")?.trim();
  if (!productId) {
    return NextResponse.json({ error: "缺少 productId" }, { status: 400 });
  }
  const subscribed = await hasActiveSubscription(session.id, productId);
  if (!subscribed) {
    return NextResponse.json({ error: "开通这项服务后才能使用" }, { status: 403 });
  }

  const memory = await loadShopMemory(session.id, productId);
  return NextResponse.json({
    summary: memory.summary,
    facts: memory.facts,
    promptPreview: formatMemoryForPrompt(memory),
  });
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!productId) {
    return NextResponse.json({ error: "缺少 productId" }, { status: 400 });
  }
  const subscribed = await hasActiveSubscription(session.id, productId);
  if (!subscribed) {
    return NextResponse.json({ error: "开通这项服务后才能使用" }, { status: 403 });
  }

  const summary = typeof body.summary === "string" ? body.summary : undefined;
  const facts =
    body.facts && typeof body.facts === "object"
      ? (body.facts as ShopFacts)
      : undefined;

  await upsertShopMemory(session.id, productId, { summary, facts });
  const memory = await loadShopMemory(session.id, productId);
  return NextResponse.json({ ok: true, memory });
}
