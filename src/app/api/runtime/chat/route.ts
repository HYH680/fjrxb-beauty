import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getCatalogProduct } from "@/lib/catalog";
import {
  getGatewayOverride,
  chatTemperature,
  chatCompletionMaxTokens,
  extractAssistantText,
  shouldRetryTemperatureOne,
  type LlmConfig,
} from "@/lib/llm-config";
import { isValidModel } from "@/lib/available-models";
import { rateLimit } from "@/lib/rate-limit";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { describeRoute, resolveModelRoute } from "@/lib/model-router";
import { looksLikeIntake } from "@/lib/parse-shop-packet";
import { landCustomerPacket } from "@/lib/land-shop";
import { prisma } from "@/lib/prisma";
import { buildWorkspaceCsPrompt } from "@/lib/review-prompt";
import {
  replyLanguageLabel,
  wrapUserMessageForEnfirst,
} from "@/lib/enfirst-bridge";
import { getServiceBrief } from "@/lib/service-briefs";
import { skillPlaybookForPrompt } from "@/lib/service-skills";
import { appendConversationMessages, loadConversationMessages } from "@/lib/chat-memory";
import { getMerchantSetup, merchantProgressForPrompt, runMerchantAgent } from "@/lib/merchant-agent";
import {
  consultantPersonaBlock,
  formatKnowledgeForPrompt,
  formatMemoryForPrompt,
  loadLettaMemoryLayer,
  loadShopMemory,
  rememberTurn,
  retrieveKnowledge,
} from "@/lib/shop-consultant";

type IncomingAttachment = {
  name?: string;
  mime?: string;
  kind?: string;
  dataUrl?: string;
  text?: string;
};

type ChatFile =
  | { kind: "image"; name: string; dataUrl: string }
  | { kind: "text"; name: string; text: string };

function parseAttachments(raw: unknown): ChatFile[] {
  if (!Array.isArray(raw)) return [];
  const files: ChatFile[] = [];
  for (const item of raw.slice(0, 4) as IncomingAttachment[]) {
    const name = String(item?.name || "附件").slice(0, 80);
    if (item?.kind === "image" && typeof item.dataUrl === "string") {
      if (!item.dataUrl.startsWith("data:image/") || item.dataUrl.length > 6_000_000) {
        continue;
      }
      files.push({ kind: "image", name, dataUrl: item.dataUrl });
      continue;
    }
    if (item?.kind === "text" && typeof item.text === "string") {
      files.push({ kind: "text", name, text: item.text.slice(0, 80_000) });
    }
  }
  return files;
}

function friendlyModelError(detail: string) {
  if (/memory overloaded|system memory/i.test(detail)) {
    return "千问专用实例内存已满，正在换其他可用模型。请再发一次。";
  }
  if (/no available channel/i.test(detail)) {
    return "这条模型通道还没接通，已尝试其他可用模型。若仍失败，请只发文字。";
  }
  if (
    /无效的令牌|令牌无效|invalid.?api.?key|invalid.?token|incorrect.?api.?key|unauthorized|authentication|鉴权失败/i.test(
      detail
    )
  ) {
    return "看图/对话通道的密钥无效或已过期。已自动尝试其他通道；若仍失败，请管理员更新千问 VL（DASHSCOPE/QWEN）密钥。";
  }
  if (/not enough point|need \d+|insufficient (balance|quota)|余额不足|积分不足|overdue account|access denied/i.test(detail)) {
    return "当前选的模型额度不够或账户异常。已自动改走更省的模型；也可在右上角改回「自动选择」。";
  }
  return detail.slice(0, 220);
}

function extractModelError(data: Record<string, unknown>) {
  return String(
    (data as { error?: { message?: string }; message?: string })?.error?.message ||
      (data as { message?: string })?.message ||
      ""
  );
}

function canFallbackModel(detail: string) {
  return /no available channel|model not found|invalid model|不存在|Insufficient Balance|not enough point|need \d+|quota|余额|积分|memory overloaded|system memory|overloaded|capacity|429|503|502|empty content|empty reply|access denied|overdue account|无效的令牌|令牌无效|invalid.?api.?key|invalid.?token|incorrect.?api.?key|unauthorized|authentication|鉴权失败|401|Extra inputs are not permitted|invalid_request_error/i.test(
    detail
  );
}

import { traceLlmCall } from "@/lib/integrations/langfuse";

