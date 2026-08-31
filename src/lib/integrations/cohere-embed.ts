import { outboundFetch } from "@/lib/integrations/outbound-proxy";

/** Cohere Embed：检索增强服务专用向量通道 */

export function cohereEmbedEnabled() {
  return Boolean(cohereApiKey());
}

function cohereApiKey() {
  return process.env.COHERE_API_KEY?.trim() || "";
}

function cohereModel() {
  return (
    process.env.COHERE_EMBED_MODEL?.trim() || "embed-multilingual-v3.0"
  ).trim();
}

type CohereEmbedResp = {
  embeddings?: number[][] | { float?: number[][] };
  message?: string;
};

export async function embedWithCohere(text: string): Promise<number[] | null> {
  const key = cohereApiKey();
  if (!key) return null;
  const input = text.trim().slice(0, 6000);
  if (!input) return null;

  const res = await outboundFetch("https://api.cohere.com/v1/embed", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      model: cohereModel(),
      texts: [input],
      input_type: "search_document",
      embedding_types: ["float"],
    }),
  });
  const data = (await res.json().catch(() => ({}))) as CohereEmbedResp;
  if (!res.ok) {
    throw new Error(data.message || `Cohere embed HTTP ${res.status}`);
  }
  const floats = Array.isArray(data.embeddings)
    ? data.embeddings[0]
    : data.embeddings?.float?.[0];
  return Array.isArray(floats) ? floats : null;
}
