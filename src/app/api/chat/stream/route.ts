import { NextRequest } from "next/server";
import { streamText } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
import { getSession } from "@/lib/auth";
import {
  getLlmConfig,
  chatTemperature,
  chatCompletionMaxTokens,
} from "@/lib/llm-config";
import { listCatalog } from "@/lib/catalog";
import { compactCatalogPrompt } from "@/lib/catalog-prompt";
import { rateLimit } from "@/lib/rate-limit";
import { requestLimitKey } from "@/lib/request-key";
import { prisma } from "@/lib/prisma";
import {
  GUIDE_SCOPE,
  appendConversationMessages,
  loadConversationMessages,
} from "@/lib/chat-memory";
import { buildGuideSystemPrompt } from "@/lib/guide-prompt";
import {
  replyLanguageLabel,
  wrapUserMessageForEnfirst,
} from "@/lib/enfirst-bridge";
import type { ChatHistoryItem } from "@/types";

function buildSystemPrompt(
  catalog: string,
  profile?: { industry?: string | null; occupation?: string | null },
  contextProduct?: { id: string; name: string; price: number; unit: string },
  locale?: string
) {
  return buildGuideSystemPrompt({ catalog, profile, contextProduct, locale });
}

export async function POST(request: NextRequest) {
  const parsed = await request.json().catch(() => null);
  const message =
    parsed && typeof parsed.message === "string" ? parsed.message : "";
  const history = Array.isArray(parsed?.history) ? parsed!.history : [];
  const contextProductId =
    typeof parsed?.contextProductId === "string"
      ? parsed.contextProductId
      : undefined;
  const locale =
    typeof parsed?.locale === "string" && parsed.locale.trim()
      ? parsed.locale.trim()
      : "zh-CN";

  if (!message) {
    return new Response("请输入消息", { status: 400 });
  }

  const session = await getSession();
  const limit = session ? 30 : 12;
  if (!rateLimit(requestLimitKey(request, session?.id), limit, 60_000)) {
    return new Response("问得有点勤，请稍后再试", { status: 429 });
  }

  // 默认用客户端传入 history；如果登录了，就尽量加载服务端历史。
  let memory: ChatHistoryItem[] = history;
  let profile:
    | { industry?: string | null; occupation?: string | null }
    | undefined;
  try {
    if (session) {
      const stored = await loadConversationMessages(session.id, GUIDE_SCOPE);
      if (stored.length > 0) memory = stored;
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { industry: true, occupation: true },
      });
      if (user) profile = user;
    }
  } catch {
    // profile/memory 失败不影响降级推荐
  }

  try {
    const catalog = await listCatalog();
    const catalogText = await compactCatalogPrompt(locale);
    const contextProduct = contextProductId
      ? catalog.find((p) => p.id === contextProductId)
      : undefined;

    const { apiKey, baseUrl, model } = await getLlmConfig();

    // No API key — fall back to non-streaming local recommendation
    if (!apiKey) {
      const { getAIRecommendation } = await import("@/lib/ai-assistant");
      const result = await getAIRecommendation(
        message.trim(),
        memory,
        contextProductId,
        profile,
        session?.id,
        locale
      );
      const fullText =
        `${result.reply}\nRECOMMEND: ${result.recommendedProducts
          .map((p) => p.id)
          .join(",")}\n` + `FOLLOWUPS: ${result.followUps.join(" | ")}`;

      return new Response(fullText, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    const openai = createOpenAI({
      apiKey,
      baseURL: baseUrl,
      headers: { "X-Product-Id": "guide" },
    });

    const historyMessages = memory.slice(-16).map((h) => ({
      role: (h.role === "assistant" ? "assistant" : "user") as
        | "user"
        | "assistant",
      content: h.content,
    }));

    const systemPrompt = buildSystemPrompt(
      catalogText,
      profile,
      contextProduct,
      locale
    );

    const rawMessage = message.trim();
    const replyLang = replyLanguageLabel(locale);
    const bridged = wrapUserMessageForEnfirst(rawMessage, replyLang, "auto");
    if (bridged.bridged) {
      console.log(
        `[Enfirst Bridge] ${bridged.detectedLang}→EN anchor (${bridged.scenario})`
      );
    }

    const result = streamText({
      model: openai(model),
      system: systemPrompt,
      messages: [
        ...historyMessages,
        { role: "user", content: bridged.content },
      ],
      // Guide needs room to reason like a person, not spit catalog templates.
      temperature: chatTemperature(model, 0.9),
      maxOutputTokens: Math.max(chatCompletionMaxTokens(model, false), 1800),
      onFinish: async ({ text }) => {
        if (!session) return;
        const recommendMatch = text.match(/RECOMMEND:\s*(.*)/);
        const ids =
          recommendMatch?.[1]
            ?.split(",")
            .map((id: string) => id.trim())
            .filter(Boolean) ?? [];
        // Persist original user text (not the bridge wrapper) for readable history.
        const cleaned = text.replace(/\nRECOMMEND:[\s\S]*$/, "").trim();
        if (!cleaned) return;
        await appendConversationMessages(
          session.id,
          [
            { role: "user", content: rawMessage },
            {
              role: "assistant",
              content: cleaned,
              productIds: ids,
            },
          ],
          GUIDE_SCOPE
        );
      },
    });

    return result.toTextStreamResponse();
  } catch (e) {
    // streamText / getLlmConfig / DB 都可能临时失败：
    // 不能直接 500，不然你会看到“导购暂时连不上”。
    console.error("guide chat stream failed, fallback to local:", e);

    const { getAIRecommendation } = await import("@/lib/ai-assistant");
    const result = await getAIRecommendation(
      message.trim(),
      memory,
      contextProductId,
      profile,
      session?.id,
      locale
    );

    if (session) {
      // 降级推荐也要把对话落库（避免你下次还得从欢迎页开始）。
      await appendConversationMessages(
        session.id,
        [
          { role: "user", content: message.trim() },
          {
            role: "assistant",
            content: result.reply,
            productIds: result.recommendedProducts.map((p) => p.id),
          },
        ],
        GUIDE_SCOPE
      );
    }

    const fullText =
      `${result.reply}\nRECOMMEND: ${result.recommendedProducts
        .map((p) => p.id)
        .join(",")}\n` + `FOLLOWUPS: ${result.followUps.join(" | ")}`;

    return new Response(fullText, {
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}
