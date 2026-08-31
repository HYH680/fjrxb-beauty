import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyN8nInbound, notifyN8n } from "@/lib/integrations/n8n";
import { enqueueJob } from "@/lib/integrations/jobs";
import { draftInboxForUser } from "@/lib/draft-review";

/** n8n → 本站：拉评起草、入队提醒等 */
export async function POST(request: NextRequest) {
  const secret =
    request.headers.get("x-n8n-secret") ||
    request.headers.get("x-inbound-secret");
  if (!verifyN8nInbound(secret)) {
    return NextResponse.json({ error: "密钥无效" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const userId = typeof body.userId === "string" ? body.userId : "";
  const productId = typeof body.productId === "string" ? body.productId : "";

  if (action === "draft-reviews") {
    if (!userId || !productId) {
      return NextResponse.json({ error: "需要 userId productId" }, { status: 400 });
    }
    const result = await draftInboxForUser(userId, productId);
    return NextResponse.json({ ok: true, result });
  }

  if (action === "enqueue") {
    if (!userId || !body.type) {
      return NextResponse.json({ error: "需要 userId type" }, { status: 400 });
    }
    const job = await enqueueJob({
      userId,
      productId,
      type: String(body.type),
      payload: body.payload || {},
      runAt: body.runAt ? new Date(body.runAt) : new Date(),
    });
    return NextResponse.json({ ok: true, job });
  }

  if (action === "ping") {
    await notifyN8n("pong", { from: "ai-supermarket", at: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  }

  if (action === "list-connections") {
    if (!userId) {
      return NextResponse.json({ error: "需要 userId" }, { status: 400 });
    }
    const connections = await prisma.shopConnection.findMany({
      where: { userId, ...(productId ? { productId } : {}) },
      select: {
        id: true,
        productId: true,
        platform: true,
        shopName: true,
        status: true,
        pullUrl: true,
        replyUrl: true,
      },
    });
    return NextResponse.json({ ok: true, connections });
  }

  return NextResponse.json(
    { error: "action: draft-reviews | enqueue | ping | list-connections" },
    { status: 400 }
  );
}
