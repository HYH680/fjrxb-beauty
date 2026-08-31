import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { draftInboxForUser } from "@/lib/draft-review";
import { notifyN8n } from "@/lib/integrations/n8n";

export type JobType =
  | "contract-reminder"
  | "draft-reviews"
  | "n8n-dispatch"
  | "generic";

export async function enqueueJob(input: {
  userId: string;
  productId?: string;
  type: JobType | string;
  payload?: Record<string, unknown>;
  runAt?: Date;
}) {
  return prisma.job.create({
    data: {
      userId: input.userId,
      productId: input.productId || "",
      type: input.type,
      payload: JSON.stringify(input.payload || {}),
      runAt: input.runAt || new Date(),
      status: "pending",
    },
  });
}

function parsePayload(raw: string) {
  try {
    return JSON.parse(raw || "{}") as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function runOne(job: {
  id: string;
  userId: string;
  productId: string;
  type: string;
  payload: string;
  attempts: number;
}) {
  const payload = parsePayload(job.payload);

  if (job.type === "contract-reminder") {
    const title = String(payload.title || "合同提醒");
    const detail = String(payload.detail || "有一份合同节点到期");
    const email = String(payload.email || "");
    if (email) {
      await sendEmail({
        to: email,
        subject: `AI智能体超市 · ${title}`,
        text: detail,
        html: `<p>${detail}</p>`,
      });
    }
    await notifyN8n("contract-reminder", {
      userId: job.userId,
      productId: job.productId,
      title,
      detail,
    });
    return;
  }

  if (job.type === "draft-reviews") {
    await draftInboxForUser(job.userId, job.productId);
    return;
  }

  if (job.type === "n8n-dispatch") {
    await notifyN8n(String(payload.event || "job"), {
      userId: job.userId,
      productId: job.productId,
      ...payload,
    });
    return;
  }
}

export async function processDueJobs(limit = 20) {
  const now = new Date();
  const due = await prisma.job.findMany({
    where: { status: "pending", runAt: { lte: now } },
    orderBy: { runAt: "asc" },
    take: limit,
  });

  const results: { id: string; ok: boolean; error?: string }[] = [];
  for (const job of due) {
    await prisma.job.update({
      where: { id: job.id },
      data: { status: "running", attempts: job.attempts + 1 },
    });
    try {
      await runOne(job);
      await prisma.job.update({
        where: { id: job.id },
        data: { status: "done", finishedAt: new Date(), lastError: "" },
      });
      results.push({ id: job.id, ok: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "执行失败";
      const retry = job.attempts + 1 < 5;
      await prisma.job.update({
        where: { id: job.id },
        data: {
          status: retry ? "pending" : "failed",
          lastError: message,
          runAt: retry ? new Date(Date.now() + 60_000 * (job.attempts + 1)) : job.runAt,
        },
      });
      results.push({ id: job.id, ok: false, error: message });
    }
  }
  return results;
}
