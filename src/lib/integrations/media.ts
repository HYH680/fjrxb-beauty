import {
  generateImageJimeng,
  jimengMediaEnabled,
} from "@/lib/integrations/jimeng-media";
import {
  dashscopeMediaEnabled,
  enrollVoiceDashScope,
  generateImageDashScope,
  synthesizeSpeechDashScope,
  synthesizeSpeechQwenTts,
  transcribeAudioDashScope,
} from "@/lib/integrations/dashscope-media";
import {
  cloneVoiceMinimax,
  minimaxMediaEnabled,
  synthesizeSpeechMinimax,
} from "@/lib/integrations/minimax-media";
import {
  cloneAndSpeakFish,
  fishMediaEnabled,
  synthesizeSpeechFish,
} from "@/lib/integrations/fish-media";
import {
  cartesiaMediaEnabled,
  synthesizeSpeechCartesia,
} from "@/lib/integrations/cartesia-media";
import {
  resolveVoiceModel,
  type VoiceLaneId,
  type VoiceTierId,
} from "@/lib/voice-lane-catalog";
import { resolveServiceBase } from "@/lib/integrations/feature-flags";
import {
  openaiSize,
  type AspectRatioId,
  wanxSize,
  type ResTierId,
} from "@/lib/image-studio";
import { getImageModel } from "@/lib/image-models";
import { getGatewayOverride } from "@/lib/llm-config";
import { normalizeSegments, type TranscriptSegment } from "@/lib/subtitle-studio";
import {
  generateImageMidjourney,
  midjourneyMediaEnabled,
} from "@/lib/integrations/midjourney-media";
import {
  generateImageReplicate,
  replicateMediaEnabled,
} from "@/lib/integrations/replicate-media";

/** 文本网关不一定带 TTS；语音走 OPENAI_* / API2D 直连 */
function openaiSpeechCompatible() {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  return {
    baseUrl: (process.env.OPENAI_BASE_URL || "https://api.openai.com/v1").replace(
      /\/$/,
      ""
    ),
    apiKey: key,
  };
}

function openaiCompatible() {
  // 出图优先走 OPENAI_*（API2D / 官方），避免用量网关不支持 /images
  const direct = openaiSpeechCompatible();
  if (direct) return direct;
  const gateway = getGatewayOverride();
  if (gateway) {
    return {
      baseUrl: gateway.baseUrl.replace(/\/$/, ""),
      apiKey: gateway.apiKey,
    };
  }
  return null;
}

function imageProvider() {
  return (process.env.IMAGE_PROVIDER || "auto").trim().toLowerCase();
}

function resolveSizes(input: {
  size?: string;
  aspect?: AspectRatioId;
  tier?: ResTierId;
}) {
  const aspect = input.aspect || "1:1";
  const tier = input.tier || "1k";
  return {
    wanx: input.size?.includes("*")
      ? input.size
      : wanxSize(aspect, tier),
    openai: input.size?.includes("x")
      ? input.size
      : openaiSize(aspect),
  };
}

