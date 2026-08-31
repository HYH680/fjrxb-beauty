import { Langfuse } from "langfuse";
import { prisma } from "@/lib/prisma";

let client: Langfuse | null | undefined;

function getLangfuse() {
  if (client !== undefined) return client;
  const publicKey = process.env.LANGFUSE_PUBLIC_KEY?.trim();
  const secretKey = process.env.LANGFUSE_SECRET_KEY?.trim();
  if (!publicKey || !secretKey) {
    client = null;
    return client;
  }
  client = new Langfuse({
    publicKey,
    secretKey,
    baseUrl: process.env.LANGFUSE_BASE_URL?.trim() || "https://cloud.langfuse.com",
  });
  return client;
}

export function langfuseEnabled() {
  return Boolean(getLangfuse());
}

export async function traceLlmCall(input: {
  userId: string;
  productId: string;
  model: string;
  route?: string;
  messages: unknown;
  response: unknown;
  ok: boolean;
  latencyMs: number;
  tokensIn?: number;
  tokensOut?: number;
}) {
  const tokensIn = input.tokensIn ?? 0;
  const tokensOut = input.tokensOut ?? 0;

  try {
    await prisma.usageEvent.create({
      data: {
        userId: input.userId,
        productId: input.productId,
        model: input.model,
        route: input.route || "",
        tokensIn,
        tokensOut,
        latencyMs: input.latencyMs,
        ok: input.ok,
      },
    });
  } catch {
    /* ignore local mirror failure */
  }

  const lf = getLangfuse();
  if (!lf) return;

  try {
    const trace = lf.trace({
      name: "workspace-chat",
      userId: input.userId,
      metadata: { productId: input.productId, route: input.route },
    });
    trace.generation({
      name: "chat.completions",
      model: input.model,
      input: input.messages,
      output: input.response,
      usage: {
        input: tokensIn || undefined,
        output: tokensOut || undefined,
        total: tokensIn + tokensOut || undefined,
      },
      metadata: { ok: input.ok, latencyMs: input.latencyMs },
    });
    await lf.flushAsync();
  } catch {
    /* observability must not break chat */
  }
}

export async function summarizeUsageForUser(userId: string, days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await prisma.usageEvent.findMany({
    where: { userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  const byProduct = new Map<
    string,
    { calls: number; tokensIn: number; tokensOut: number }
  >();
  for (const row of rows) {
    const key = row.productId || "guide";
    const cur = byProduct.get(key) || { calls: 0, tokensIn: 0, tokensOut: 0 };
    cur.calls += 1;
    cur.tokensIn += row.tokensIn;
    cur.tokensOut += row.tokensOut;
    byProduct.set(key, cur);
  }
  return {
    totalCalls: rows.length,
    products: [...byProduct.entries()].map(([productId, stats]) => ({
      productId,
      ...stats,
    })),
  };
}
