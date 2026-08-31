import { prisma } from "@/lib/prisma";
import { draftInboxForUser } from "@/lib/draft-review";
import { landCustomerPacket, mergePlaybookPrompt } from "@/lib/land-shop";
import {
  looksLikeCustomerPacket,
  looksLikeIntake,
} from "@/lib/parse-shop-packet";
import {
  guidedPlatforms,
  platformLabel,
  resolveAllPlatforms,
  SHOP_PLATFORMS,
} from "@/lib/platforms";
import { getServiceBrief } from "@/lib/service-briefs";

export type SetupStep =
  | "ask-platforms"
  | "ask-playbook"
  | "ask-shop-id"
  | "ask-credentials"
  | "ready";

export type MerchantSetup = {
  step: SetupStep;
  focus: string;
  platforms: string[];
  skipped: string[];
  followUps: string[];
  prompt: string;
};

export type MerchantAgentTurn = {
  notes: string[];
  followUps: string[];
  landed: boolean;
  setup: MerchantSetup;
  fallback: string;
};

function parseList(raw?: string | null) {
  try {
    const parsed = JSON.parse(raw || "[]") as unknown;
    if (!Array.isArray(parsed)) return [] as string[];
    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [] as string[];
  }
}

export function looksLikeQuestion(text: string) {
  const value = text.trim();
  if (!value) return false;
  if (/[吗麼？?]$/.test(value)) return true;
  if (
    /是吗|对吗|对吧|是不是|能不能|会不会|要不要|怎么|如何|为什么|什么是|哪里|哪找|在哪|哪看|啥意思|是不是只要|搞不懂|不明白|什么意思/.test(
      value
    )
  ) {
    return true;
  }
  return /编号.{0,12}(就|能|可以).{0,12}(自动|回复)/.test(value);
}

function isSkip(text: string) {
  const value = text.trim();
  const prefixes = [
    "没有",
    "暂无",
    "跳过",
    "先不配",
    "先跳过",
    "还没有",
    "暂时没有",
    "以后再说",
    "先起草",
    "暂时跳过",
    "编号我找不到",
    "开放平台我还没有",
    "规范我还没想好",
  ];
  return prefixes.some((prefix) => value.startsWith(prefix));
}

function wantsMorePlatforms(text: string) {
  return /再加|加一个平台|换平台|重新配置|还要加/.test(text);
}

function wantsAutoReply(text: string) {
  return /开始自动回复|帮我起草|拉一下评价|同步评价/.test(text);
}

function isPlaybookCandidate(text: string, picked: string[]) {
  if (looksLikeQuestion(text)) return false;
  if (/回复规范|口吻|人设|差评|好评先|不要提竞品/.test(text)) return true;
  if (picked.length > 0 && text.trim().length < 40) return false;
  if (looksLikeCustomerPacket(text)) return false;
  return text.trim().length >= 24 && !isSkip(text) && !wantsMorePlatforms(text);
}

async function loadState(userId: string, productId: string) {
  const [playbook, connections] = await Promise.all([
    prisma.replyPlaybook.findUnique({
      where: { userId_productId: { userId, productId } },
    }),
    prisma.shopConnection.findMany({
      where: { userId, productId },
    }),
  ]);
  return { playbook, connections };
}

async function savePlatforms(
  userId: string,
  productId: string,
  platforms: string[],
  skipped?: string[]
) {
  const existing = await prisma.replyPlaybook.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  const merged = [...new Set([...(existing ? parseList(existing.selectedPlatforms) : []), ...platforms])];
  const skippedMerged =
    skipped ?? (existing ? parseList(existing.skippedCredentials) : []);
  return prisma.replyPlaybook.upsert({
    where: { userId_productId: { userId, productId } },
    create: {
      userId,
      productId,
      selectedPlatforms: JSON.stringify(merged),
      skippedCredentials: JSON.stringify(skippedMerged),
    },
    update: {
      selectedPlatforms: JSON.stringify(merged),
      skippedCredentials: JSON.stringify(skippedMerged),
    },
  });
}

