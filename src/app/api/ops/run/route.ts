import { NextRequest, NextResponse } from "next/server";
import { draftInboxForUser } from "@/lib/draft-review";
import { prisma } from "@/lib/prisma";
import { getServiceBrief, isReviewOps } from "@/lib/service-briefs";
import { productIdFrom, requireProductOps } from "@/lib/ops-guard";
import { pullShopReviews } from "@/lib/shop-adapters";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;

  const brief = getServiceBrief(auth.productId);
  const steps: string[] = [];

  // 只有评价类服务才拉评 / 起草评论箱；其它服务避免误触发 webhook
  if (isReviewOps(auth.productId)) {
    const shops = await prisma.shopConnection.findMany({
      where: { userId: auth.session.id, productId: auth.productId },
    });
    for (const shop of shops) {
      const pulled = await pullShopReviews(shop);
      await prisma.shopConnection.update({
        where: { id: shop.id },
        data: {
          lastSyncAt: pulled.ok ? new Date() : shop.lastSyncAt,
          lastError: pulled.error,
        },
      });
      steps.push(
        pulled.ok
          ? `${shop.shopName}：拉到 ${pulled.created} 条`
          : `${shop.shopName}：${pulled.error}`
      );
    }

    const drafted = await draftInboxForUser(auth.session.id, auth.productId);
    if (drafted.drafted) {
      steps.push(
        `已按本店提示词起草 ${drafted.drafted} 条${
          drafted.sent ? `，发出 ${drafted.sent} 条` : ""
        }`
      );
    } else if (!shops.length) {
      steps.push(
        "还没有店铺资料。把开放平台材料发到上面窗口可接入；没有凭证也可以先贴评价起草。\n说明：自动同步走的是你提供的兼容接口（webhook），不是美团/淘宝官方一键授权。"
      );
    } else {
      steps.push("评论箱暂时没有待写的评价。也可把单条评价贴到上面窗口起草。");
    }
  } else if (brief.kind === "cs-ops") {
    steps.push(
      "客服服务当前以「话术起草」为主：把顾客消息贴到上面窗口即可。\n本站不会自动接管淘宝/京东等站内信；要自动发出需另接各平台开放平台消息接口。"
    );
  } else if (brief.kind === "vision-run") {
    steps.push(
      "看图服务：把照片或 PDF（自动转前几页）发到上面窗口，并说明要盯的点。结果是草稿，请人复核后再用。"
    );
  } else {
    steps.push("把这项服务需要的资料发到上面窗口，我会按场景帮你起草和落地。");
  }

  return NextResponse.json({ ok: true, steps, reply: steps.join("\n") });
}
