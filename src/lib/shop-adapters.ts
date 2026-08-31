import { decryptSecret } from "@/lib/secret-box";
import { ingestConnectionReviews, parseReviewPayload } from "@/lib/review-ingest";

export type ShopPayload = {
  platform: string;
  shopName: string;
  shopId: string;
  appKeyEnc: string;
  appSecretEnc: string;
  pullUrl: string;
  replyUrl: string;
};

export async function testShopConnection(row: ShopPayload) {
  const appKey = decryptSecret(row.appKeyEnc);
  const pullUrl = row.pullUrl.trim();
  const replyUrl = row.replyUrl.trim();
  if (!appKey) {
    return {
      ok: false,
      status: "draft",
      error: "还没填开放平台 AppKey。不要发登录密码，只要开放平台密钥。",
    };
  }
  if (!pullUrl && !replyUrl) {
    return {
      ok: true,
      status: "awaiting_endpoint",
      error: "",
      note: "密钥已收。还差拉取/回复接口地址。客户从美团或点评开放平台把接口地址发来后，系统会自动接上。",
    };
  }
  const target = pullUrl || replyUrl;
  try {
    const res = await fetch(target, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${appKey}`,
        "Content-Type": "application/json",
      },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok || res.status === 401 || res.status === 403) {
      return {
        ok: true,
        status: res.ok ? "connected" : "needs_auth",
        error: res.ok ? "" : `接口已通，但鉴权返回 ${res.status}，请核对 AppKey / 签名。`,
      };
    }
    return {
      ok: false,
      status: "error",
      error: `接口返回 ${res.status}`,
    };
  } catch (error) {
    return {
      ok: false,
      status: "error",
      error: error instanceof Error ? error.message : "接口连不上",
    };
  }
}

export async function sendReviewReply(
  row: ShopPayload,
  review: { externalId: string; draftReply: string }
) {
  const replyUrl = row.replyUrl.trim();
  const appKey = decryptSecret(row.appKeyEnc);
  const appSecret = decryptSecret(row.appSecretEnc);
  if (!replyUrl) {
    return {
      ok: false,
      status: "queued",
      error: "回复已按店主提示词写好。客户把官方回复接口地址发来后即可自动发出。",
    };
  }
  const res = await fetch(replyUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${appKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      shopId: row.shopId,
      reviewId: review.externalId,
      reply: review.draftReply,
      signHint: appSecret ? "secret-present" : "",
    }),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    return {
      ok: false,
      status: "failed",
      error: text.slice(0, 180) || `发送失败 ${res.status}`,
    };
  }
  return { ok: true, status: "sent", error: "" };
}

export async function pullShopReviews(row: ShopPayload & {
  id: string;
  userId: string;
  productId: string;
}) {
  const pullUrl = row.pullUrl.trim();
  const appKey = decryptSecret(row.appKeyEnc);
  if (!pullUrl) {
    return {
      ok: false,
      created: 0,
      error: "还没有拉取接口地址。客户从美团/点评开放平台把评价查询地址发来后，系统会自动拉评。",
    };
  }
  const res = await fetch(pullUrl, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${appKey}`,
      "Content-Type": "application/json",
    },
    signal: AbortSignal.timeout(12000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      created: 0,
      error: String((body as { message?: string }).message || `拉取失败 ${res.status}`).slice(0, 180),
    };
  }
  const created = await ingestConnectionReviews({
    userId: row.userId,
    productId: row.productId,
    connectionId: row.id,
    platform: row.platform,
    items: parseReviewPayload(body),
  });
  return { ok: true, created, error: "" };
}
