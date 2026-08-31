import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getAIRecommendation } from "@/lib/ai-assistant";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { requestLimitKey } from "@/lib/request-key";
import {
  GUIDE_SCOPE,
  appendConversationMessages,
  clearConversation,
  getOrCreateConversation,
  loadConversationMessages,
  productIdFromSearch,
} from "@/lib/chat-memory";
import type { ChatHistoryItem, ChatMessage } from "@/types";

function toHistory(messages: ChatMessage[]): ChatHistoryItem[] {
  return messages
    .filter((m) => m.id !== "welcome")
    .map((m) => ({
      role: m.role,
      content: m.content,
      productIds: m.recommendedProducts?.map((p) => p.id) ?? [],
    }));
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ messages: [], persisted: false });
    }

    const productId = productIdFromSearch(request.nextUrl.searchParams);
    const messages = await loadConversationMessages(session.id, productId);
    return NextResponse.json({ messages, persisted: true, productId });
  } catch {
    return NextResponse.json({ messages: [], persisted: false });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { message, history = [], contextProductId, locale: rawLocale } =
      await request.json();
    const locale =
      typeof rawLocale === "string" && rawLocale.trim()
        ? rawLocale.trim()
        : "zh-CN";

    if (!message || typeof message !== "string") {
      return NextResponse.json({ error: "请输入消息" }, { status: 400 });
    }

    const session = await getSession();
    const limit = session ? 30 : 12;
    if (!rateLimit(requestLimitKey(request, session?.id), limit, 60_000)) {
      return NextResponse.json({ error: "问得有点勤，请稍后再试" }, { status: 429 });
    }

    let memory: ChatHistoryItem[] = Array.isArray(history) ? history : [];
    let profile: { industry?: string | null; occupation?: string | null } | undefined;

    if (session) {
      const stored = await loadConversationMessages(session.id, GUIDE_SCOPE);
      if (stored.length > 0) {
        memory = toHistory(stored);
      }
      const user = await prisma.user.findUnique({
        where: { id: session.id },
        select: { industry: true, occupation: true },
      });
      if (user) profile = user;
    }

    const result = await getAIRecommendation(
      message.trim(),
      memory,
      typeof contextProductId === "string" ? contextProductId : undefined,
      profile,
      session?.id,
      locale
    );

    if (session) {
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

    return NextResponse.json({
      reply: result.reply,
      recommendedProducts: result.recommendedProducts.map((p) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        longDescription: p.longDescription,
        category: p.category,
        price: p.price,
        unit: p.unit,
        tags: p.tags,
        features: p.features,
        provider: p.provider,
        badge: p.badge,
        pricingNote: p.pricingNote,
        access: p.access,
      })),
      persisted: Boolean(session),
      followUps: result.followUps ?? [],
    });
  } catch {
    return NextResponse.json({ error: "导购暂时连不上" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const existing = await loadConversationMessages(session.id, GUIDE_SCOPE);
  if (existing.length > 0) {
    return NextResponse.json({ messages: existing, imported: false });
  }

  const { messages = [] } = await request.json();
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ messages: [], imported: false });
  }

  await getOrCreateConversation(session.id, GUIDE_SCOPE);
  await appendConversationMessages(
    session.id,
    messages
      .filter(
        (m: ChatMessage) =>
          m && (m.role === "user" || m.role === "assistant") && m.content
      )
      .map((m: ChatMessage) => ({
        role: m.role,
        content: m.content,
        productIds: m.recommendedProducts?.map((p) => p.id) ?? [],
      })),
    GUIDE_SCOPE
  );

  const stored = await loadConversationMessages(session.id, GUIDE_SCOPE);
  return NextResponse.json({ messages: stored, imported: true });
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (session) {
    await clearConversation(session.id, productIdFromSearch(request.nextUrl.searchParams));
  }
  return NextResponse.json({ success: true });
}