async function generateImageOpenAI(input: {
  prompt: string;
  size?: string;
  model?: string;
}) {
  const openai = openaiCompatible();
  if (!openai) throw new Error("未配置 OPENAI_API_KEY / LLM 网关");
  const res = await fetch(`${openai.baseUrl}/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openai.apiKey}`,
    },
    body: JSON.stringify({
      model:
        input.model ||
        process.env.OPENAI_IMAGE_MODEL ||
        "dall-e-3",
      prompt: input.prompt,
      size: input.size || "1024x1024",
      n: 1,
      response_format: "b64_json",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `出图失败 ${res.status}`);
  }
  const data = (await res.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  const row = data.data?.[0];
  return {
    provider: "openai",
    model: input.model || "dall-e-3",
    b64: row?.b64_json || "",
    url: row?.url || "",
    size: input.size || "1024x1024",
    usedRef: false,
  };
}

/**
 * 出图优先级（IMAGE_PROVIDER=auto 时）：
 * 1) 千问万相
 * 2) 即梦
 * 不走 Stability / API2D @draw（上游 SD 额度不通）。
 */
export async function generateImage(input: {
  prompt: string;
  size?: string;
  aspect?: AspectRatioId;
  tier?: ResTierId;
  n?: number;
  imageModel?: string;
  /** 参考图：优先 http(s)，也接受 data:image */
  references?: string[];
}) {
  const provider = imageProvider();
  const errors: string[] = [];
  const sizes = resolveSizes(input);
  const count = Math.min(4, Math.max(1, Math.floor(input.n || 1)));
  const picked = getImageModel(input.imageModel);
  const refImg =
    input.references?.find(
      (item) =>
        typeof item === "string" &&
        (item.startsWith("http://") ||
          item.startsWith("https://") ||
          item.startsWith("data:image/"))
    ) || "";

  const tryQwen = async () => {
    if (!dashscopeMediaEnabled()) throw new Error("未配置 QWEN_API_KEY");
    return generateImageDashScope(input.prompt, {
      size: sizes.wanx,
      n: count,
      model: picked.provider === "qwen" ? picked.upstream : undefined,
      refImg: picked.supportsRef ? refImg : "",
    });
  };

  const tryJimeng = async () => {
    if (!jimengMediaEnabled()) throw new Error("未配置即梦 Access Key");
    return generateImageJimeng({
      prompt: input.prompt,
      size: sizes.wanx.includes("*")
        ? sizes.wanx.replace("*", "x")
        : sizes.openai,
      reqKey: picked.provider === "jimeng" ? picked.upstream : undefined,
    });
  };

  const tryOpenAI = async () =>
    generateImageOpenAI({
      prompt: input.prompt,
      size: sizes.openai,
      model: picked.provider === "openai" ? picked.upstream : undefined,
    });

  // 用户明确选了出图模型时只走对应通道
  if (input.imageModel && picked.provider === "openai") {
    return tryOpenAI();
  }
  if (input.imageModel && picked.provider === "qwen") {
    return tryQwen();
  }
  if (input.imageModel && picked.provider === "jimeng") {
    return tryJimeng();
  }
  if (input.imageModel && picked.provider === "midjourney") {
    if (!midjourneyMediaEnabled()) {
      throw new Error(
        "未配置 Midjourney：请自建 midjourney-proxy（MIDJOURNEY_PROVIDER=proxy + MIDJOURNEY_PROXY_BASE）"
      );
    }
    return generateImageMidjourney({ prompt: input.prompt });
  }
  if (input.imageModel && picked.provider === "replicate") {
    if (!replicateMediaEnabled()) {
      throw new Error("未配置 REPLICATE_API_TOKEN");
    }
    return generateImageReplicate({
      prompt: input.prompt,
      model: picked.upstream,
    });
  }

  // 旧 env 若写成 stability / sd，一律改走万相（不调 Stability 官方接口）
  if (
    provider === "stability" ||
    provider === "sd" ||
    provider === "qwen" ||
    provider === "dashscope" ||
    provider === "wanx"
  ) {
    return tryQwen();
  }
  if (provider === "jimeng" || provider === "seedream") {
    return tryJimeng();
  }
  if (provider === "openai") {
    try {
      return await tryOpenAI();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // auto（未指定 imageModel）：万相 → 即梦
  if (dashscopeMediaEnabled()) {
    try {
      return await tryQwen();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }
  if (jimengMediaEnabled()) {
    try {
      return await tryJimeng();
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  throw new Error(
    errors[0] ||
      "无法出图：请配置 QWEN_API_KEY（万相）或即梦 Access Key"
  );
}

/** 转写：本机 Whisper（若开）→ 千问 ASR → OpenAI */
export async function transcribeAudio(
  file: Blob,
  filename: string,
  durationSec?: number
) {
  const errors: string[] = [];

  const pack = (
    text: string,
    provider: string,
    rawSegments?: unknown
  ): { text: string; provider: string; segments: TranscriptSegment[] } => ({
    text,
    provider,
    segments: normalizeSegments(rawSegments, text, durationSec),
  });

  const worker = await resolveServiceBase("localWhisper");
  if (worker) {
    try {
      const form = new FormData();
      form.append("file", file, filename);
      const res = await fetch(`${worker.replace(/\/$/, "")}/transcribe`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(`转写服务 ${res.status}`);
      const data = (await res.json()) as {
        text?: string;
        segments?: unknown;
      };
      return pack(data.text || "", "faster-whisper", data.segments);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (dashscopeMediaEnabled()) {
    try {
      const data = await transcribeAudioDashScope(file, filename);
      return pack(data.text, data.provider);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const openai = openaiCompatible();
  if (openai) {
    try {
      const form = new FormData();
      form.append("file", file, filename);
      form.append("model", process.env.WHISPER_MODEL || "whisper-1");
      form.append("response_format", "verbose_json");
      const res = await fetch(`${openai.baseUrl}/audio/transcriptions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${openai.apiKey}` },
        body: form,
      });
      if (!res.ok) throw new Error(`OpenAI 转写 ${res.status}`);
      const data = (await res.json()) as {
        text?: string;
        segments?: unknown;
      };
      return pack(data.text || "", "openai-whisper", data.segments);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  throw new Error(
    errors[0] ||
      "无法转写：请配置 QWEN_API_KEY（推荐），或启动本机 Whisper / OPENAI"
  );
}

/**
 * TTS：按选型目录；未指定时 ElevenLabs → MiniMax → 千问 CosyVoice → OpenAI
 */
export async function synthesizeSpeech(input: {
  text: string;
  voice?: string;
  lane?: VoiceLaneId;
  tier?: VoiceTierId;
  modelId?: string;
}) {
  const errors: string[] = [];

  if (input.lane || input.tier || input.modelId) {
    try {
      const resolved = resolveVoiceModel({
        lane: input.lane,
        tier: input.tier,
        modelId: input.modelId,
      });
      const opt = resolved.option;
      if (opt.provider === "minimax") {
        const result = await synthesizeSpeechMinimax({
          text: input.text,
          voice: input.voice || opt.defaultVoice,
          model: opt.vendorModel,
        });
        return {
          ...result,
          modelId: opt.id,
          notice: resolved.fallbackFrom
            ? `原选 ${resolved.fallbackFrom} 缺密钥（${(resolved.needKey || []).join(",")}），已改用 ${opt.label}。`
            : undefined,
        };
      }
      if (opt.provider === "fish") {
        const result = await synthesizeSpeechFish({
          text: input.text,
          referenceId: input.voice,
          model: opt.vendorModel,
        });
        return {
          ...result,
          modelId: opt.id,
          notice: resolved.fallbackFrom
            ? `原选 ${resolved.fallbackFrom} 缺密钥，已改用 ${opt.label}。`
            : undefined,
        };
      }
      if (opt.provider === "cartesia") {
        if (!cartesiaMediaEnabled()) {
          throw new Error("未配置 CARTESIA_API_KEY");
        }
        const result = await synthesizeSpeechCartesia({
          text: input.text,
          voice: input.voice || opt.defaultVoice,
          model: opt.vendorModel,
        });
        return {
          ...result,
          modelId: opt.id,
          notice: resolved.fallbackFrom
            ? `原选 ${resolved.fallbackFrom} 缺密钥，已改用 ${opt.label}。`
            : undefined,
        };
      }
      if (opt.provider === "qwen-tts" || opt.provider === "qwen-clone") {
        const result = await synthesizeSpeechDashScope(
          input.text,
          input.voice || opt.defaultVoice
        );
        return {
          ...result,
          modelId: opt.id,
          notice: resolved.fallbackFrom
            ? `原选 ${resolved.fallbackFrom} 缺密钥，已改用 ${opt.label}。`
            : undefined,
        };
      }
      if (opt.provider === "elevenlabs") {
        const eleven = process.env.ELEVENLABS_API_KEY?.trim();
        if (eleven) {
          const voice =
            input.voice ||
            process.env.ELEVENLABS_VOICE_ID ||
            "21m00Tcm4TlvDq8ikWAM";
          const res = await fetch(
            `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
            {
              method: "POST",
              headers: {
                "xi-api-key": eleven,
                "Content-Type": "application/json",
                Accept: "audio/mpeg",
              },
              body: JSON.stringify({
                text: input.text.slice(0, 2500),
                model_id: opt.vendorModel,
              }),
            }
          );
          if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          return {
            provider: "elevenlabs" as const,
            mime: "audio/mpeg",
            base64: buf.toString("base64"),
            modelId: opt.id,
          };
        }
      }
      if (opt.provider === "openai") {
        const openai = openaiSpeechCompatible();
        if (openai) {
          const res = await fetch(`${openai.baseUrl}/audio/speech`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${openai.apiKey}`,
            },
            body: JSON.stringify({
              model: opt.vendorModel || process.env.TTS_MODEL || "tts-1-hd",
              voice: input.voice || opt.defaultVoice || "alloy",
              input: input.text.slice(0, 2500),
            }),
          });
          if (!res.ok) throw new Error(`OpenAI TTS ${res.status}`);
          const buf = Buffer.from(await res.arrayBuffer());
          return {
            provider: "openai" as const,
            mime: "audio/mpeg",
            base64: buf.toString("base64"),
            modelId: opt.id,
          };
        }
      }
      throw new Error(
        `${opt.label} 尚未接入或缺少密钥：${opt.envKeys.join(", ")}`
      );
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const eleven = process.env.ELEVENLABS_API_KEY?.trim();
  if (eleven) {
    try {
      const voice =
        input.voice || process.env.ELEVENLABS_VOICE_ID || "21m00Tcm4TlvDq8ikWAM";
      const res = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voice}`,
        {
          method: "POST",
          headers: {
            "xi-api-key": eleven,
            "Content-Type": "application/json",
            Accept: "audio/mpeg",
          },
          body: JSON.stringify({
            text: input.text.slice(0, 2500),
            model_id: process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2",
          }),
        }
      );
      if (!res.ok) throw new Error(`ElevenLabs ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        provider: "elevenlabs",
        mime: "audio/mpeg",
        base64: buf.toString("base64"),
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (minimaxMediaEnabled()) {
    try {
      return await synthesizeSpeechMinimax({
        text: input.text,
        voice: input.voice,
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (fishMediaEnabled()) {
    try {
      return await synthesizeSpeechFish({
        text: input.text,
        referenceId: input.voice,
      });
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (dashscopeMediaEnabled()) {
    try {
      return await synthesizeSpeechDashScope(input.text, input.voice);
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  const openai = openaiSpeechCompatible();
  if (openai) {
    try {
      const res = await fetch(`${openai.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openai.apiKey}`,
        },
        body: JSON.stringify({
          model: process.env.TTS_MODEL || "tts-1-hd",
          voice: input.voice || "alloy",
          input: input.text.slice(0, 2500),
        }),
      });
      if (!res.ok) throw new Error(`OpenAI TTS ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      return {
        provider: "openai",
        mime: "audio/mpeg",
        base64: buf.toString("base64"),
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  throw new Error(
    errors[0] ||
      "无法配音：请配置 MINIMAX_API_KEY / QWEN_API_KEY，或 ELEVENLABS / OPENAI"
  );
}

async function enrollVoiceElevenLabs(input: {
  sampleBase64: string;
  mime: string;
  filename: string;
  preferredName?: string;
}) {
  const eleven = process.env.ELEVENLABS_API_KEY?.trim();
  if (!eleven) return null;

  const bytes = Buffer.from(
    input.sampleBase64.replace(/^data:[^;]+;base64,/, ""),
    "base64"
  );
  const form = new FormData();
  form.append("name", (input.preferredName || "shop-voice").slice(0, 40));
  form.append(
    "files",
    new Blob([new Uint8Array(bytes)], { type: input.mime || "audio/mpeg" }),
    input.filename || "sample.mp3"
  );
  form.append(
    "description",
    "AI supermarket authorized shop voice clone preview"
  );

  const res = await fetch("https://api.elevenlabs.io/v1/voices/add", {
    method: "POST",
    headers: { "xi-api-key": eleven },
    body: form,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `ElevenLabs 克隆登记失败 ${res.status}`);
  }
  const data = (await res.json()) as { voice_id?: string };
  if (!data.voice_id) throw new Error("ElevenLabs 未返回 voice_id");
  return data.voice_id;
}

/**
 * 声音克隆试听：先按 场景→档位→模型 选型，再登记并合成。
 */
export async function synthesizeVoiceClonePreview(input: {
  text: string;
  consent: boolean;
  sampleBase64?: string;
  sampleMime?: string;
  sampleName?: string;
  /** @deprecated */
  hasSample?: boolean;
  voiceName?: string;
  lane?: VoiceLaneId;
  tier?: VoiceTierId;
  modelId?: string;
}) {
  if (!input.consent) {
    throw new Error("请先确认已取得发音人明示授权，禁止未经授权克隆他人声音。");
  }
  const sampleBase64 = input.sampleBase64?.trim() || "";
  if (!sampleBase64) {
    throw new Error(
      "请先上传人声样本（建议 10–20 秒清晰口播；wav/mp3/m4a，≤10MB）。"
    );
  }
  if (Buffer.byteLength(sampleBase64, "utf8") > 14 * 1024 * 1024) {
    throw new Error("样本过大，请压缩到约 10MB 以内再试。");
  }

  const mime = input.sampleMime || "audio/mpeg";
  const filename = input.sampleName || "sample.mp3";
  const preferredName = input.voiceName;
  const errors: string[] = [];

  const resolved = resolveVoiceModel({
    lane: input.lane || 2,
    tier: input.tier || "high",
    modelId: input.modelId,
  });
  const opt = resolved.option;
  const fallbackNotice = resolved.fallbackFrom
    ? `原选 ${resolved.fallbackFrom} 缺密钥（${(resolved.needKey || []).join(",")}），已改用 ${opt.label}。`
    : "";

  if (opt.provider === "minimax") {
    try {
      const cloned = await cloneVoiceMinimax({
        sampleBase64,
        sampleName: filename,
        preferredName,
        text: input.text,
        model: opt.vendorModel,
      });
      if (cloned.base64) {
        return {
          provider: "minimax-clone" as const,
          mime: cloned.mime,
          base64: cloned.base64,
          voiceId: cloned.voiceId,
          modelId: opt.id,
          cloneMode: "minimax-clone" as const,
          notice:
            fallbackNotice ||
            `已用 MiniMax（${opt.vendorModel}）登记克隆音色并完成试听。`,
        };
      }
      const result = await synthesizeSpeechMinimax({
        text: input.text,
        voice: cloned.voiceId,
        model: opt.vendorModel,
      });
      return {
        ...result,
        voiceId: cloned.voiceId,
        modelId: opt.id,
        cloneMode: "minimax-clone" as const,
        notice:
          fallbackNotice ||
          `已用 MiniMax（${opt.vendorModel}）登记克隆音色并完成试听。`,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (opt.provider === "fish") {
    try {
      const cloned = await cloneAndSpeakFish({
        text: input.text,
        sampleBase64,
        sampleName: filename,
        title: preferredName || "shop-voice",
        model: opt.vendorModel,
      });
      return {
        ...cloned,
        modelId: opt.id,
        cloneMode: "fish-clone" as const,
        notice:
          fallbackNotice ||
          `已用 Fish Audio（${opt.vendorModel}）登记克隆音色并完成试听。`,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (opt.provider === "elevenlabs") {
    try {
      const voiceId = await enrollVoiceElevenLabs({
        sampleBase64,
        mime,
        filename,
        preferredName,
      });
      if (voiceId) {
        const result = await synthesizeSpeech({
          text: input.text,
          voice: voiceId,
        });
        return {
          ...result,
          voiceId,
          modelId: opt.id,
          cloneMode: "elevenlabs-clone" as const,
          notice: fallbackNotice || "已用 ElevenLabs 登记克隆音色并完成试听。",
        };
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (opt.provider === "qwen-clone" || opt.provider === "qwen-tts") {
    try {
      if (opt.provider === "qwen-tts") {
        const result = await synthesizeSpeechDashScope(
          input.text,
          preferredName || opt.defaultVoice
        );
        return {
          ...result,
          modelId: opt.id,
          cloneMode: "preview-generic" as const,
          notice:
            fallbackNotice ||
            "当前档位为通用音色试听（非真克隆）。请选「高」档千问/MiniMax 克隆。",
        };
      }
      const enrolled = await enrollVoiceDashScope({
        sampleBase64,
        mime,
        preferredName,
      });
      const result = await synthesizeSpeechQwenTts(
        input.text,
        enrolled.voice,
        enrolled.targetModel
      );
      const notice = enrolled.fallbackMode
        ? `已登记克隆音色（降级模式${enrolled.fallbackReason ? `：${enrolled.fallbackReason}` : ""}）。`
        : "已用上传样本在千问登记克隆音色并完成试听。";
      return {
        ...result,
        voiceId: enrolled.voice,
        targetModel: enrolled.targetModel,
        modelId: opt.id,
        cloneMode: "dashscope-clone" as const,
        notice: fallbackNotice ? `${fallbackNotice} ${notice}` : notice,
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  // 选型通道失败时：MiniMax → Fish → 千问 兜底
  if (minimaxMediaEnabled()) {
    try {
      const cloned = await cloneVoiceMinimax({
        sampleBase64,
        sampleName: filename,
        preferredName,
        text: input.text,
        model: process.env.MINIMAX_TTS_MODEL || "speech-2.6-hd",
      });
      if (cloned.base64) {
        return {
          provider: "minimax-clone" as const,
          mime: cloned.mime,
          base64: cloned.base64,
          voiceId: cloned.voiceId,
          cloneMode: "minimax-clone" as const,
          notice: `选型通道失败后改用 MiniMax。${errors[0] || ""}`.trim(),
        };
      }
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (fishMediaEnabled()) {
    try {
      const cloned = await cloneAndSpeakFish({
        text: input.text,
        sampleBase64,
        sampleName: filename,
        title: preferredName || "shop-voice",
      });
      return {
        ...cloned,
        cloneMode: "fish-clone" as const,
        notice: `选型通道失败后改用 Fish Audio。${errors[0] || ""}`.trim(),
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  if (dashscopeMediaEnabled()) {
    try {
      const enrolled = await enrollVoiceDashScope({
        sampleBase64,
        mime,
        preferredName,
      });
      const result = await synthesizeSpeechQwenTts(
        input.text,
        enrolled.voice,
        enrolled.targetModel
      );
      return {
        ...result,
        voiceId: enrolled.voice,
        cloneMode: "dashscope-clone" as const,
        notice: `选型通道失败后改用千问克隆。${errors[0] || ""}`.trim(),
      };
    } catch (e) {
      errors.push(e instanceof Error ? e.message : String(e));
    }
  }

  throw new Error(
    errors[0] ||
      "无法克隆：请确认已配置 MINIMAX_API_KEY 或 QWEN_API_KEY"
  );
}