export async function getMerchantSetup(
  userId: string,
  productId: string
): Promise<MerchantSetup> {
  const brief = getServiceBrief(productId);
  const csMode = brief.kind === "cs-ops";
  const { playbook, connections } = await loadState(userId, productId);
  const platforms = parseList(playbook?.selectedPlatforms);
  const skipped = parseList(playbook?.skippedCredentials);
  const options = guidedPlatforms(productId).map((id) => platformLabel(id));

  if (platforms.length === 0) {
    return {
      step: "ask-platforms",
      focus: "",
      platforms,
      skipped,
      followUps: options,
      prompt: csMode
        ? "你在哪些平台接待顾客？点下面的，也可以一起说。"
        : "你在哪些平台开店？点下面的，也可以一起说，比如「美团和饿了么」。",
    };
  }

  if (!playbook?.extraPrompt.trim()) {
    return {
      step: "ask-playbook",
      focus: "",
      platforms,
      skipped,
      followUps: csMode
        ? ["退换先致歉再给方案", "禁答竞品和私下转账", "口吻还没想好"]
        : ["差评先道歉，别提竞品", "好评就简短谢谢", "规范我还没想好"],
      prompt: csMode
        ? `平台已有：${platforms.map(platformLabel).join("、")}。还没有店铺口吻 / 禁答 / 物流退换政策。`
        : `平台已有：${platforms.map(platformLabel).join("、")}。还没有回复规范。`,
    };
  }

  for (const platform of platforms) {
    if (skipped.includes(platform)) continue;
    const shop = connections.find((item) => item.platform === platform);
    const label = platformLabel(platform);
    const meta = SHOP_PLATFORMS.find((item) => item.id === platform);
    if (!shop?.shopId) {
      return {
        step: "ask-shop-id",
        focus: platform,
        platforms,
        skipped,
        followUps: ["编号我找不到", "编号在哪看", "先跳过编号"],
        prompt: csMode
          ? `可选：补一下「${label}」店铺编号，方便记住哪家店。没有也能直接贴顾客消息起草。`
          : `正在等「${label}」门店/店铺编号。没有也能先贴评价起草。`,
      };
    }
    if (!shop.appKeyEnc) {
      return {
        step: "ask-credentials",
        focus: platform,
        platforms,
        skipped,
        followUps: csMode
          ? ["消息接口我还没有", "先起草就行", "先跳过凭证"]
          : ["开放平台我还没有", "AppKey 是什么", "先跳过凭证"],
        prompt: csMode
          ? `「${label}」若要自动发出回复，还缺${meta?.openPlatform || "开放平台"}的消息接口凭证。没有就继续贴消息起草，由你复制发出。不要收商家 App 登录密码。`
          : `「${label}」编号已有。若要自动拉评，还缺${meta?.openPlatform || "开放平台"}的 AppKey、Secret 和评价接口（需你自备兼容 webhook，不是官方一键授权）。没有也能先贴评价起草。不要收商家 App 登录密码。`,
      };
    }
  }

  return {
    step: "ready",
    focus: "",
    platforms,
    skipped,
    followUps: csMode
      ? ["贴一条顾客消息试试", "再加一个平台", "补一下退换政策"]
      : ["贴一条评价试试", "再加一个平台", "开始自动回复"],
    prompt: csMode
      ? `可以按「${playbook.shopDisplayName || "本店"}」口吻起草客服回复。当前默认是起草；自动发出需另接消息接口。`
      : `可以按「${playbook.shopDisplayName || "本店"}」口吻起草。凭证齐且接口兼容时可自动拉评；跳过的平台仍可把评价贴过来。自动同步不是美团/淘宝官方 SDK。`,
  };
}

export function merchantProgressForPrompt(setup: MerchantSetup) {
  const shops = setup.platforms.map((id) => platformLabel(id)).join("、") || "还没选";
  const skipped = setup.skipped.map((id) => platformLabel(id)).join("、");
  const focus = setup.focus ? platformLabel(setup.focus) : "";
  const lines = [
    `已选平台：${shops}`,
    skipped ? `已跳过自动接口：${skipped}` : "",
    setup.step === "ask-platforms" ? "还不知道他在哪些平台开店/接待。" : "",
    setup.step === "ask-playbook"
      ? "还没有回复规范/店铺政策，没有就没法按本店口吻起草。"
      : "",
    setup.step === "ask-shop-id"
      ? `正在等「${focus}」门店编号。没有编号也能先贴消息/评价起草。`
      : "",
    setup.step === "ask-credentials"
      ? `正在等「${focus}」开放平台凭证。没有也能先贴消息/评价起草。`
      : "",
    setup.step === "ready" ? "配置已经够用，可以开始帮他起草回复。" : "",
  ];
  return lines.filter(Boolean).join("\n");
}

