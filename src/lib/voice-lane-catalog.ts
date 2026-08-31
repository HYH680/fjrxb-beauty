/**
 * 语音通道选型：先选场景 1–5 → 再选高/中/低 → 再定模型。
 * available 取决于本机 env，缺 key 的选项会标 needKey。
 */

export type VoiceLaneId = 1 | 2 | 3 | 4 | 5;
export type VoiceTierId = "high" | "mid" | "low";

export type VoiceProviderId =
  | "qwen-clone"
  | "qwen-tts"
  | "minimax"
  | "elevenlabs"
  | "openai"
  | "fish"
  | "cartesia"
  | "inworld"
  | "deepgram";

export type VoiceModelOption = {
  id: string;
  label: string;
  provider: VoiceProviderId;
  /** 传给厂商的 model / voice 标识 */
  vendorModel: string;
  /** 默认系统音色（非克隆） */
  defaultVoice?: string;
  supportsClone: boolean;
  envKeys: string[];
  blurb: string;
};

export type VoiceLane = {
  id: VoiceLaneId;
  title: string;
  blurb: string;
  tiers: Record<VoiceTierId, VoiceModelOption[]>;
};

const QWEN_CLONE: VoiceModelOption = {
  id: "qwen3-tts-vc",
  label: "千问 Qwen3-TTS 克隆",
  provider: "qwen-clone",
  vendorModel: "qwen3-tts-vc-2026-01-22",
  supportsClone: true,
  envKeys: ["QWEN_API_KEY"],
  blurb: "中文真克隆，样本 10–20 秒",
};

const QWEN_COSY: VoiceModelOption = {
  id: "cosyvoice-v2",
  label: "千问 CosyVoice 通用",
  provider: "qwen-tts",
  vendorModel: "cosyvoice-v2",
  defaultVoice: "longxiaochun_v2",
  supportsClone: false,
  envKeys: ["QWEN_API_KEY"],
  blurb: "通用中文音色，草稿试听",
};

const MM_28_HD: VoiceModelOption = {
  id: "minimax-speech-2.8-hd",
  label: "MiniMax speech-2.8-hd",
  provider: "minimax",
  vendorModel: "speech-2.8-hd",
  defaultVoice: "female-tianmei",
  supportsClone: true,
  envKeys: ["MINIMAX_API_KEY"],
  blurb: "海螺高清，中英都强",
};

const MM_26_HD: VoiceModelOption = {
  id: "minimax-speech-2.6-hd",
  label: "MiniMax speech-2.6-hd",
  provider: "minimax",
  vendorModel: "speech-2.6-hd",
  defaultVoice: "female-tianmei",
  supportsClone: true,
  envKeys: ["MINIMAX_API_KEY"],
  blurb: "海螺稳定档，性价比高",
};

const MM_26_TURBO: VoiceModelOption = {
  id: "minimax-speech-2.6-turbo",
  label: "MiniMax speech-2.6-turbo",
  provider: "minimax",
  vendorModel: "speech-2.6-turbo",
  defaultVoice: "female-tianmei",
  supportsClone: true,
  envKeys: ["MINIMAX_API_KEY"],
  blurb: "更快更省，多语种",
};

const ELEVEN: VoiceModelOption = {
  id: "elevenlabs-multilingual",
  label: "ElevenLabs Multilingual",
  provider: "elevenlabs",
  vendorModel: "eleven_multilingual_v2",
  supportsClone: true,
  envKeys: ["ELEVENLABS_API_KEY"],
  blurb: "英文精品旁白首选",
};

const OPENAI_HD: VoiceModelOption = {
  id: "openai-tts-hd",
  label: "OpenAI TTS-HD（API2D）",
  provider: "openai",
  vendorModel: "tts-1-hd",
  defaultVoice: "alloy",
  supportsClone: false,
  envKeys: ["OPENAI_API_KEY"],
  blurb: "英文够用；本站经 API2D 兼容通道",
};

const FISH: VoiceModelOption = {
  id: "fish-s2-pro",
  label: "Fish Audio S2 Pro",
  provider: "fish",
  vendorModel: "s2-pro",
  supportsClone: true,
  envKeys: ["FISH_API_KEY"],
  blurb: "中英性价比，真克隆",
};

const CARTESIA: VoiceModelOption = {
  id: "cartesia-sonic",
  label: "Cartesia Sonic",
  provider: "cartesia",
  vendorModel: "sonic-3",
  supportsClone: false,
  envKeys: ["CARTESIA_API_KEY"],
  blurb: "英文低延迟实时 TTS",
};

const INWORLD: VoiceModelOption = {
  id: "inworld-tts",
  label: "Inworld Realtime TTS",
  provider: "inworld",
  vendorModel: "inworld-tts-1.5-max",
  supportsClone: true,
  envKeys: ["INWORLD_API_KEY"],
  blurb: "英文实时质量对标",
};

const DEEPGRAM: VoiceModelOption = {
  id: "deepgram-aura",
  label: "Deepgram Aura",
  provider: "deepgram",
  vendorModel: "aura",
  supportsClone: false,
  envKeys: ["DEEPGRAM_API_KEY"],
  blurb: "语音客服低延迟",
};

