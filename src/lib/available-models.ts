import type { ProviderName } from "@/lib/llm-config";
import { TOKENHUB_PICKER_MODELS } from "@/lib/tokenhub-models";

export type ModelTier = "cheap" | "standard" | "premium" | "reasoning";

export type ModelOption = {
  id: string;
  label: string;
  family: string;
  tier: ModelTier;
  vision?: boolean;
  /**
   * 手选模型时直连该厂商（不依赖 New API 网关）。
   * TokenHub 独有/补缺模型必须带 provider，否则无网关时选中无效。
   */
  provider?: ProviderName;
};

export const MODEL_TIERS: Record<ModelTier, { label: string; hint: string }> = {
  cheap: { label: "省钱", hint: "日常首选，自动推荐优先" },
  standard: { label: "标准", hint: "性价比均衡" },
  premium: { label: "旗舰", hint: "质量更高，更贵" },
  reasoning: { label: "推理", hint: "深度思考，慢且贵" },
};

/**
 * 手动覆盖用模型列表。默认仍走「自动选模型」按任务精排（省钱）。
 * 档位：国产中文优先进省钱/标准，海外旗舰进 premium。
 * TokenHub 模型带 provider=tokenhub，有密钥即可手选。
 */
const BASE_MODELS: ModelOption[] = [
  { id: "qwen3.8-max", label: "千问 3.8 Max", family: "国产", tier: "cheap" },
  { id: "doubao-seed-2-1-pro-260628", label: "豆包 Seed 2.1 Pro", family: "国产", tier: "cheap" },
  { id: "ernie-5.0-thinking-preview", label: "文心 ERNIE 5.0", family: "百度", tier: "reasoning", vision: true },
  { id: "gpt-5.6-sol", label: "GPT-5.6 Sol", family: "GPT", tier: "premium", vision: true },
  { id: "claude-fable-5", label: "Claude Fable 5", family: "Claude", tier: "premium" },
  { id: "gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", family: "Gemini", tier: "premium", vision: true },
  { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro", family: "Gemini", tier: "premium", vision: true },
];

function mergeAvailableModels(): ModelOption[] {
  const byId = new Map<string, ModelOption>();
  for (const m of BASE_MODELS) byId.set(m.id, m);
  for (const m of TOKENHUB_PICKER_MODELS) {
    const prev = byId.get(m.id);
    byId.set(m.id, {
      id: m.id,
      label: prev?.label || m.label,
      family: prev?.family || m.family,
      tier: prev?.tier || m.tier,
      vision: m.vision ?? prev?.vision,
      provider: "tokenhub",
    });
  }
  return Array.from(byId.values());
}

export const AVAILABLE_MODELS: ModelOption[] = mergeAvailableModels();

const ALLOWED_IDS = new Set(AVAILABLE_MODELS.map((m) => m.id));

export function isValidModel(id: string): boolean {
  return ALLOWED_IDS.has(id);
}

export function getAvailableModel(id: string): ModelOption | undefined {
  return AVAILABLE_MODELS.find((m) => m.id === id);
}
