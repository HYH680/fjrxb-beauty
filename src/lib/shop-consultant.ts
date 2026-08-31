import { prisma } from "@/lib/prisma";
import {
  embedText,
  parseEmbedding,
  scoreByEmbedding,
  serializeEmbedding,
} from "@/lib/integrations/embeddings";

export type ShopFacts = {
  shopType?: string;
  style?: string;
  avgPrice?: string;
  audience?: string;
  goal?: string;
  lastCampaign?: string;
  preferences?: string;
  openThread?: string;
};

const CUISINE =
  "重庆老火锅|老火锅|川菜|火锅|烧烤|奶茶|咖啡|日料|西餐|面馆|快餐|海鲜|甜品|烤肉|自助|中餐|粤菜|湘菜|鲁菜|东北菜|江浙菜|家常菜|小龙虾|冒菜|麻辣烫|烤鱼|烤肉|串串|茶饮|烘焙|面包";

const FACT_PATTERNS: { key: keyof ShopFacts; re: RegExp }[] = [
  // 「做重庆老火锅」「开的是火锅店」「经营川菜馆」
  {
    key: "shopType",
    re: new RegExp(
      `(?:是|做|开|经营|开的是|做的是)?([\\u4e00-\\u9fa5]{0,6}(?:${CUISINE}))[馆店铺厅吧房]?`
    ),
  },
  { key: "avgPrice", re: /(?:客单价|人均|大概|约)\s*[约大概]*\s*(\d{2,4})\s*元?/ },
  { key: "avgPrice", re: /(\d{2,4})\s*元?\s*(?:客单|人均)/ },
  {
    key: "audience",
    re: /(?:主要客群|客群)(?:主要)?(?:是|以|都是)?([^。，,；;\n想要目标]{2,24})/,
  },
  {
    key: "goal",
    re: /(?:想要|目标是|主要想|想做|想搞)([^。，,；;\n]{2,40})/,
  },
  { key: "lastCampaign", re: /上次(?:做了|搞了|做过)([^。，,；;\n]{2,40})/ },
  { key: "style", re: /(?:风格|定位)(?:是|偏)?([^。，,；;\n]{2,20})/ },
];

/** Prefer longer cuisine match (重庆老火锅 > 火锅). */
function pickShopType(text: string): string | undefined {
  const cuisines = CUISINE.split("|").sort((a, b) => b.length - a.length);
  for (const c of cuisines) {
    if (text.includes(c)) return c;
  }
  return undefined;
}

