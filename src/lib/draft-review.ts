import { getCatalogProduct } from "@/lib/catalog";
import { describeRoute, resolveModelRoute } from "@/lib/model-router";
import {
  chatTemperature,
  extractAssistantText,
  shouldRetryTemperatureOne,
} from "@/lib/llm-config";
import { prisma } from "@/lib/prisma";
import { buildReviewSystemPrompt } from "@/lib/review-prompt";
import { sendReviewReply } from "@/lib/shop-adapters";

export async function draftReviewJob(reviewId: string, userId: string) {
  const review = await prisma.reviewJob.findFirst({
    where: { id: reviewId, userId },
    include: { connection: true },
  });
  if (!review) return { ok: false as const, error: "评论不存在" };

  const playbook = await prisma.replyPlaybook.findUnique({
    where: { userId_productId: { userId, productId: review.productId } },
  });
  if (!playbook) {
    return { ok: false as const, error: "还没有这家店的提示词，无法起草。" };
  }

  const product = await getCatalogProduct(review.productId, { includeHidden: true });
  if (!product) return { ok: false as const, error: "服务不存在" };

  const route = resolveModelRoute({
    product,
    message: review.content,
    hasImages: false,
  });
  if (route.attempts.length === 0) {
    return { ok: false as const, error: "暂时没有可写回复的模型" };
  }

  let draftReply = "";
  let usedLabel = route.label;
  let lastError = "生成回复失败";
  for (const config of route.attempts) {
    let temperature = chatTemperature(config.model, 0.5);
    const payload = {
      model: config.model,
      messages: [
        { role: "system", content: buildReviewSystemPrompt(playbook, review) },
        {
          role: "user",
          content: `评分 ${review.rating} 星${review.author ? `，${review.author}` : ""}：\n${review.content}`,
        },
      ],
      temperature,
      max_tokens: 280,
    };
    let res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify(payload),
    });
    let data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = String(
        (data as { error?: { message?: string }; message?: string })?.error?.message ||
          (data as { message?: string }).message ||
          ""
      );
      if (shouldRetryTemperatureOne(detail, temperature)) {
        payload.temperature = 1;
        res = await fetch(`${config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify(payload),
        });
        data = await res.json().catch(() => ({}));
      }
    }
    const text = extractAssistantText(data);
    if (res.ok && text) {
      draftReply = text;
      usedLabel = describeRoute(config, route.task);
      break;
    }
    lastError = String(
      (data as { error?: { message?: string }; message?: string })?.error?.message ||
        (data as { message?: string }).message ||
        lastError
    );
  }
  if (!draftReply) return { ok: false as const, error: lastError.slice(0, 220) };

  let status = "drafted";
  let lastJobError = "";
  let sentAt: Date | null = null;
  if (playbook.autoSendGood && review.rating >= 4 && review.connection) {
    const result = await sendReviewReply(review.connection, {
      ...review,
      draftReply,
    });
    status = result.ok ? "sent" : result.status;
    lastJobError = result.error;
    sentAt = result.ok ? new Date() : null;
  }

  const updated = await prisma.reviewJob.update({
    where: { id: review.id },
    data: { draftReply, status, lastError: lastJobError, sentAt },
  });
  return { ok: true as const, review: updated, route: usedLabel };
}

export async function draftInboxForUser(userId: string, productId: string, limit = 8) {
  const pending = await prisma.reviewJob.findMany({
    where: {
      userId,
      productId,
      status: { in: ["inbox", "failed"] },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  let drafted = 0;
  let sent = 0;
  const errors: string[] = [];
  for (const item of pending) {
    const result = await draftReviewJob(item.id, userId);
    if (!result.ok) {
      errors.push(result.error);
      continue;
    }
    drafted += 1;
    if (result.review.status === "sent") sent += 1;
  }
  return { drafted, sent, errors };
}
