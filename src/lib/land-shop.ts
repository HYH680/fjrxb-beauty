import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { draftInboxForUser } from "@/lib/draft-review";
import {
  parseCustomerPacket,
  shopSliceHasWork,
  type PlatformShopSlice,
} from "@/lib/parse-shop-packet";
import { encryptSecret, decryptSecret, maskSecret } from "@/lib/secret-box";
import { getServiceBrief, isReviewOps } from "@/lib/service-briefs";
import { platformLabel } from "@/lib/platforms";
import { pullShopReviews, testShopConnection } from "@/lib/shop-adapters";

const PLAYBOOK_PROMPT_CAP = 8000;

function compactPrompt(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function mergePlaybookPrompt(previous: string, incoming: string) {
  const prev = previous.trim();
  const next = incoming.trim();
  if (!next) return prev.slice(-PLAYBOOK_PROMPT_CAP);
  if (!prev) return next.slice(0, PLAYBOOK_PROMPT_CAP);

  const prevCompact = compactPrompt(prev);
  const nextCompact = compactPrompt(next);
  if (prevCompact.includes(nextCompact)) return prev.slice(-PLAYBOOK_PROMPT_CAP);
  if (nextCompact.includes(prevCompact) && next.length > prev.length + 20) {
    return next.slice(0, PLAYBOOK_PROMPT_CAP);
  }

  const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
  return `${prev}\n\n【补充 ${stamp}】\n${next}`.slice(-PLAYBOOK_PROMPT_CAP);
}

async function landOneShop(
  userId: string,
  productId: string,
  packetShopName: string,
  slice: PlatformShopSlice,
  steps: string[]
) {
  if (!shopSliceHasWork(slice)) return null;

  const existing = await prisma.shopConnection.findFirst({
    where: {
      userId,
      productId,
      platform: slice.platform,
      ...(slice.shopId
        ? { shopId: slice.shopId }
        : slice.shopName
          ? { shopName: slice.shopName }
          : {}),
    },
  });

  const shopName =
    slice.shopName || packetShopName || existing?.shopName || platformLabel(slice.platform);

  const row = existing
    ? await prisma.shopConnection.update({
        where: { id: existing.id },
        data: {
          shopName: shopName.slice(0, 40),
          shopId: slice.shopId ? slice.shopId.slice(0, 80) : existing.shopId,
          pullUrl: slice.pullUrl ? slice.pullUrl.slice(0, 300) : existing.pullUrl,
          replyUrl: slice.replyUrl ? slice.replyUrl.slice(0, 300) : existing.replyUrl,
          ...(slice.appKey ? { appKeyEnc: encryptSecret(slice.appKey) } : {}),
          ...(slice.appSecret ? { appSecretEnc: encryptSecret(slice.appSecret) } : {}),
        },
      })
    : await prisma.shopConnection.create({
        data: {
          userId,
          productId,
          platform: slice.platform,
          shopName: shopName.slice(0, 40),
          shopId: slice.shopId.slice(0, 80),
          appKeyEnc: encryptSecret(slice.appKey),
          appSecretEnc: encryptSecret(slice.appSecret),
          pullUrl: slice.pullUrl.slice(0, 300),
          replyUrl: slice.replyUrl.slice(0, 300),
          inboundToken: randomBytes(16).toString("hex"),
          status: "draft",
        },
      });

  const existingKey = decryptSecret(row.appKeyEnc);
  const idOnly =
    Boolean(slice.shopId) &&
    !slice.appKey &&
    !slice.pullUrl &&
    !slice.replyUrl &&
    !existingKey &&
    !row.pullUrl &&
    !row.replyUrl;

  if (idOnly) {
    await prisma.shopConnection.update({
      where: { id: row.id },
      data: { status: "draft", lastError: "" },
    });
    steps.push(
      `已记下${platformLabel(row.platform)}门店编号 ${row.shopId}。单凭商家号查不到店名、评价，也不能代替开放平台授权。`
    );
    return row;
  }

  const test = await testShopConnection(row);
  const saved = await prisma.shopConnection.update({
    where: { id: row.id },
    data: { status: test.status, lastError: test.error || test.note || "" },
  });
  steps.push(
    `已接入「${saved.shopName}」（${platformLabel(saved.platform)}）。密钥 ${
      slice.appKey ? maskSecret(slice.appKey) : "沿用已存"
    }。${test.note || test.error || "接口探测完成。"}`
  );

  if (isReviewOps(productId) && saved.pullUrl) {
    const pulled = await pullShopReviews(saved);
    await prisma.shopConnection.update({
      where: { id: saved.id },
      data: {
        lastSyncAt: pulled.ok ? new Date() : saved.lastSyncAt,
        lastError: pulled.error,
      },
    });
    steps.push(
      pulled.ok
        ? pulled.created
          ? `${platformLabel(saved.platform)}已拉到 ${pulled.created} 条新评价。`
          : `${platformLabel(saved.platform)}拉取成功，没有新评价。`
        : `${platformLabel(saved.platform)}拉取还没通：${pulled.error}`
    );
  }

  return saved;
}

export async function landCustomerPacket(
  userId: string,
  raw: string,
  productId: string
) {
  const brief = getServiceBrief(productId);
  const packet = parseCustomerPacket(raw, productId);
  const steps: string[] = [];

  if (packet.refused) {
    return { ok: false, steps: [packet.refused] };
  }
  const shops = packet.shops.filter(shopSliceHasWork);
  const hasLandable =
    packet.extraPrompt || packet.reviews.length || shops.length > 0;
  if (!hasLandable) {
    return {
      ok: false,
      steps: [
        packet.notice ||
          `这段里还没有能落地的资料。请按资料清单复制模板，一次贴进窗口。没有的平台整段删掉，没有开放平台凭证的行留空。不要发登录密码。`,
      ],
    };
  }
  if (packet.notice) steps.push(packet.notice);

  if (packet.extraPrompt) {
    const existingPlaybook = await prisma.replyPlaybook.findUnique({
      where: { userId_productId: { userId, productId } },
    });
    const extraPrompt = mergePlaybookPrompt(
      existingPlaybook?.extraPrompt || "",
      packet.extraPrompt
    );
    const appended =
      Boolean(existingPlaybook?.extraPrompt) && extraPrompt !== existingPlaybook?.extraPrompt;
    await prisma.replyPlaybook.upsert({
      where: { userId_productId: { userId, productId } },
      create: {
        userId,
        productId,
        shopDisplayName: packet.shopName.slice(0, 40),
        tone: (packet.tone || "稳重热情").slice(0, 20),
        addressAs: (packet.addressAs || "我们").slice(0, 10),
        mustInclude: packet.mustInclude.slice(0, 200),
        neverSay: packet.neverSay.slice(0, 200),
        goodReviewHint: packet.goodReviewHint.slice(0, 400),
        badReviewHint: packet.badReviewHint.slice(0, 400),
        extraPrompt,
        autoSendGood: packet.autoSendGood,
      },
      update: {
        ...(packet.shopName ? { shopDisplayName: packet.shopName.slice(0, 40) } : {}),
        ...(packet.tone ? { tone: packet.tone.slice(0, 20) } : {}),
        ...(packet.addressAs ? { addressAs: packet.addressAs.slice(0, 10) } : {}),
        ...(packet.mustInclude ? { mustInclude: packet.mustInclude.slice(0, 200) } : {}),
        ...(packet.neverSay ? { neverSay: packet.neverSay.slice(0, 200) } : {}),
        extraPrompt,
        autoSendGood: packet.autoSendGood,
      },
    });
    steps.push(
      appended
        ? "已把这次的回复规范记入本店记忆，之后按累计规范来做。多平台共用这一份口吻。"
        : "已收下你的提示词和口吻。美团、饿了么、京东、淘宝都按这一份来回。"
    );
  }

  const landed = [];
  for (const slice of shops) {
    const row = await landOneShop(userId, productId, packet.shopName, slice, steps);
    if (row) landed.push(row);
  }

  if (isReviewOps(productId) && packet.reviews.length) {
    const fallback =
      landed[0] ||
      (await prisma.shopConnection.findFirst({
        where: { userId, productId },
        orderBy: { createdAt: "desc" },
      }));
    for (const item of packet.reviews) {
      const match =
        landed.find((shop) => shop.platform === item.platform) || fallback;
      await prisma.reviewJob.create({
        data: {
          userId,
          productId,
          connectionId: match?.id ?? null,
          platform: item.platform || match?.platform || packet.platform,
          rating: item.rating,
          author: item.author,
          content: item.content,
          status: "inbox",
        },
      });
    }
    steps.push(`资料里的 ${packet.reviews.length} 条评价已进评论箱。`);
  }

  const playbook = await prisma.replyPlaybook.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (isReviewOps(productId) && playbook) {
    const drafted = await draftInboxForUser(userId, productId);
    if (drafted.drafted) {
      steps.push(
        `已按本店提示词起草 ${drafted.drafted} 条${
          drafted.sent ? `，其中 ${drafted.sent} 条好评已发出` : "，接通回复接口后即可发出"
        }。`
      );
    }
    if (drafted.errors[0]) steps.push(`起草时遇到：${drafted.errors[0]}`);
  } else if (playbook) {
    steps.push(brief.afterLand);
  } else if (landed.length) {
    steps.push("各平台编号已收下。把回复规范发来后，才会按你的口吻开始做。");
  }

  if (landed.length > 1) {
    steps.push(
      `这次共接入 ${landed.length} 个平台：${landed
        .map((item) => platformLabel(item.platform))
        .join("、")}。没有凭证的平台只会记下编号，不会去平台反查。`
    );
  }

  return { ok: true, steps };
}
