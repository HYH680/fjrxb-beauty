import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { prisma } from "@/lib/prisma";
import { addKnowledgeChunk } from "@/lib/shop-consultant";

/** List or add light-RAG knowledge chunks for the current user's product. */
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

  const items = await prisma.knowledgeChunk.findMany({
    where: { userId: session.id, productId },
    orderBy: { updatedAt: "desc" },
    take: 50,
    select: { id: true, title: true, source: true, text: true, updatedAt: true },
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const text = typeof body.text === "string" ? body.text : "";
  const title = typeof body.title === "string" ? body.title : "";
  const source = typeof body.source === "string" ? body.source : "manual";

  if (!productId || !text.trim()) {
    return NextResponse.json({ error: "需要 productId 和 text" }, { status: 400 });
  }
  const subscribed = await hasActiveSubscription(session.id, productId);
  if (!subscribed) {
    return NextResponse.json({ error: "开通这项服务后才能使用" }, { status: 403 });
  }

  const item = await addKnowledgeChunk({
    userId: session.id,
    productId,
    text,
    title,
    source,
  });
  return NextResponse.json({ ok: true, item });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const id = request.nextUrl.searchParams.get("id")?.trim();
  if (!id) {
    return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  }
  const row = await prisma.knowledgeChunk.findFirst({
    where: { id, userId: session.id },
  });
  if (!row) {
    return NextResponse.json({ error: "资料不存在" }, { status: 404 });
  }
  await prisma.knowledgeChunk.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
