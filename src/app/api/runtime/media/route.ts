import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import {
  generateImage,
  synthesizeSpeech,
  synthesizeVoiceClonePreview,
} from "@/lib/integrations/media";
import { buildMusicBrief, type MusicUseCase } from "@/lib/music-studio";
import {
  generateKlingVideo,
  klingMediaEnabled,
  runwayRatioToKling,
} from "@/lib/integrations/kling-media";
import { generateRunwayVideo, runwayMediaEnabled } from "@/lib/integrations/runway-media";
import {
  generateSunoMusic,
  sunoMediaEnabled,
} from "@/lib/integrations/suno-media";
import {
  generateImageMidjourney,
  midjourneyMediaEnabled,
} from "@/lib/integrations/midjourney-media";
import {
  generateImageReplicate,
  replicateMediaEnabled,
} from "@/lib/integrations/replicate-media";
import { completeWithQwen } from "@/lib/integrations/quick-llm";
import {
  estimateSegments,
  parseClipPicks,
  type TranscriptSegment,
} from "@/lib/subtitle-studio";
import { buildCapcutMateRequestPayload } from "@/lib/integrations/capcut-mate-adapter";
import {
  addCapcutCaptions,
  capcutMateEnabled,
  createCapcutDraft,
} from "@/lib/integrations/capcut-mate";
import {
  VOICE_LANES,
  VOICE_TIER_LABELS,
  isVoiceModelReady,
  voiceEnvStatus,
  type VoiceLaneId,
  type VoiceTierId,
} from "@/lib/voice-lane-catalog";

export const maxDuration = 300;

async function guard(productId: string) {
  const session = await getSession();
  if (!session) return { error: NextResponse.json({ error: "需要先登录" }, { status: 401 }) };
  if (!productId) {
    return { error: NextResponse.json({ error: "缺少 productId" }, { status: 400 }) };
  }
  const subscribed = await hasActiveSubscription(session.id, productId);
  if (!subscribed) {
    return {
      error: NextResponse.json({ error: "开通这项服务后才能使用" }, { status: 403 }),
    };
  }
  return { session };
}

function parseLane(raw: unknown): VoiceLaneId | undefined {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (n === 1 || n === 2 || n === 3 || n === 4 || n === 5) return n;
  return undefined;
}

