import { prisma } from "@/lib/prisma";

type IncomingReview = {
  id?: string;
  reviewId?: string;
  externalId?: string;
  content?: string;
  comment?: string;
  review?: string;
  rating?: number;
  star?: number;
  author?: string;
  userName?: string;
};

export async function ingestConnectionReviews(input: {
  userId: string;
  productId: string;
  connectionId: string;
  platform: string;
  items: IncomingReview[];
}) {
  let created = 0;
  for (const item of input.items) {
    const content = String(item.content || item.comment || item.review || "").trim();
    if (!content) continue;
    const externalId = String(item.id || item.reviewId || item.externalId || "").slice(0, 80);
    if (externalId) {
      const exists = await prisma.reviewJob.findFirst({
        where: { connectionId: input.connectionId, externalId },
      });
      if (exists) continue;
    }
    await prisma.reviewJob.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        connectionId: input.connectionId,
        platform: input.platform,
        externalId,
        rating: Math.min(5, Math.max(1, Number(item.rating || item.star || 5))),
        author: String(item.author || item.userName || "顾客").slice(0, 40),
        content: content.slice(0, 2000),
        status: "inbox",
      },
    });
    created += 1;
  }
  return created;
}

export function parseReviewPayload(body: unknown): IncomingReview[] {
  if (!body || typeof body !== "object") return [];
  const record = body as Record<string, unknown>;
  const raw =
    record.reviews ||
    record.data ||
    record.list ||
    record.items ||
    record.comments;
  if (Array.isArray(raw)) return raw as IncomingReview[];
  return [record as IncomingReview];
}