async function completeChat(
  config: LlmConfig,
  body: Record<string, unknown>,
  productId: string,
  userId: string,
  stream = false
) {
  const started = Date.now();
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.apiKey}`,
      "X-Product-Id": productId,
    },
    body: JSON.stringify({ ...body, stream }),
  });
  if (stream) {
    return { response, data: {} as Record<string, unknown>, started };
  }
  const data = await response.json().catch(() => ({}));
  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number } })
    .usage;
  void traceLlmCall({
    userId,
    productId,
    model: config.model,
    route: "workspace-chat",
    messages: body.messages,
    response: data,
    ok: response.ok,
    latencyMs: Date.now() - started,
    tokensIn: usage?.prompt_tokens || 0,
    tokensOut: usage?.completion_tokens || 0,
  });
  return { response, data, started };
}

async function* readSseText(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) return;
  const decoder = new TextDecoder();
  let buf = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const lines = buf.split("\n");
    buf = lines.pop() || "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (!payload || payload === "[DONE]") {
        if (payload === "[DONE]") return;
        continue;
      }
      try {
        const json = JSON.parse(payload) as {
          choices?: Array<{ delta?: { content?: string }; message?: { content?: string } }>;
        };
        const piece =
          json.choices?.[0]?.delta?.content || json.choices?.[0]?.message?.content || "";
        if (piece) yield piece;
      } catch {
        // skip malformed sse row
      }
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "需要先登录" }, { status: 401 });
    }

    const payload = await request.json();
    const productId = payload.productId;
    const message = typeof payload.message === "string" ? payload.message : "";
    const history = payload.history ?? [];
    const attachments = parseAttachments(payload.attachments);
    const hasImages = attachments.some((item) => item.kind === "image");
    const textFiles = attachments.filter((item) => item.kind === "text");

    if (!productId || (!message.trim() && attachments.length === 0)) {
      return NextResponse.json({ error: "参数不完整" }, { status: 400 });
    }

    const subscribed = await hasActiveSubscription(session.id, productId);
    if (!subscribed) {
      return NextResponse.json(
        { error: "开通这项服务后才能使用" },
        { status: 403 }
      );
    }

    if (!rateLimit(`runtime:${session.id}:${productId}`, 80, 60_000)) {
      return NextResponse.json(
        { error: "请求较勤，请稍后再试" },
        { status: 429 }
      );
    }

    const product = await getCatalogProduct(productId, { includeHidden: true });
    if (!product) {
      return NextResponse.json({ error: "服务不存在" }, { status: 404 });
    }

    const fileNotes = textFiles
      .map((file) => `【文件 ${file.name}】\n${file.text}`)
      .join("\n\n");
    const userText =
      [message.trim(), fileNotes].filter(Boolean).join("\n\n") || "请看我发的文件。";
    const locale = typeof payload.locale === "string" ? payload.locale : "zh-CN";
    const replyLang = replyLanguageLabel(locale);
    const bridged = wrapUserMessageForEnfirst(
      userText,
      replyLang,
      hasImages ? "image" : "auto"
    );

    const brief = getServiceBrief(product.id);
    const reviewOps = brief.kind === "review-ops" || brief.kind === "cs-ops";
    let notes: string[] = [];
    let followUps: string[] = brief.followUps;
    let landed = false;
    let setup = reviewOps
      ? await getMerchantSetup(session.id, product.id)
      : null;
    if (reviewOps) {
      const turn = await runMerchantAgent({
        userId: session.id,
        productId: product.id,
        text: userText,
      });
      notes = turn.notes;
      followUps = turn.followUps;
      landed = turn.landed;
      setup = turn.setup;
    }

    const playbook = await prisma.replyPlaybook.findUnique({
      where: {
        userId_productId: { userId: session.id, productId: product.id },
      },
    });
    if (!reviewOps && looksLikeIntake(userText, Boolean(playbook?.extraPrompt))) {
      const packet = await landCustomerPacket(session.id, userText, product.id);
      if (packet.steps.length) {
        notes.push(...packet.steps);
        landed = packet.ok;
      }
    }

    const stored = await loadConversationMessages(session.id, product.id);
    const fallbackHistory = Array.isArray(history) ? history : [];
    const historySource = stored.length > 0 ? stored.slice(-24) : fallbackHistory.slice(-12);
    const historyMessages = historySource
      .filter(
        (item: { role?: string; content?: string }) =>
          item &&
          (item.role === "user" || item.role === "assistant") &&
          typeof item.content === "string" &&
          item.content
      )
      .map((item: { role: string; content: string }) => ({
        role: item.role,
        content: item.content,
      }));

    const userContent = hasImages
      ? [
          ...attachments
            .filter((item) => item.kind === "image")
            .map((item) => ({
              type: "image_url",
              image_url: { url: item.dataUrl },
            })),
          { type: "text", text: bridged.content },
        ]
      : bridged.content;

    // 工作台一律走本站服务 prompt；Dify 会丢掉附件与 brief，故不在此短路。

    const [memory, knowledge, lettaMemory] = await Promise.all([
      loadShopMemory(session.id, product.id),
      retrieveKnowledge(session.id, product.id, userText),
      loadLettaMemoryLayer(userText),
    ]);

    const shopMemoryBlock = [formatMemoryForPrompt(memory), lettaMemory]
      .filter(Boolean)
      .join("\n\n");

    const systemPrompt = buildWorkspaceCsPrompt({
      productName: product.name,
      productId: product.id,
      brief,
      hasImages,
      progress: setup ? merchantProgressForPrompt(setup) : undefined,
      playbook,
      notes,
      locale,
      consultantPersona: consultantPersonaBlock(product.name),
      shopMemoryBlock,
      knowledgeBlock: formatKnowledgeForPrompt(knowledge),
      skillPlaybookBlock: skillPlaybookForPrompt(product),
    });
    const fallbackReply = notes.length
      ? notes.join("\n")
      : setup?.prompt || `你好，我是「${product.name}」顾问。先跟我说说你的店和现在最想解决的事？`;

    const route = resolveModelRoute({
      product,
      message: userText,
      hasImages,
    });

    const requestedModel = typeof payload.model === "string" ? payload.model.trim() : "";
    const gateway = getGatewayOverride();
    const manualConfig =
      requestedModel && isValidModel(requestedModel) && gateway && !hasImages
        ? {
            baseUrl: gateway.baseUrl,
            apiKey: gateway.apiKey,
            model: requestedModel,
          }
        : null;

    const attempts = manualConfig
      ? [manualConfig, ...route.attempts.filter(
          (item) =>
            !(
              item.baseUrl === manualConfig.baseUrl &&
              item.model === manualConfig.model &&
              item.apiKey === manualConfig.apiKey
            )
        )]
      : route.attempts;

    if (attempts.length === 0) {
      return NextResponse.json(
        {
          error: hasImages
            ? "当前没有可用的看图模型。把图里的文字复制过来也可以继续。"
            : "这项服务还没有可调用的模型。",
        },
        { status: 400 }
      );
    }

    let config = attempts[0];
    let lastDetail = "";
    let upstream: Response | null = null;
    const messages = [
      { role: "system", content: systemPrompt },
      ...historyMessages,
      { role: "user", content: userContent },
    ];

    for (let i = 0; i < attempts.length; i++) {
      config = attempts[i];
      let temperature = chatTemperature(config.model);
      let maxTokens = chatCompletionMaxTokens(config.model, hasImages);

      const openStream = () =>
        completeChat(
          config,
          {
            model: config.model,
            messages,
            temperature,
            max_tokens: maxTokens,
          },
          product.id,
          session.id,
          true
        );

      let result = await openStream();
      if (!result.response.ok) {
        lastDetail = extractModelError(
          (await result.response.json().catch(() => ({}))) as Record<string, unknown>
        );
        if (shouldRetryTemperatureOne(lastDetail, temperature)) {
          temperature = 1;
          result = await openStream();
        }
      }
      if (!result.response.ok) {
        if (!result.response.bodyUsed) {
          lastDetail = extractModelError(
            (await result.response.json().catch(() => ({}))) as Record<string, unknown>
          );
        }
        if (/not enough point|need \d+|reduce the max_tokens/i.test(lastDetail)) {
          maxTokens = chatCompletionMaxTokens(config.model, hasImages, true);
          result = await openStream();
        }
      }
      if (result.response.ok) {
        upstream = result.response;
        void traceLlmCall({
          userId: session.id,
          productId: product.id,
          model: config.model,
          route: "workspace-chat",
          messages,
          response: { stream: true },
          ok: true,
          latencyMs: Date.now() - result.started,
          tokensIn: 0,
          tokensOut: 0,
        });
        break;
      }
      const errData = result.response.bodyUsed
        ? {}
        : ((await result.response.json().catch(() => ({}))) as Record<string, unknown>);
      lastDetail = lastDetail || extractModelError(errData);
      if (!canFallbackModel(lastDetail) || i === attempts.length - 1) {
        return NextResponse.json(
          {
            error: friendlyModelError(
              lastDetail || `接口返回 ${result.response.status}`
            ),
            clearManualModel: /not enough point|need \d+|积分|余额/i.test(lastDetail),
          },
          { status: 400 }
        );
      }
    }

    if (!upstream) {
      return NextResponse.json({ error: "暂时连不上这个模型" }, { status: 500 });
    }

    const imageNames = attachments
      .filter((item) => item.kind === "image")
      .map((item) => item.name);
    const persistUserText = imageNames.length
      ? `${userText || "（附图）"}\n【本轮附图：${imageNames.join("、")}】`
      : userText;

    const encoder = new TextEncoder();
    const usedConfig = config;
    const bodyStream = new ReadableStream({
      async start(controller) {
        let reply = "";
        try {
          for await (const piece of readSseText(upstream)) {
            reply += piece;
            controller.enqueue(encoder.encode(piece));
          }
        } catch {
          // keep whatever arrived
        }
        if (!reply) reply = fallbackReply;
        if (!reply) {
          controller.enqueue(encoder.encode("模型没有返回内容"));
          controller.close();
          return;
        }
        await appendConversationMessages(
          session.id,
          [
            { role: "user", content: persistUserText },
            { role: "assistant", content: reply },
          ],
          product.id
        );
        void rememberTurn(session.id, product.id, persistUserText, reply);
        controller.enqueue(
          encoder.encode(
            `\n\n__META__${JSON.stringify({
              model: usedConfig.model,
              route: landed ? "落地接入" : describeRoute(usedConfig, route.task),
              productId: product.id,
              persisted: true,
              followUps,
            })}`
          )
        );
        controller.close();
      },
    });

    return new Response(bodyStream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-cache, no-transform",
        "X-Accel-Buffering": "no",
      },
    });
  } catch {
    return NextResponse.json({ error: "暂时连不上这个模型" }, { status: 500 });
  }
}
