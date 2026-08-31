/**
 * TokenHub（腾讯大模型服务平台）本站可选手动模型。
 * 与 GET /v1/models 对齐的对话/看图子集；视频/3D/语音等多模态在 showcase 展示，
 * 不进聊天选模器（工作台仍走既有出图/成片通道）。
 */

export type TokenHubPickerModel = {
  id: string;
  label: string;
  family: string;
  tier: "cheap" | "standard" | "premium" | "reasoning";
  vision?: boolean;
};

/** 聊天选模器 + isValidModel：走 provider=tokenhub */
export const TOKENHUB_PICKER_MODELS: TokenHubPickerModel[] = [
  { id: "hy3", label: "混元 Hy3", family: "混元", tier: "standard" },
  { id: "hy-role", label: "混元角色", family: "混元", tier: "standard" },
  { id: "qwen3.5-plus", label: "千问 3.5 Plus", family: "国产", tier: "cheap" },
  { id: "qwen3.5-flash", label: "千问 3.5 Flash", family: "国产", tier: "cheap" },
  { id: "deepseek-v4-pro", label: "DeepSeek V4 Pro", family: "国产", tier: "standard" },
  { id: "deepseek-v4-flash", label: "DeepSeek V4 Flash", family: "国产", tier: "cheap" },
  { id: "deepseek-v3.2", label: "DeepSeek V3.2", family: "国产", tier: "cheap" },
  { id: "kimi-k2.6", label: "Kimi K2.6", family: "Kimi", tier: "standard", vision: true },
  { id: "kimi-k3", label: "Kimi K3", family: "Kimi", tier: "premium", vision: true },
  { id: "kimi-k2.7-code", label: "Kimi K2.7 Code", family: "Kimi", tier: "standard" },
  { id: "glm-5.2", label: "GLM-5.2", family: "智谱", tier: "premium", vision: true },
  { id: "glm-5.3", label: "GLM-5.3", family: "智谱", tier: "premium", vision: true },
  { id: "glm-5.3-flash", label: "GLM-5.3 Flash", family: "智谱", tier: "standard" },
  { id: "glm-5.1", label: "GLM-5.1", family: "智谱", tier: "standard" },
  { id: "glm-5", label: "GLM-5", family: "智谱", tier: "standard" },
  { id: "glm-5v-turbo", label: "GLM-5V Turbo", family: "智谱", tier: "premium", vision: true },
  { id: "minimax-m3", label: "MiniMax M3", family: "MiniMax", tier: "standard" },
  { id: "minimax-m2.7", label: "MiniMax M2.7", family: "MiniMax", tier: "cheap" },
  { id: "minimax-m2.5", label: "MiniMax M2.5", family: "MiniMax", tier: "cheap" },
  { id: "mimo-v2.5-pro", label: "MiMo V2.5 Pro", family: "国产", tier: "standard" },
  { id: "youtu-vita", label: "Youtu Vita", family: "腾讯", tier: "standard" },
  {
    id: "hy-vision-2.0-instruct",
    label: "混元看图 2.0",
    family: "混元",
    tier: "standard",
    vision: true,
  },
];

export const TOKENHUB_PICKER_IDS = new Set(TOKENHUB_PICKER_MODELS.map((m) => m.id));
