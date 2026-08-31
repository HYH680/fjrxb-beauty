import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { draftReviewJob } from "@/lib/draft-review";
import { productIdFrom, requireProductOps } from "@/lib/ops-guard";
import { sendReviewReply } from "@/lib/shop-adapters";

export async function GET(request: NextRequest) {
  const auth = await requireProductOps(productIdFrom(request));
  if (auth.error) return auth.error;
  const reviews = await prisma.reviewJob.findMany({
    where: { userId: auth.session.id, productId: auth.productId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ reviews });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  const content = String(body.content || "").trim();
  if (!content) {
    return NextResponse.json({ error: "请粘贴一条顾客评价" }, { status: 400 });
  }
  const review = await prisma.reviewJob.create({
    data: {
      userId: auth.session.id,
      productId: auth.productId,
      connectionId:
        typeof body.connectionId === "string" && body.connectionId
          ? body.connectionId
          : null,
      platform: String(body.platform || "shop"),
      externalId: String(body.externalId || "").slice(0, 80),
      rating: Math.min(5, Math.max(1, Number(body.rating) || 5)),
      author: String(body.author || "顾客").slice(0, 40),
      content: content.slice(0, 2000),
      status: "inbox",
    },
  });
  return NextResponse.json({ ok: true, review });
}

export async function PUT(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  const id = String(body.id || "");
  const action = String(body.action || "");
  const review = await prisma.reviewJob.findFirst({
    where: { id, userId: auth.session.id, productId: auth.productId },
    include: { connection: true },
  });
  if (!review) return NextResponse.json({ error: "评论不存在" }, { status: 404 });

  if (action === "saveDraft") {
    const draftReply = String(body.draftReply || "").trim().slice(0, 800);
    if (!draftReply) {
      return NextResponse.json({ error: "回复不能为空" }, { status: 400 });
    }
    const updated = await prisma.reviewJob.update({
      where: { id: review.id },
      data: { draftReply, status: "drafted" },
    });
    return NextResponse.json({ ok: true, review: updated });
  }

  if (action === "draft") {
    const result = await draftReviewJob(review.id, auth.session.id);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true, review: result.review, route: result.route });
  }

  if (action === "send") {
    if (!review.draftReply) {
      return NextResponse.json({ error: "还没有生成回复" }, { status: 400 });
    }
    if (!review.connection) {
      const updated = await prisma.reviewJob.update({
        where: { id: review.id },
        data: {
          status: "queued",
          lastError: "回复已按提示词写好。绑定店铺回复接口后即可发出。",
        },
      });
      return NextResponse.json({ ok: true, review: updated });
    }
    const result = await sendReviewReply(review.connection, review);
    const updated = await prisma.reviewJob.update({
      where: { id: review.id },
      data: {
        status: result.status === "sent" ? "sent" : result.status,
        lastError: result.error,
        sentAt: result.ok ? new Date() : null,
      },
    });
    return NextResponse.json({ ok: true, review: updated });
  }

  return NextResponse.json({ error: "未知操作" }, { status: 400 });
}
