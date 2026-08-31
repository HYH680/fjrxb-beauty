import { getGatewayOverride, getLlmConfig } from "@/lib/llm-config";
import {
  cohereEmbedEnabled,
  embedWithCohere,
} from "@/lib/integrations/cohere-embed";

function cosine(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  if (!n) return 0;
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function parseEmbedding(raw: string): number[] | null {
  if (!raw.trim()) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const nums = parsed.filter((n): n is number => typeof n === "number");
    return nums.length ? nums : null;
  } catch {
    return null;
  }
}

export function serializeEmbedding(vec: number[]) {
  return JSON.stringify(vec.map((n) => Math.round(n * 1e6) / 1e6));
}

async function embeddingEndpoint() {
  const gateway = getGatewayOverride();
  if (gateway) {
    return {
      baseUrl: gateway.baseUrl.replace(/\/$/, ""),
      apiKey: gateway.apiKey,
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    };
  }
  const openai = process.env.OPENAI_API_KEY?.trim();
  if (openai) {
    return {
      baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
        /\/$/,
        ""
      ),
      apiKey: openai,
      model: process.env.EMBEDDING_MODEL || "text-embedding-3-small",
    };
  }
  const qwen = process.env.QWEN_API_KEY?.trim();
  if (qwen) {
    return {
      baseUrl: (
        process.env.QWEN_BASE_URL ||
        "https://dashscope.aliyuncs.com/compatible-mode/v1"
      ).replace(/\/$/, ""),
      apiKey: qwen,
      model: process.env.EMBEDDING_MODEL || "text-embedding-v3",
    };
  }
  // last resort: any configured chat key won't work for embeddings — return null
  void getLlmConfig;
  return null;
}

export async function embedText(
  text: string,
  opts?: { productId?: string }
): Promise<number[] | null> {
  const input = text.trim().slice(0, 6000);
  if (!input) return null;

  const wantCohere =
    opts?.productId === "cohere-embed" ||
    (process.env.EMBEDDING_PROVIDER || "").trim().toLowerCase() === "cohere";
  if (wantCohere) {
    if (!cohereEmbedEnabled()) return null;
    try {
      return await embedWithCohere(input);
    } catch {
      return null;
    }
  }

  const endpoint = await embeddingEndpoint();
  if (!endpoint) return null;
  try {
    const res = await fetch(`${endpoint.baseUrl}/embeddings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${endpoint.apiKey}`,
      },
      body: JSON.stringify({ model: endpoint.model, input }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      data?: { embedding?: number[] }[];
    };
    const vec = data.data?.[0]?.embedding;
    return Array.isArray(vec) ? vec : null;
  } catch {
    return null;
  }
}

export function scoreByEmbedding(
  queryVec: number[],
  docVec: number[] | null,
  keywordScore: number
) {
  if (!docVec) return keywordScore;
  const sim = cosine(queryVec, docVec);
  return keywordScore + sim * 10;
}

export { cosine };