export async function runMerchantAgent(input: {
  userId: string;
  productId: string;
  text: string;
}): Promise<MerchantAgentTurn> {
  const empty = (setup: MerchantSetup, notes: string[] = []): MerchantAgentTurn => ({
    notes,
    followUps: setup.followUps,
    landed: false,
    setup,
    fallback: [...notes, setup.prompt].filter(Boolean).join("\n"),
  });

  const brief = getServiceBrief(input.productId);
  if (brief.kind !== "review-ops" && brief.kind !== "cs-ops") {
    const setup = await getMerchantSetup(input.userId, input.productId);
    return empty(setup);
  }

  const text = input.text.trim();
  const { playbook, connections } = await loadState(input.userId, input.productId);
  const current = await getMerchantSetup(input.userId, input.productId);
  const picked = looksLikeQuestion(text) ? [] : resolveAllPlatforms(text);
  const notes: string[] = [];

  if (looksLikeQuestion(text)) {
    return empty(current);
  }

  if (picked.length) {
    await savePlatforms(input.userId, input.productId, picked);
    notes.push(`系统已记下平台：${picked.map(platformLabel).join("、")}。`);
  }

  if (isSkip(text) && current.step === "ask-playbook") {
    notes.push("用户这轮还不想写规范。可以先给一份能用的起步口径让他改，也可以等他晚点补。");
  }

  if (isSkip(text) && (current.step === "ask-shop-id" || current.step === "ask-credentials")) {
    const skipped = [...new Set([...current.skipped, current.focus].filter(Boolean))];
    await savePlatforms(input.userId, input.productId, current.platforms, skipped);
    notes.push(
      current.step === "ask-shop-id"
        ? `系统已跳过${platformLabel(current.focus)}编号。`
        : `系统已跳过${platformLabel(current.focus)}开放平台凭证。`
    );
  }

  if (
    current.step === "ask-playbook" &&
    isPlaybookCandidate(text, picked) &&
    !isSkip(text)
  ) {
    const extraPrompt = mergePlaybookPrompt(playbook?.extraPrompt || "", text);
    await prisma.replyPlaybook.upsert({
      where: { userId_productId: { userId: input.userId, productId: input.productId } },
      create: {
        userId: input.userId,
        productId: input.productId,
        extraPrompt,
        selectedPlatforms: JSON.stringify(current.platforms),
        skippedCredentials: JSON.stringify(current.skipped),
      },
      update: { extraPrompt },
    });
    notes.push("系统已收下回复规范，之后起草都按这份口吻。");
  }

  let landed = false;
  if (
    looksLikeIntake(text, Boolean(playbook?.extraPrompt)) ||
    looksLikeCustomerPacket(text)
  ) {
    const result = await landCustomerPacket(input.userId, text, input.productId);
    if (result.steps.length) {
      notes.push(...result.steps);
      landed = result.ok;
    }
  }

  if (wantsAutoReply(text)) {
    if (brief.kind === "cs-ops") {
      notes.push(
        "客服服务当前以起草为主：请把顾客消息贴过来。自动发出需另接消息接口，本站不会拉评价箱。"
      );
    } else {
      for (const shop of connections.filter((item) => item.pullUrl)) {
        notes.push(`${platformLabel(shop.platform)}如已接通，正在按本店规范起草评论箱。`);
      }
      const drafted = await draftInboxForUser(input.userId, input.productId);
      if (drafted.drafted) {
        notes.push(
          `已起草 ${drafted.drafted} 条${drafted.sent ? `，发出 ${drafted.sent} 条好评` : "。差评默认先给你看再发。"}`
        );
      } else {
        notes.push(drafted.errors[0] || "评论箱暂时没有待写的评价。");
      }
    }
  }

  const next = await getMerchantSetup(input.userId, input.productId);

  if (wantsMorePlatforms(text)) {
    const remain = guidedPlatforms(input.productId)
      .filter((id) => !next.platforms.includes(id))
      .map((id) => platformLabel(id));
    notes.push(
      remain.length
        ? `用户想再加平台。还没选的有：${remain.join("、")}。`
        : "常用平台都已记下。若还有别的，让他说出平台名。"
    );
    return {
      notes,
      followUps: remain.length ? remain : next.followUps,
      landed,
      setup: next,
      fallback: [...notes, next.prompt].filter(Boolean).join("\n"),
    };
  }

  return {
    notes,
    followUps: next.followUps,
    landed,
    setup: next,
    fallback: [...notes, next.prompt].filter(Boolean).join("\n"),
  };
}
