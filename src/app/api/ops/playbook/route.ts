import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productIdFrom, requireProductOps } from "@/lib/ops-guard";
import { getMerchantSetup } from "@/lib/merchant-agent";

export async function GET(request: NextRequest) {
  const auth = await requireProductOps(productIdFrom(request));
  if (auth.error) return auth.error;
  const playbook = await prisma.replyPlaybook.findUnique({
    where: { userId_productId: { userId: auth.session.id, productId: auth.productId } },
  });
  const setup = await getMerchantSetup(auth.session.id, auth.productId);
  return NextResponse.json({
    saved: Boolean(playbook?.extraPrompt),
    playbook: playbook ?? {
      shopDisplayName: "",
      tone: "稳重热情",
      addressAs: "我们",
      mustInclude: "",
      neverSay: "",
      goodReviewHint: "",
      badReviewHint: "",
      extraPrompt: "",
      autoSendGood: false,
      selectedPlatforms: "[]",
    },
    setup,
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  const extraPrompt = String(body.extraPrompt || "").trim();
  const shopDisplayName = String(body.shopDisplayName || "").trim();
  if (!extraPrompt) {
    return NextResponse.json(
      { error: "请写下这项服务的提示词，不能只用通用模板。" },
      { status: 400 }
    );
  }
  const playbook = await prisma.replyPlaybook.upsert({
    where: { userId_productId: { userId: auth.session.id, productId: auth.productId } },
    create: {
      userId: auth.session.id,
      productId: auth.productId,
      shopDisplayName: shopDisplayName.slice(0, 40),
      tone: String(body.tone || "稳重热情").slice(0, 20),
      addressAs: String(body.addressAs || "我们").slice(0, 10),
      mustInclude: String(body.mustInclude || "").slice(0, 200),
      neverSay: String(body.neverSay || "").slice(0, 200),
      goodReviewHint: String(body.goodReviewHint || "").slice(0, 400),
      badReviewHint: String(body.badReviewHint || "").slice(0, 400),
      extraPrompt: extraPrompt.slice(0, 2000),
      autoSendGood: Boolean(body.autoSendGood),
    },
    update: {
      shopDisplayName: shopDisplayName.slice(0, 40),
      tone: String(body.tone || "稳重热情").slice(0, 20),
      addressAs: String(body.addressAs || "我们").slice(0, 10),
      mustInclude: String(body.mustInclude || "").slice(0, 200),
      neverSay: String(body.neverSay || "").slice(0, 200),
      goodReviewHint: String(body.goodReviewHint || "").slice(0, 400),
      badReviewHint: String(body.badReviewHint || "").slice(0, 400),
      extraPrompt: extraPrompt.slice(0, 2000),
      autoSendGood: Boolean(body.autoSendGood),
    },
  });
  return NextResponse.json({ ok: true, playbook });
}
