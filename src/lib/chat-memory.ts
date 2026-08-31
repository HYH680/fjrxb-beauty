import { prisma } from "@/lib/prisma";
import { listCatalog } from "@/lib/catalog";
import type { ChatMessage, Product } from "@/types";

export const GUIDE_SCOPE = "guide";

export function conversationScope(productId?: string | null) {
  const id = productId?.trim();
  return id || GUIDE_SCOPE;
}

export function productIdFromSearch(searchParams: URLSearchParams) {
  return conversationScope(searchParams.get("productId"));
}

export function parseProductIds(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string");
  } catch {
    return [];
  }
}

export async function hydrateProducts(ids: string[]): Promise<Product[]> {
  const catalog = await listCatalog();
  const byId = new Map(catalog.map((product) => [product.id, product]));
  return ids
    .map((id) => byId.get(id))
    .filter((product): product is Product => Boolean(product));
}

export async function toClientMessages(
  rows: { id: string; role: string; content: string; productIds: string }[]
): Promise<ChatMessage[]> {
  const recommended = await hydrateProducts(
    rows.flatMap((row) => parseProductIds(row.productIds))
  );
  const byId = new Map(recommended.map((product) => [product.id, product]));
  return rows.map((row) => ({
    id: row.id,
    role: row.role === "user" ? "user" : "assistant",
    content: row.content,
    recommendedProducts: parseProductIds(row.productIds)
      .map((id) => byId.get(id))
      .filter((product): product is Product => Boolean(product)),
  }));
}

export async function getOrCreateConversation(userId: string, productId?: string | null) {
  const scope = conversationScope(productId);
  return prisma.conversation.upsert({
    where: { userId_productId: { userId, productId: scope } },
    create: { userId, productId: scope },
    update: {},
  });
}

export async function loadConversationMessages(
  userId: string,
  productId?: string | null
): Promise<ChatMessage[]> {
  const conversation = await prisma.conversation.findUnique({
    where: {
      userId_productId: { userId, productId: conversationScope(productId) },
    },
    include: {
      messages: { orderBy: { createdAt: "desc" }, take: 120 },
    },
  });

  if (!conversation) return [];
  return await toClientMessages([...conversation.messages].reverse());
}

export async function appendConversationMessages(
  userId: string,
  messages: { role: "user" | "assistant"; content: string; productIds?: string[] }[],
  productId?: string | null
) {
  const conversation = await getOrCreateConversation(userId, productId);

  await prisma.$transaction([
    prisma.chatMessage.createMany({
      data: messages.map((m) => ({
        conversationId: conversation.id,
        role: m.role,
        content: m.content.slice(0, 20_000),
        productIds: JSON.stringify(m.productIds ?? []),
      })),
    }),
    prisma.conversation.update({
      where: { id: conversation.id },
      data: { updatedAt: new Date() },
    }),
  ]);
}

export async function clearConversation(userId: string, productId?: string | null) {
  const conversation = await prisma.conversation.findUnique({
    where: {
      userId_productId: { userId, productId: conversationScope(productId) },
    },
  });
  if (!conversation) return;

  await prisma.chatMessage.deleteMany({
    where: { conversationId: conversation.id },
  });
}
