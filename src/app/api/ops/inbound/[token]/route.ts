import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ingestConnectionReviews, parseReviewPayload } from "@/lib/review-ingest";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params;
  const connection = await prisma.shopConnection.findUnique({
    where: { inboundToken: token },
  });
  if (!connection) {
    return NextResponse.json({ error: "接入令牌无效" }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const created = await ingestConnectionReviews({
    userId: connection.userId,
    productId: connection.productId,
    connectionId: connection.id,
    platform: connection.platform,
    items: parseReviewPayload(body),
  });

  await prisma.shopConnection.update({
    where: { id: connection.id },
    data: { lastSyncAt: new Date(), lastError: "" },
  });

  return NextResponse.json({ ok: true, created });
}