function parseVoiceTier(raw: unknown): VoiceTierId | undefined {
  if (raw === "high" || raw === "mid" || raw === "low") return raw;
  return undefined;
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "";
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const auth = await guard(productId);
  if (auth.error) return auth.error;

  try {
    if (action === "voice-catalog") {
      const env = voiceEnvStatus();
      return NextResponse.json({
        ok: true,
        tierLabels: VOICE_TIER_LABELS,
        presentKeys: env.present,
        missingKeys: env.missing,
        lanes: VOICE_LANES.map((lane) => ({
          id: lane.id,
          title: lane.title,
          blurb: lane.blurb,
          tiers: {
            high: lane.tiers.high.map((m) => ({
              ...m,
              ready: isVoiceModelReady(m),
            })),
            mid: lane.tiers.mid.map((m) => ({
              ...m,
              ready: isVoiceModelReady(m),
            })),
            low: lane.tiers.low.map((m) => ({
              ...m,
              ready: isVoiceModelReady(m),
            })),
          },
        })),
      });
    }

    if (action === "image") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) {
        return NextResponse.json({ error: "需要 prompt" }, { status: 400 });
      }
      const aspect =
        typeof body.aspect === "string" ? body.aspect.trim() : undefined;
      const tier = typeof body.tier === "string" ? body.tier.trim() : undefined;
      const n = typeof body.n === "number" ? body.n : Number(body.n) || 1;
      const imageModel =
        typeof body.imageModel === "string" ? body.imageModel.trim() : undefined;
      const references = Array.isArray(body.references)
        ? (body.references as unknown[])
            .filter((item): item is string => typeof item === "string")
            .map((item) => item.trim())
            .filter(
              (item) =>
                item.startsWith("data:image/") ||
                item.startsWith("http://") ||
                item.startsWith("https://")
            )
            .slice(0, 5)
        : [];
      if (
        productId === "midjourney-api" ||
        imageModel === "midjourney" ||
        imageModel === "mj"
      ) {
        if (!midjourneyMediaEnabled()) {
          return NextResponse.json(
            {
              error:
                "未配置 Midjourney：请自建 midjourney-proxy（MIDJOURNEY_PROVIDER=proxy + MIDJOURNEY_PROXY_BASE）。详见 docs/suno-mj-selfhost.md",
            },
            { status: 503 }
          );
        }
        const mj = await generateImageMidjourney({ prompt });
        return NextResponse.json({ ok: true, ...mj });
      }

      if (
        productId === "replicate-api" ||
        imageModel === "flux-schnell" ||
        imageModel === "sdxl-replicate"
      ) {
        if (!replicateMediaEnabled()) {
          return NextResponse.json(
            { error: "未配置 Replicate：请填 REPLICATE_API_TOKEN" },
            { status: 503 }
          );
        }
        const model =
          imageModel === "sdxl-replicate"
            ? "stability-ai/sdxl"
            : imageModel === "flux-schnell"
              ? "black-forest-labs/flux-schnell"
              : undefined;
        const rep = await generateImageReplicate({ prompt, model });
        return NextResponse.json({ ok: true, ...rep });
      }

      const result = await generateImage({
        prompt,
        size: typeof body.size === "string" ? body.size : undefined,
        aspect: aspect as
          | "1:1"
          | "2:3"
          | "3:2"
          | "3:4"
          | "4:3"
          | "4:5"
          | "5:4"
          | "9:16"
          | "16:9"
          | undefined,
        tier: tier as "1k" | "2k" | "4k" | undefined,
        n,
        imageModel,
        references,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "tts") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        return NextResponse.json({ error: "需要 text" }, { status: 400 });
      }
      const result = await synthesizeSpeech({
        text,
        voice: typeof body.voice === "string" ? body.voice : undefined,
        lane: parseLane(body.lane),
        tier: parseVoiceTier(body.voiceTier),
        modelId: typeof body.modelId === "string" ? body.modelId : undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "voice-clone") {
      const text = typeof body.text === "string" ? body.text.trim() : "";
      if (!text) {
        return NextResponse.json({ error: "需要试听文案" }, { status: 400 });
      }
      const consent = Boolean(body.consent);
      const sampleBase64 =
        typeof body.sampleBase64 === "string" ? body.sampleBase64.trim() : "";
      const result = await synthesizeVoiceClonePreview({
        text,
        consent,
        sampleBase64,
        sampleMime:
          typeof body.sampleMime === "string" ? body.sampleMime : undefined,
        sampleName:
          typeof body.sampleName === "string" ? body.sampleName : undefined,
        voiceName: typeof body.voice === "string" ? body.voice : undefined,
        lane: parseLane(body.lane) || 2,
        tier: parseVoiceTier(body.voiceTier) || "high",
        modelId: typeof body.modelId === "string" ? body.modelId : undefined,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "music") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) {
        return NextResponse.json({ error: "需要配乐需求描述" }, { status: 400 });
      }
      const brief = buildMusicBrief({
        prompt,
        useCase: body.useCase as MusicUseCase | undefined,
        mood: typeof body.mood === "string" ? body.mood : undefined,
        durationSec:
          typeof body.durationSec === "number"
            ? body.durationSec
            : Number(body.durationSec) || undefined,
      });

      const wantLive =
        body.live === true ||
        body.live === "true" ||
        productId === "ai-music-bgm";

      if (wantLive && sunoMediaEnabled()) {
        const track = await generateSunoMusic({
          prompt: brief.sunoPrompt || prompt,
          title: brief.title,
          style: brief.mood,
          instrumental: true,
        });
        return NextResponse.json({
          ok: true,
          ...brief,
          ...track,
          nextStep: "可直接试听下载；也可复制英文提示词到自有 Suno 账号微调。",
        });
      }

      if (wantLive && !sunoMediaEnabled()) {
        return NextResponse.json({
          ok: true,
          ...brief,
          notice:
            "未接通 Suno：自建请设 SUNO_PROVIDER=selfhost + SUNO_BASE_URL；买网关请设 SUNO_API_KEY。详见 docs/suno-mj-selfhost.md",
        });
      }

      return NextResponse.json({ ok: true, ...brief });
    }

    if (action === "video") {
      const prompt = typeof body.prompt === "string" ? body.prompt.trim() : "";
      if (!prompt) {
        return NextResponse.json({ error: "需要视频描述" }, { status: 400 });
      }
      const promptImage =
        typeof body.promptImage === "string" ? body.promptImage.trim() : "";
      const productId =
        typeof body.productId === "string" ? body.productId.trim() : "";
      const prefer =
        typeof body.videoProvider === "string"
          ? body.videoProvider.trim().toLowerCase()
          : "";

      const wantKling =
        prefer === "kling" || productId === "kling-video";

      const durationSec =
        typeof body.durationSec === "number"
          ? body.durationSec
          : Number(body.durationSec) || undefined;
      const model =
        typeof body.model === "string" ? body.model.trim() : undefined;
      const ratio =
        body.ratio === "720:1280" ||
        body.ratio === "960:960" ||
        body.ratio === "1104:832" ||
        body.ratio === "832:1104" ||
        body.ratio === "1280:720"
          ? body.ratio
          : undefined;

      if (wantKling) {
        if (!klingMediaEnabled()) {
          return NextResponse.json(
            { error: "未配置 KLING_API_KEY，无法用可灵成片" },
            { status: 400 }
          );
        }
        const result = await generateKlingVideo({
          prompt,
          promptImage: promptImage || undefined,
          durationSec,
          aspectRatio: runwayRatioToKling(ratio),
          model,
        });
        return NextResponse.json({ ok: true, ...result });
      }

      if (!runwayMediaEnabled()) {
        return NextResponse.json(
          { error: "未配置 RUNWAY_API_KEY，无法在线成片" },
          { status: 400 }
        );
      }
      const result = await generateRunwayVideo({
        prompt,
        promptImage: promptImage || undefined,
        durationSec,
        ratio,
        model,
      });
      return NextResponse.json({ ok: true, ...result });
    }

    if (action === "subtitle-translate") {
      const lang = typeof body.lang === "string" ? body.lang.trim() : "zh";
      const segments = Array.isArray(body.segments)
        ? (body.segments as TranscriptSegment[])
        : [];
      if (segments.length === 0) {
        return NextResponse.json({ error: "没有可翻译的字幕" }, { status: 400 });
      }
      const langName =
        lang === "en"
          ? "English"
          : lang === "ja"
            ? "Japanese"
            : lang === "ko"
              ? "Korean"
              : "简体中文";
      const numbered = segments
        .map((seg, i) => `${i + 1}. ${String(seg.text || "").trim()}`)
        .join("\n");
      const translated = await completeWithQwen({
        productId,
        userId: auth.session?.id,
        system:
          "你是字幕翻译。只按编号输出译文，一行一条，不要时间码，不要解释。保留专有名词。口吻口语、适合配音。",
        user: `目标语言：${langName}\n\n${numbered}`,
      });
      const lines = translated
        .split("\n")
        .map((line) => line.replace(/^\d+[\.\)、]\s*/, "").trim())
        .filter(Boolean);
      const next = segments.map((seg, i) => ({
        ...seg,
        text: lines[i] || seg.text,
      }));
      return NextResponse.json({ ok: true, segments: next, lang });
    }

    if (action === "clip-select") {
      const purpose =
        typeof body.purpose === "string" ? body.purpose.trim() : "短视频切片";
      const transcript =
        typeof body.transcript === "string" ? body.transcript.trim() : "";
      let segments = Array.isArray(body.segments)
        ? (body.segments as TranscriptSegment[])
        : [];
      if (segments.length === 0 && transcript) {
        segments = estimateSegments(transcript);
      }
      if (segments.length === 0) {
        return NextResponse.json({ error: "先转写或粘贴逐字稿" }, { status: 400 });
      }
      const timeline = segments
        .map(
          (seg) =>
            `${Number(seg.start).toFixed(1)}-${Number(seg.end).toFixed(1)} ${String(seg.text || "").trim()}`
        )
        .join("\n");
      const raw = await completeWithQwen({
        productId,
        userId: auth.session?.id,
        system:
          '你是短视频选片助理。根据时间轴挑 3～6 个高潮/金句片段。只输出 JSON 数组，每项 {"start":秒,"end":秒,"reason":"为何能发","quote":"原句"}。start/end 必须来自时间轴，不要编造。',
        user: `成片用途：${purpose}\n\n时间轴：\n${timeline.slice(0, 8000)}`,
      });
      const clips = parseClipPicks(raw, segments);
      return NextResponse.json({ ok: true, clips, purpose });
    }

    if (action === "auto-edit-plan") {
      const purpose =
        typeof body.purpose === "string" ? body.purpose.trim() : "短视频分发";
      const platform =
        typeof body.platform === "string" ? body.platform.trim() : "抖音";
      const durationSec =
        typeof body.durationSec === "number"
          ? body.durationSec
          : Number(body.durationSec) || 30;
      const transcript =
        typeof body.transcript === "string" ? body.transcript.trim() : "";
      const clips = Array.isArray(body.clips)
        ? (body.clips as { start?: number; end?: number; reason?: string; quote?: string }[])
        : [];
      if (!transcript && clips.length === 0) {
        return NextResponse.json({ error: "先上传音视频完成转写" }, { status: 400 });
      }
      const clipSummary =
        clips.length > 0
          ? clips
              .map(
                (clip, i) =>
                  `${i + 1}. ${Number(clip.start || 0).toFixed(1)}-${Number(clip.end || 0).toFixed(1)} ${clip.reason || ""} ${clip.quote || ""}`.trim()
              )
              .join("\n")
          : "暂无选片结果";
      const planRaw = await completeWithQwen({
        productId,
        userId: auth.session?.id,
        system:
          "你是短视频自动剪辑编导。请只输出 JSON：{title,hook,timeline:[{section,durationSec,content,materials}],captionStyle,coverText,publishChecklist:[...]}，不加解释。",
        user: `平台：${platform}\n用途：${purpose}\n目标时长：${durationSec} 秒\n\n可用片段：\n${clipSummary}\n\n转写稿：\n${transcript.slice(0, 12000)}`,
      });
      const clean = planRaw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      const jsonText = start >= 0 && end > start ? clean.slice(start, end + 1) : clean;
      let plan: Record<string, unknown> | null = null;
      try {
        plan = JSON.parse(jsonText) as Record<string, unknown>;
      } catch {
        plan = null;
      }
      return NextResponse.json({
        ok: true,
        plan,
        raw: planRaw,
        purpose,
        platform,
        durationSec,
      });
    }

    if (action === "capcut-mate-build-request") {
      const width =
        typeof body.width === "number"
          ? body.width
          : Number(body.width) || 1080;
      const height =
        typeof body.height === "number"
          ? body.height
          : Number(body.height) || 1920;
      const segments = Array.isArray(body.segments)
        ? (body.segments as TranscriptSegment[])
        : [];
      const clips = Array.isArray(body.clips)
        ? body.clips
        : [];

      const payload = buildCapcutMateRequestPayload({
        width,
        height,
        segments,
        clips: clips as any,
        autoEditPlan:
          typeof body.autoEditPlan !== "undefined" ? body.autoEditPlan : undefined,
      });

      return NextResponse.json({ ok: true, payload, width, height });
    }

    if (action === "capcut-mate-create-draft") {
      if (!capcutMateEnabled()) {
        return NextResponse.json(
          {
            error:
              "未配置 CAPCUT_MATE_BASE_URL。先部署 capcut-mate，再在 .env 里配置如 http://127.0.0.1:30000/openapi/capcut-mate/v1",
          },
          { status: 400 }
        );
      }

      const width =
        typeof body.width === "number"
          ? body.width
          : Number(body.width) || 1080;
      const height =
        typeof body.height === "number"
          ? body.height
          : Number(body.height) || 1920;
      const segments = Array.isArray(body.segments)
        ? (body.segments as TranscriptSegment[])
        : [];
      if (segments.length === 0) {
        return NextResponse.json({ error: "先生成字幕 segments" }, { status: 400 });
      }

      const draft = await createCapcutDraft({ width, height });
      await addCapcutCaptions({ draftUrl: draft.draftUrl, segments });
      return NextResponse.json({
        ok: true,
        draftUrl: draft.draftUrl,
        tipUrl: draft.tipUrl,
        notice: "已创建剪映草稿并写入字幕。下一步可在 capcut-mate 侧继续 add_videos / gen_video。",
      });
    }

    return NextResponse.json(
      {
        error:
          "action 应为 image | tts | voice-clone | music | video | voice-catalog | subtitle-translate | clip-select | auto-edit-plan | capcut-mate-build-request | capcut-mate-create-draft；转写请用 multipart /api/runtime/media/transcribe",
      },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "媒体能力暂不可用" },
      { status: 400 }
    );
  }
}