export function extractFactsFromTurn(userText: string, assistantText: string): ShopFacts {
  // Only mine the USER message for durable shop facts.
  // Assistant replies often contain marketing copy that falsely matches "客群/风格" etc.
  void assistantText;
  const blob = userText;
  const facts: ShopFacts = {};

  const shopType = pickShopType(userText);
  if (shopType) facts.shopType = shopType.slice(0, 40);

  for (const { key, re } of FACT_PATTERNS) {
    if (key === "shopType" && facts.shopType) continue;
    const m = blob.match(re);
    if (m?.[1]) {
      const v = m[1].trim().slice(0, 80);
      // Drop junk that looks like sentence fragments from bad captures
      if (!v || /[`*#|>]|记着|方案|活动/.test(v)) continue;
      if (!facts[key]) facts[key] = v;
    }
  }

  if (/下次|回头|等我|晚点|明天/.test(userText)) {
    facts.openThread = userText.slice(0, 120);
  }
  return facts;
}

export function consultantPersonaBlock(productName: string) {
  return [
    `你是「${productName}」的资深顾问，像微信里认识的懂行朋友，不是填表机器人。`,
    "真正服务好对方：听懂他的店和目标，缺关键信息就先追问一两句，再给可直接用的方案/文案。",
    "禁止冷冰冰的模板腔、禁止一次甩出长清单、禁止空话套话。",
    "若记忆里已有店铺信息，直接用，不要重复盘问已知事实。",
    "方案要贴这家店：写出口径、渠道、力度时点名他的业态和客群。",
  ].join("\n");
}

export async function loadShopMemory(userId: string, productId: string) {
  const row = await prisma.shopMemory.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!row) return { summary: "", facts: {} as ShopFacts };
  let facts: ShopFacts = {};
  try {
    facts = JSON.parse(row.facts || "{}") as ShopFacts;
  } catch {
    facts = {};
  }
  return { summary: row.summary || "", facts };
}

export function formatMemoryForPrompt(memory: {
  summary: string;
  facts: ShopFacts;
}) {
  const lines: string[] = [];
  if (memory.summary.trim()) lines.push(`长期印象：${memory.summary.trim()}`);
  const labels: Record<keyof ShopFacts, string> = {
    shopType: "业态",
    style: "风格",
    avgPrice: "客单价",
    audience: "客群",
    goal: "目标",
    lastCampaign: "上次活动",
    preferences: "偏好",
    openThread: "未完成事项",
  };
  for (const [key, label] of Object.entries(labels) as [keyof ShopFacts, string][]) {
    const v = memory.facts[key]?.trim();
    if (v) lines.push(`${label}：${v}`);
  }
  if (!lines.length) return "";
  return `已记住的店铺画像（请当真人顾问用，不要复读成清单）：\n${lines.join("\n")}`;
}

export async function upsertShopMemory(
  userId: string,
  productId: string,
  patch: { summary?: string; facts?: ShopFacts }
) {
  const existing = await loadShopMemory(userId, productId);
  const merged: ShopFacts = { ...existing.facts, ...(patch.facts || {}) };
  // Drop empty-string overwrites so clears work
  const facts: ShopFacts = {};
  for (const [k, v] of Object.entries(merged) as [keyof ShopFacts, string | undefined][]) {
    if (typeof v === "string" && v.trim()) facts[k] = v.trim();
  }
  const rebuilt = Object.values(facts).filter(Boolean).join("；").slice(0, 800);
  const summary =
    typeof patch.summary === "string" && patch.summary.trim()
      ? patch.summary.trim().slice(0, 800)
      : rebuilt;

  await prisma.shopMemory.upsert({
    where: { userId_productId: { userId, productId } },
    create: {
      userId,
      productId,
      summary,
      facts: JSON.stringify(facts),
    },
    update: {
      summary,
      facts: JSON.stringify(facts),
    },
  });
}

export async function rememberTurn(
  userId: string,
  productId: string,
  userText: string,
  assistantText: string
) {
  const facts = extractFactsFromTurn(userText, assistantText);
  if (!Object.keys(facts).length) return;
  await upsertShopMemory(userId, productId, { facts });
  const memory = await loadShopMemory(userId, productId);
  void syncLettaMemoryLayer({
    userId,
    productId,
    summary: memory.summary,
    facts: memory.facts,
  });
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2)
    .slice(0, 24);
}

export async function retrieveKnowledge(
  userId: string,
  productId: string,
  query: string,
  limit = 4
) {
  const chunks = await prisma.knowledgeChunk.findMany({
    where: { userId, productId },
    orderBy: { updatedAt: "desc" },
    take: 80,
  });
  if (!chunks.length) return [];

  const qTokens = tokenize(query);
  const queryVec = await embedText(query, { productId });

  const scored = chunks
    .map((chunk) => {
      const hay = `${chunk.title}\n${chunk.text}`.toLowerCase();
      let keywordScore = 0;
      for (const t of qTokens) {
        if (hay.includes(t)) keywordScore += t.length >= 4 ? 3 : 1;
      }
      if (!qTokens.length) keywordScore = 1;
      const docVec = parseEmbedding(chunk.embedding);
      const score = queryVec
        ? scoreByEmbedding(queryVec, docVec, keywordScore)
        : keywordScore;
      return { chunk, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((row) => row.chunk);
}

export function formatKnowledgeForPrompt(
  chunks: { title: string; text: string; source: string }[]
) {
  if (!chunks.length) return "";
  const body = chunks
    .map((c, i) => {
      const head = c.title.trim() || c.source || `资料${i + 1}`;
      return `【${head}】\n${c.text.slice(0, 600)}`;
    })
    .join("\n\n");
  return `本店相关资料（据此回答，不要编造资料里没有的事实）：\n${body}`;
}

export async function addKnowledgeChunk(input: {
  userId: string;
  productId: string;
  text: string;
  title?: string;
  source?: string;
}) {
  const text = input.text.trim().slice(0, 8_000);
  if (!text) return null;
  const vec = await embedText(`${input.title || ""}\n${text}`, {
    productId: input.productId,
  });
  return prisma.knowledgeChunk.create({
    data: {
      userId: input.userId,
      productId: input.productId,
      text,
      title: (input.title || "").trim().slice(0, 120),
      source: (input.source || "manual").trim().slice(0, 40),
      embedding: vec ? serializeEmbedding(vec) : "",
    },
  });
}

/** Optional cloud backends. Letta = memory layer only (not chat LLM). */
export function cloudAgentConfig() {
  const dify = {
    enabled: Boolean(process.env.DIFY_API_URL && process.env.DIFY_API_KEY),
    apiUrl: (process.env.DIFY_API_URL || "").replace(/\/$/, ""),
    apiKey: process.env.DIFY_API_KEY || "",
    userPrefix: process.env.DIFY_USER_PREFIX || "aisupermarket",
  };
  const letta = {
    enabled: Boolean(
      process.env.LETTA_API_URL &&
        process.env.LETTA_API_KEY &&
        process.env.LETTA_AGENT_ID
    ),
    apiUrl: (process.env.LETTA_API_URL || "").replace(/\/$/, ""),
    apiKey: process.env.LETTA_API_KEY || "",
    agentId: process.env.LETTA_AGENT_ID || "",
  };
  return { dify, letta };
}

function lettaHeaders(apiKey: string): HeadersInit {
  return {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
    "User-Agent": "ai-supermarket/1.0",
  };
}

/** Layer 1 read: Letta core + archival memory (no LLM call). */
export async function loadLettaMemoryLayer(query: string): Promise<string> {
  const { letta } = cloudAgentConfig();
  if (!letta.enabled) return "";

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12_000);
    const [coreRes, archRes] = await Promise.all([
      fetch(`${letta.apiUrl}/v1/agents/${letta.agentId}/core-memory/blocks`, {
        headers: lettaHeaders(letta.apiKey),
        signal: controller.signal,
      }),
      fetch(
        `${letta.apiUrl}/v1/agents/${letta.agentId}/archival-memory?limit=6${
          query.trim()
            ? `&search=${encodeURIComponent(query.trim().slice(0, 80))}`
            : ""
        }`,
        {
          headers: lettaHeaders(letta.apiKey),
          signal: controller.signal,
        }
      ),
    ]);
    clearTimeout(timer);

    const parts: string[] = [];
    if (coreRes.ok) {
      const blocks = (await coreRes.json()) as {
        label?: string;
        value?: string;
      }[];
      const human = (Array.isArray(blocks) ? blocks : []).find(
        (b) => b.label === "human"
      );
      if (human?.value?.trim()) {
        parts.push(`Letta 长期画像：\n${human.value.trim().slice(0, 1200)}`);
      }
    }
    if (archRes.ok) {
      const passages = (await archRes.json()) as { text?: string }[];
      const texts = (Array.isArray(passages) ? passages : [])
        .map((p) => p.text?.trim())
        .filter((t): t is string => Boolean(t))
        .slice(0, 5);
      if (texts.length) {
        parts.push(
          `Letta 档案记忆：\n${texts.map((t, i) => `${i + 1}. ${t.slice(0, 280)}`).join("\n")}`
        );
      }
    }
    return parts.length
      ? `超市记忆层（Letta，只作事实，不要复读成清单）：\n${parts.join("\n\n")}`
      : "";
  } catch {
    return "";
  }
}

/** Layer 1 write: push facts into Letta archival (and best-effort core human block). */
export async function syncLettaMemoryLayer(input: {
  userId: string;
  productId: string;
  summary: string;
  facts: ShopFacts;
}): Promise<void> {
  const { letta } = cloudAgentConfig();
  if (!letta.enabled) return;

  const lines = [
    `product=${input.productId}`,
    `user=${input.userId}`,
    input.summary ? `summary=${input.summary}` : "",
    ...Object.entries(input.facts)
      .filter(([, v]) => Boolean(v?.trim()))
      .map(([k, v]) => `${k}=${v}`),
  ].filter(Boolean);
  if (lines.length < 2) return;
  const text = lines.join("; ").slice(0, 1500);

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    await fetch(`${letta.apiUrl}/v1/agents/${letta.agentId}/archival-memory`, {
      method: "POST",
      headers: lettaHeaders(letta.apiKey),
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    clearTimeout(timer);
  } catch {
    // memory sync is best-effort
  }

  // Best-effort core block update (some networks block PATCH; ignore failures)
  try {
    const humanValue = [
      "[ai-supermarket shop memory]",
      ...Object.entries(input.facts)
        .filter(([, v]) => Boolean(v?.trim()))
        .map(([k, v]) => `${k}: ${v}`),
      input.summary ? `summary: ${input.summary}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .slice(0, 4000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8_000);
    await fetch(
      `${letta.apiUrl}/v1/agents/${letta.agentId}/core-memory/blocks/human`,
      {
        method: "PATCH",
        headers: lettaHeaders(letta.apiKey),
        body: JSON.stringify({ value: humanValue }),
        signal: controller.signal,
      }
    );
    clearTimeout(timer);
  } catch {
    // ignore
  }
}

export async function tryDifyCloudReply(input: {
  userId: string;
  productId: string;
  message: string;
}): Promise<string | null> {
  const { dify } = cloudAgentConfig();
  if (!dify.enabled) return null;

  try {
    const res = await fetch(`${dify.apiUrl}/chat-messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${dify.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        inputs: { product_id: input.productId },
        query: input.message,
        response_mode: "blocking",
        user: `${dify.userPrefix}-${input.userId}`,
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { answer?: string };
    const answer = String(data.answer || "").trim();
    return answer || null;
  } catch {
    return null;
  }
}
