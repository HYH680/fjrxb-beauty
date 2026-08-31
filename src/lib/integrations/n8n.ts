/** n8n 编排层：出站 webhook + 入站共享密钥校验 */

import {
  resolveFeatureEnabled,
  resolveServiceBase,
} from "@/lib/integrations/feature-flags";

export async function n8nConfigured() {
  return resolveFeatureEnabled("n8n");
}

export async function notifyN8n(
  event: string,
  payload: Record<string, unknown>
) {
  if (!(await resolveFeatureEnabled("n8n"))) {
    return { ok: false as const, skipped: true as const };
  }

  const url = await resolveServiceBase("n8n");
  if (!url) return { ok: false as const, skipped: true as const };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.N8N_WEBHOOK_SECRET
        ? { "X-N8N-Secret": process.env.N8N_WEBHOOK_SECRET }
        : {}),
    },
    body: JSON.stringify({
      event,
      at: new Date().toISOString(),
      source: "ai-supermarket",
      ...payload,
    }),
  });
  if (!res.ok) {
    throw new Error(`n8n webhook ${res.status}`);
  }
  return { ok: true as const, skipped: false as const };
}

export function verifyN8nInbound(secret: string | null) {
  const expected = process.env.N8N_INBOUND_SECRET?.trim();
  if (!expected) return true;
  return Boolean(secret && secret === expected);
}