export const VOICE_LANES: VoiceLane[] = [
  {
    id: 1,
    title: "中文口播 / 品牌声",
    blurb: "店播、课程、促销口播",
    tiers: {
      high: [QWEN_CLONE, MM_28_HD],
      mid: [MM_26_HD, FISH],
      low: [QWEN_COSY, MM_26_TURBO],
    },
  },
  {
    id: 2,
    title: "声音克隆（像本人）",
    blurb: "上传授权样本复刻声线",
    tiers: {
      high: [QWEN_CLONE, MM_28_HD, ELEVEN],
      mid: [MM_26_HD, FISH, CARTESIA],
      low: [QWEN_COSY],
    },
  },
  {
    id: 3,
    title: "英文质感旁白",
    blurb: "海外广告、英文精品旁白",
    tiers: {
      high: [ELEVEN, INWORLD, CARTESIA],
      mid: [FISH, MM_28_HD, OPENAI_HD],
      low: [OPENAI_HD, MM_26_TURBO],
    },
  },
  {
    id: 4,
    title: "实时对话 / 语音客服",
    blurb: "低延迟流式对聊",
    tiers: {
      high: [CARTESIA, DEEPGRAM, INWORLD],
      mid: [MM_26_TURBO, FISH],
      low: [QWEN_COSY],
    },
  },
  {
    id: 5,
    title: "成本 / 量产",
    blurb: "大批量合成、控预算",
    tiers: {
      high: [QWEN_CLONE, MM_26_HD],
      mid: [MM_26_TURBO, FISH, OPENAI_HD],
      low: [QWEN_COSY],
    },
  },
];

export const VOICE_TIER_LABELS: Record<VoiceTierId, string> = {
  high: "高（质感优先）",
  mid: "中（性价比）",
  low: "低（草稿够用）",
};

function envOn(name: string) {
  return Boolean(process.env[name]?.trim());
}

export function voiceEnvStatus() {
  const keys = [
    "QWEN_API_KEY",
    "MINIMAX_API_KEY",
    "ELEVENLABS_API_KEY",
    "OPENAI_API_KEY",
    "FISH_API_KEY",
    "CARTESIA_API_KEY",
    "INWORLD_API_KEY",
    "DEEPGRAM_API_KEY",
  ] as const;
  const present: string[] = [];
  const missing: string[] = [];
  for (const k of keys) {
    (envOn(k) ? present : missing).push(k);
  }
  return { present, missing };
}

export function isVoiceModelReady(option: VoiceModelOption) {
  return option.envKeys.every((k) => envOn(k));
}

export function getVoiceLane(id: VoiceLaneId) {
  return VOICE_LANES.find((l) => l.id === id) || VOICE_LANES[0];
}

export function getVoiceModels(lane: VoiceLaneId, tier: VoiceTierId) {
  return getVoiceLane(lane).tiers[tier] || [];
}

export function getVoiceModelById(id: string) {
  for (const lane of VOICE_LANES) {
    for (const tier of Object.values(lane.tiers)) {
      const hit = tier.find((m) => m.id === id);
      if (hit) return hit;
    }
  }
  return null;
}

/** 服务端解析：缺 key 时自动落到同档第一个可用模型 */
export function resolveVoiceModel(input: {
  lane?: VoiceLaneId;
  tier?: VoiceTierId;
  modelId?: string;
}): {
  option: VoiceModelOption;
  fallbackFrom?: string;
  needKey?: string[];
} {
  const lane = input.lane || 1;
  const tier = input.tier || "high";
  const models = getVoiceModels(lane, tier);
  const preferred =
    (input.modelId && getVoiceModelById(input.modelId)) || models[0];

  if (preferred && isVoiceModelReady(preferred)) {
    return { option: preferred };
  }

  const ready = models.find(isVoiceModelReady);
  if (ready) {
    return {
      option: ready,
      fallbackFrom: preferred?.id,
      needKey: preferred?.envKeys.filter((k) => !envOn(k)),
    };
  }

  // 跨档：同场景任意可用
  for (const t of ["high", "mid", "low"] as VoiceTierId[]) {
    const hit = getVoiceModels(lane, t).find(isVoiceModelReady);
    if (hit) {
      return {
        option: hit,
        fallbackFrom: preferred?.id,
        needKey: preferred?.envKeys.filter((k) => !envOn(k)),
      };
    }
  }

  // 全局兜底
  const all = VOICE_LANES.flatMap((l) =>
    (["high", "mid", "low"] as VoiceTierId[]).flatMap((t) => l.tiers[t])
  );
  const any = all.find(isVoiceModelReady);
  if (any) {
    return {
      option: any,
      fallbackFrom: preferred?.id,
      needKey: preferred?.envKeys.filter((k) => !envOn(k)),
    };
  }

  throw new Error(
    `当前无可用语音通道。已配置：${voiceEnvStatus().present.join(", ") || "无"}；缺少：${voiceEnvStatus().missing.join(", ")}`
  );
}
