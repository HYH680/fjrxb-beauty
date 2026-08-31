"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  Copy,
  Download,
  Film,
  ImageIcon,
  Mic,
  Music2,
  Scissors,
  Captions,
  Trash2,
  Volume2,
  X,
} from "lucide-react";
import {
  ASPECT_RATIOS,
  RES_TIERS,
  buildStudioPrompt,
  scenesForMode,
  studioModeFor,
  wanxSize,
  type AspectRatioId,
  type ResTierId,
  type ScenePreset,
} from "@/lib/image-studio";
import { IMAGE_MODELS, getImageModel, imageModelsForProduct } from "@/lib/image-models";
import {
  MUSIC_MOODS,
  MUSIC_USE_CASES,
  type MusicUseCase,
} from "@/lib/music-studio";
import {
  SUBTITLE_LANGS,
  clipsToText,
  formatClock,
  toSrt,
  toVtt,
  type ClipPick,
  type SubtitleLangId,
  type TranscriptSegment,
} from "@/lib/subtitle-studio";
import {
  VOICE_LANES,
  VOICE_TIER_LABELS,
  type VoiceLaneId,
  type VoiceTierId,
} from "@/lib/voice-lane-catalog";

export type MediaCapability =
  | "image"
  | "transcribe"
  | "tts"
  | "voice-clone"
  | "music"
  | "video"
  | "subtitle"
  | "clips";

type VoiceModelReady = {
  id: string;
  label: string;
  blurb: string;
  supportsClone: boolean;
  envKeys: string[];
  ready: boolean;
};

/** 仅「工作台真能出图」的 SKU；方案陪跑（SD/剪辑方案）不要挂媒体入口 */
const IMAGE_PRODUCTS = new Set([
  "dall-e-3",
  "jimeng-image",
  "stable-diffusion-xl",
  "midjourney-api",
  "replicate-api",
  "retail-marketing",
  "ai-image-make",
  "copy-to-image",
  "ecommerce-image",
  "product-replica",
  "prompt-reverse",
]);

/** 仅支持音频直传转写的 SKU；纯文案陪跑不要挂转写入口 */
const TRANSCRIBE_PRODUCTS = new Set([
  "whisper-api",
  "meeting-minutes",
]);
const SUBTITLE_PRODUCTS = new Set(["ai-subtitle"]);
const CLIP_PRODUCTS = new Set(["smart-clip-select", "capcut-auto"]);

const TTS_PRODUCTS = new Set(["elevenlabs-tts", "digital-human"]);
const VOICE_CLONE_PRODUCTS = new Set(["voice-clone"]);
const MUSIC_PRODUCTS = new Set(["ai-music-bgm"]);
const VIDEO_PRODUCTS = new Set([
  "runway-gen3",
  "ai-video-gen",
  "kling-video",
  "digital-human",
]);
const MAX_REFS = 5;
const HISTORY_LIMIT = 24;

type RefImage = { id: string; name: string; dataUrl: string };
type HistoryItem = {
  id: string;
  prompt: string;
  preview: string;
  aspect: AspectRatioId;
  tier: ResTierId;
  model: string;
  sceneLabel?: string;
  createdAt: number;
};

type ManagedClip = ClipPick & { id: string; enabled: boolean };

type AutoEditPlan = {
  title: string;
  hook: string;
  captionStyle: string;
  coverText: string;
  timeline: { section: string; durationSec: number; content: string; materials: string }[];
  publishChecklist: string[];
};

export function mediaCapabilitiesFor(productId: string): MediaCapability[] {
  const list: MediaCapability[] = [];
  if (IMAGE_PRODUCTS.has(productId) || studioModeFor(productId)) {
    list.push("image");
  }
  if (TRANSCRIBE_PRODUCTS.has(productId)) list.push("transcribe");
  if (SUBTITLE_PRODUCTS.has(productId)) list.push("subtitle");
  if (CLIP_PRODUCTS.has(productId)) list.push("clips");
  if (TTS_PRODUCTS.has(productId)) list.push("tts");
  if (VOICE_CLONE_PRODUCTS.has(productId)) list.push("voice-clone");
  if (MUSIC_PRODUCTS.has(productId)) list.push("music");
  if (VIDEO_PRODUCTS.has(productId)) list.push("video");
  return list;
}

function historyKey(productId: string) {
  return `ai-supermarket:image-history:${productId}`;
}

function modelKey(productId: string) {
  return `ai-supermarket:image-model:${productId}`;
}

function loadHistory(productId: string): HistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(historyKey(productId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as HistoryItem[];
    return Array.isArray(parsed) ? parsed.slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
}

function saveHistory(productId: string, items: HistoryItem[]) {
  try {
    window.localStorage.setItem(
      historyKey(productId),
      JSON.stringify(items.slice(0, HISTORY_LIMIT))
    );
  } catch {
    /* quota */
  }
}

async function compressToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxSide = 1280;
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("无法压缩图片");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function imageToBlob(src: string): Promise<Blob> {
  if (src.startsWith("data:")) {
    const res = await fetch(src);
    return res.blob();
  }
  try {
    const direct = await fetch(src, { mode: "cors" });
    if (direct.ok) return direct.blob();
  } catch {
    /* 外链常被 CORS 拦住，走本站代理 */
  }
  const proxied = await fetch(
    `/api/runtime/media/fetch?url=${encodeURIComponent(src)}`
  );
  if (!proxied.ok) {
    const data = await proxied.json().catch(() => ({}));
    throw new Error(
      typeof data.error === "string" ? data.error : "无法读取生成图"
    );
  }
  return proxied.blob();
}

function downloadText(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function mediaDuration(file: File): Promise<number | undefined> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const el = document.createElement(
      file.type.startsWith("video/") ? "video" : "audio"
    );
    el.preload = "metadata";
    el.onloadedmetadata = () => {
      const duration = el.duration;
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(duration) && duration > 0 ? duration : undefined);
    };
    el.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(undefined);
    };
    el.src = url;
  });
}

function extForBlob(blob: Blob) {
  const type = blob.type || "image/png";
  if (type.includes("jpeg") || type.includes("jpg")) return "jpg";
  if (type.includes("webp")) return "webp";
  if (type.includes("gif")) return "gif";
  return "png";
}

function Chip({
  active,
  onClick,
  children,
  title,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`rounded-md px-2.5 py-1 text-[11px] transition-colors ${
        active
          ? "bg-[#3b82f6] text-white"
          : "border border-white/10 text-zinc-400 hover:border-white/20 hover:text-zinc-200"
      }`}
    >
      {children}
    </button>
  );
}

export function WorkspaceMediaTools({
  productId,
  onNotice,
  onTranscript,
}: {
  productId: string;
  onNotice?: (text: string) => void;
  onTranscript?: (text: string) => void;
}) {
  const caps = mediaCapabilitiesFor(productId);
  const mode = studioModeFor(productId) || "general";
  const scenes = useMemo(() => scenesForMode(mode), [mode]);
  const audioRef = useRef<HTMLInputElement>(null);
  const subtitleRef = useRef<HTMLInputElement>(null);
  const clipRef = useRef<HTMLInputElement>(null);
  const cloneSampleRef = useRef<HTMLInputElement>(null);
  const refInputRef = useRef<HTMLInputElement>(null);
  const [prompt, setPrompt] = useState("");
  const [ttsText, setTtsText] = useState("");
  const [cloneText, setCloneText] = useState("");
  const [cloneConsent, setCloneConsent] = useState(false);
  const [cloneSampleName, setCloneSampleName] = useState("");
  const [cloneSampleFile, setCloneSampleFile] = useState<File | null>(null);
  const [voiceLane, setVoiceLane] = useState<VoiceLaneId | null>(null);
  const [voiceTier, setVoiceTier] = useState<VoiceTierId | null>(null);
  const [voiceModelId, setVoiceModelId] = useState<string | null>(null);
  const [voiceMissingKeys, setVoiceMissingKeys] = useState<string[]>([]);
  const [voiceReadyMap, setVoiceReadyMap] = useState<Record<string, boolean>>(
    {}
  );
  const [musicPrompt, setMusicPrompt] = useState("");
  const [musicUseCase, setMusicUseCase] = useState<MusicUseCase>("bgm");
  const [musicMood, setMusicMood] = useState(MUSIC_MOODS[0]);
  const [musicDuration, setMusicDuration] = useState(15);
  const [musicBrief, setMusicBrief] = useState<{
    title: string;
    zhPrompt: string;
    sunoPrompt: string;
    structure: string[];
    nextStep: string;
    audioUrl?: string;
    tracks?: { audioUrl: string; title: string; imageUrl?: string }[];
  } | null>(null);
  const [videoPrompt, setVideoPrompt] = useState("");
  const [videoDuration, setVideoDuration] = useState(5);
  const [videoRatio, setVideoRatio] = useState<"1280:720" | "720:1280" | "960:960">(
    "1280:720"
  );
  const [videoImage, setVideoImage] = useState<string | null>(null);
  const [videoImageName, setVideoImageName] = useState("");
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const videoImageRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<MediaCapability | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [cloneAudioUrl, setCloneAudioUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState<"download" | "copy" | null>(null);
  const [aspect, setAspect] = useState<AspectRatioId>("1:1");
  const [tier, setTier] = useState<ResTierId>("1k");
  const [count, setCount] = useState(1);
  const [sceneId, setSceneId] = useState<string | null>(null);
  const [imageModelId, setImageModelId] = useState(IMAGE_MODELS[0].id);
  const [refs, setRefs] = useState<RefImage[]>([]);
  const [dragging, setDragging] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [subtitleLang, setSubtitleLang] = useState<SubtitleLangId>("source");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [clipPurpose, setClipPurpose] = useState("短视频切片");
  const [clips, setClips] = useState<ManagedClip[]>([]);
  const [clipTranscript, setClipTranscript] = useState("");
  const [targetPlatform, setTargetPlatform] = useState("抖音");
  const [autoEditPlan, setAutoEditPlan] = useState<AutoEditPlan | null>(null);
  const [capcutDraftUrl, setCapcutDraftUrl] = useState<string | null>(null);
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [editAspect, setEditAspect] = useState<"9:16" | "16:9" | "1:1">("9:16");
  const [durationCap, setDurationCap] = useState(30);
  const [burnCaptions, setBurnCaptions] = useState(true);
  const [captionSize, setCaptionSize] = useState<"large" | "normal">("large");
  const [outputUrl, setOutputUrl] = useState<string | null>(null);
  const isAutoEdit = productId === "capcut-auto";

  const scene: ScenePreset | null =
    scenes.find((item) => item.id === sceneId) || null;
  const studioModels = imageModelsForProduct(productId);
  const imageModel = getImageModel(imageModelId, productId);
  const sizeLabel = wanxSize(aspect, tier);

  useEffect(() => {
    setHistory(loadHistory(productId));
    try {
      const saved = window.localStorage.getItem(modelKey(productId));
      if (saved && studioModels.some((m) => m.id === saved)) {
        setImageModelId(saved);
        return;
      }
    } catch {
      /* ignore */
    }
    setImageModelId(
      productId === "jimeng-image"
        ? "jimeng-t2i"
        : productId === "stable-diffusion-xl"
          ? "wanx-v1-hq"
          : productId === "midjourney-api"
            ? "midjourney"
            : productId === "replicate-api"
              ? "flux-schnell"
              : studioModels[0]?.id || IMAGE_MODELS[0].id
    );
  }, [productId]);

  useEffect(() => {
    if (!caps.includes("voice-clone") && !caps.includes("tts")) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/runtime/media", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "voice-catalog", productId }),
        });
        const data = await res.json();
        if (!res.ok || cancelled) return;
        const map: Record<string, boolean> = {};
        for (const lane of data.lanes || []) {
          for (const t of ["high", "mid", "low"] as const) {
            for (const m of (lane.tiers?.[t] || []) as VoiceModelReady[]) {
              map[m.id] = Boolean(m.ready);
            }
          }
        }
        setVoiceReadyMap(map);
        setVoiceMissingKeys(
          Array.isArray(data.missingKeys) ? data.missingKeys : []
        );
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [productId]);

  const voiceModelsForPick = useMemo(() => {
    if (!voiceLane || !voiceTier) return [];
    const lane = VOICE_LANES.find((l) => l.id === voiceLane);
    return lane?.tiers[voiceTier] || [];
  }, [voiceLane, voiceTier]);

  if (!caps.length) return null;

  function pickScene(next: ScenePreset) {
    setSceneId((prev) => (prev === next.id ? null : next.id));
    if (next.preferredAspect) setAspect(next.preferredAspect);
  }

  function persistHistory(items: HistoryItem[]) {
    setHistory(items);
    saveHistory(productId, items);
  }

  function pushHistory(item: HistoryItem) {
    persistHistory([item, ...history.filter((row) => row.id !== item.id)]);
  }

  async function addRefFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!list.length) {
      onNotice?.("请选择 JPG / PNG / WebP 图片。");
      return;
    }
    const room = MAX_REFS - refs.length;
    if (room <= 0) {
      onNotice?.(`参考图最多 ${MAX_REFS} 张。`);
      return;
    }
    const next: RefImage[] = [];
    for (const file of list.slice(0, room)) {
      try {
        const dataUrl = await compressToDataUrl(file);
        next.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          name: file.name.slice(0, 80),
          dataUrl,
        });
      } catch {
        onNotice?.(`压缩失败：${file.name}`);
      }
    }
    if (next.length) setRefs((prev) => [...prev, ...next].slice(0, MAX_REFS));
  }

  async function runImage() {
    const value = prompt.trim();
    if (!value) {
      onNotice?.(
        mode === "video"
          ? "先写镜头/画面描述，再生成关键帧或分镜参考图。"
          : "先写一句出图描述。"
      );
      return;
    }
    if (refs.length && !imageModel.supportsRef) {
      onNotice?.(
        `${imageModel.label} 暂不支持参考图，请改选万相，或先清空参考图。`
      );
      return;
    }
    setBusy("image");
    setPreviewUrl(null);
    const finalPrompt = buildStudioPrompt({
      userPrompt: value,
      scene,
      aspect,
      tier,
      mode,
    });
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "image",
          productId,
          prompt: finalPrompt,
          aspect,
          tier,
          n: count,
          imageModel: imageModelId,
          references: refs.map((item) => item.dataUrl),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "出图失败");
        return;
      }
      const preview = data.b64
        ? `data:image/png;base64,${data.b64}`
        : data.url
          ? String(data.url)
          : "";
      if (preview) {
        setPreviewUrl(preview);
        pushHistory({
          id: `${Date.now()}`,
          prompt: value,
          preview,
          aspect,
          tier,
          model: imageModel.label,
          sceneLabel: scene?.label,
          createdAt: Date.now(),
        });
      }
      const sizeNote = data.size ? ` · ${data.size}` : ` · ${sizeLabel}`;
      const refNote = data.usedRef ? " · 已参考上传图" : "";
      onNotice?.(
        typeof data.notice === "string"
          ? data.notice
          : data.provider
            ? `出图完成（${data.provider}${sizeNote}${refNote}）。${
                mode === "video"
                  ? "成片请再到 Sora/Veo/剪映完成。"
                  : "正式物料请再人工审核。"
              }`
            : "出图完成。"
      );
    } catch {
      onNotice?.("出图请求失败，请稍后重试。");
    } finally {
      setBusy(null);
    }
  }

  async function downloadPreview(src = previewUrl) {
    if (!src) return;
    setSaving("download");
    try {
      const blob = await imageToBlob(src);
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = `ai-image-${Date.now()}.${extForBlob(blob)}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(objectUrl);
      onNotice?.("已开始下载。");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "下载失败");
    } finally {
      setSaving(null);
    }
  }

  async function copyPreview(src = previewUrl) {
    if (!src) return;
    setSaving("copy");
    try {
      const blob = await imageToBlob(src);
      const pngBlob =
        blob.type === "image/png"
          ? blob
          : await (async () => {
              const bitmap = await createImageBitmap(blob);
              const canvas = document.createElement("canvas");
              canvas.width = bitmap.width;
              canvas.height = bitmap.height;
              const ctx = canvas.getContext("2d");
              if (!ctx) throw new Error("无法转换图片格式");
              ctx.drawImage(bitmap, 0, 0);
              bitmap.close();
              return await new Promise<Blob>((resolve, reject) => {
                canvas.toBlob(
                  (item) =>
                    item ? resolve(item) : reject(new Error("转换失败")),
                  "image/png"
                );
              });
            })();

      if (!navigator.clipboard || typeof ClipboardItem === "undefined") {
        throw new Error("当前浏览器不支持复制图片，请改用下载");
      }
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": pngBlob }),
      ]);
      onNotice?.("已复制到剪贴板，可直接粘贴到微信/文档。");
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "复制失败");
    } finally {
      setSaving(null);
    }
  }

  async function postTranscribe(file: File) {
    const durationSec = await mediaDuration(file);
    const form = new FormData();
    form.append("productId", productId);
    form.append("file", file);
    if (durationSec) form.append("durationSec", String(durationSec));
    const res = await fetch("/api/runtime/media/transcribe", {
      method: "POST",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "转写失败");
    }
    const text = String(data.text || "").trim();
    if (!text) throw new Error("没有识别到有效文字。");
    const nextSegments = Array.isArray(data.segments)
      ? (data.segments as TranscriptSegment[])
      : [];
    return {
      text,
      provider: String(data.provider || ""),
      segments: nextSegments,
    };
  }

  async function runTranscribe(file: File) {
    setBusy("transcribe");
    try {
      const result = await postTranscribe(file);
      onTranscript?.(result.text);
      onNotice?.(
        result.provider
          ? `转写完成（${result.provider}），文字已填入左侧输入框，可再发给客服整理。`
          : "转写完成，文字已填入左侧。"
      );
    } catch (error) {
      onNotice?.(
        error instanceof Error
          ? error.message
          : "转写请求失败：请启动 docker whisper（WHISPER_URL）或配置 OPENAI_API_KEY。"
      );
    } finally {
      setBusy(null);
    }
  }

  async function runSubtitle(file: File) {
    setBusy("subtitle");
    try {
      const result = await postTranscribe(file);
      setSegments(result.segments);
      onTranscript?.(result.text);
      if (subtitleLang !== "source") {
        await translateSegments(result.segments, subtitleLang);
      } else {
        onNotice?.(`字幕已生成（${result.provider || "转写"}），可下载 SRT / VTT。`);
      }
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "字幕生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function translateSegments(
    source: TranscriptSegment[],
    lang: SubtitleLangId
  ) {
    if (lang === "source" || source.length === 0) return;
    const res = await fetch("/api/runtime/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "subtitle-translate",
        productId,
        lang,
        segments: source,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotice?.(data.error || "翻译失败，已保留原文字幕");
      return;
    }
    if (Array.isArray(data.segments)) {
      setSegments(data.segments as TranscriptSegment[]);
    }
    onNotice?.("字幕已翻译，可下载 SRT / VTT。");
  }

  async function runClips(file: File) {
    setBusy("clips");
    setSourceFile(file);
    setOutputUrl(null);
    try {
      const result = await postTranscribe(file);
      setSegments(result.segments);
      setClipTranscript(result.text);
      onTranscript?.(result.text);
      await pickClips(result.text, result.segments);
    } catch (error) {
      onNotice?.(error instanceof Error ? error.message : "选片失败");
    } finally {
      setBusy(null);
    }
  }

  async function pickClips(transcript: string, source: TranscriptSegment[]) {
    const res = await fetch("/api/runtime/media", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "clip-select",
        productId,
        purpose: clipPurpose,
        transcript,
        segments: source,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      onNotice?.(data.error || "选片失败");
      return;
    }
    const next = Array.isArray(data.clips) ? (data.clips as ClipPick[]) : [];
    setClips(
      next.map((clip, i) => ({
        ...clip,
        id: `c${i}-${clip.start}-${clip.end}`,
        enabled: true,
      }))
    );
    onNotice?.(next.length ? `已标出 ${next.length} 个可剪片段。` : "没有标出可用片段。");
  }

  async function runAutoEditPlan() {
    if (!clipTranscript.trim()) {
      onNotice?.("先上传音视频完成转写。");
      return;
    }
    setBusy("clips");
    setAutoEditPlan(null);
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "auto-edit-plan",
          productId,
          platform: targetPlatform,
          purpose: clipPurpose,
          durationSec: isAutoEdit ? durationCap : 30,
          transcript: clipTranscript,
          clips,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "生成剪辑方案失败");
        return;
      }
      const plan = (data.plan || null) as AutoEditPlan | null;
      if (!plan) {
        onNotice?.("已生成草稿，但结构化解析失败，请重试。");
        return;
      }
      setAutoEditPlan(plan);
      onNotice?.("自动剪辑协同包已生成，可下载分镜和时间码。");
    } catch {
      onNotice?.("生成剪辑方案失败，请稍后重试。");
    } finally {
      setBusy(null);
    }
  }

  const activeClips = clips.filter((clip) => clip.enabled);

  function patchClip(id: string, patch: Partial<ManagedClip>) {
    setClips((prev) =>
      prev.map((clip) => (clip.id === id ? { ...clip, ...patch } : clip))
    );
  }

  function moveClip(index: number, dir: -1 | 1) {
    setClips((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      const tmp = next[index]!;
      next[index] = next[j]!;
      next[j] = tmp;
      return next;
    });
  }

  async function runInSiteRender() {
    if (!sourceFile) {
      onNotice?.("请先上传音视频素材。");
      return;
    }
    if (activeClips.length === 0) {
      onNotice?.("至少打开一个镜头。");
      return;
    }
    setBusy("clips");
    if (outputUrl) URL.revokeObjectURL(outputUrl);
    setOutputUrl(null);
    try {
      const form = new FormData();
      form.append("productId", productId);
      form.append("file", sourceFile);
      form.append("clips", JSON.stringify(activeClips));
      form.append("segments", JSON.stringify(segments));
      form.append("aspect", editAspect);
      form.append("durationCap", String(durationCap));
      form.append("burnCaptions", burnCaptions ? "1" : "0");
      form.append("captionSize", captionSize);
      const res = await fetch("/api/runtime/media/render", {
        method: "POST",
        body: form,
      });
      const type = res.headers.get("content-type") || "";
      if (!res.ok || !type.includes("video/")) {
        const data = await res.json().catch(() => ({}));
        onNotice?.(
          (data as { error?: string }).error || "站内出片失败"
        );
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setOutputUrl(url);
      onNotice?.("站内成片完成，可预览或下载 MP4。");
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "站内出片失败");
    } finally {
      setBusy(null);
    }
  }

  function exportCollabPack() {
    const timecodes = clipsToText(clips);
    const timeline =
      autoEditPlan?.timeline
        ?.map(
          (row, i) =>
            `${i + 1}. ${row.section} (${row.durationSec}s)\n内容：${row.content}\n素材：${row.materials}`
        )
        .join("\n\n") || "暂无分镜";
    const checklist = (autoEditPlan?.publishChecklist || [])
      .map((item, i) => `${i + 1}. ${item}`)
      .join("\n");
    const brief = [
      `标题：${autoEditPlan?.title || "自动剪辑草稿"}`,
      `开场钩子：${autoEditPlan?.hook || "-"}`,
      `平台：${targetPlatform}`,
      `用途：${clipPurpose}`,
      `封面文案：${autoEditPlan?.coverText || "-"}`,
      `字幕风格：${autoEditPlan?.captionStyle || "-"}`,
      "",
      "## 分镜",
      timeline,
      "",
      "## 发布前检查",
      checklist || "1. 人工复核敏感词",
    ].join("\n");
    downloadText("剪映协同-分镜脚本.md", brief, "text/markdown;charset=utf-8");
    if (clips.length > 0) {
      downloadText("剪映协同-时间码.txt", timecodes, "text/plain;charset=utf-8");
    }
    if (segments.length > 0) {
      downloadText("剪映协同-字幕.srt", toSrt(segments), "application/x-subrip");
    }
    onNotice?.("协同包已下载（分镜/时间码/字幕）。");
  }

  async function exportCapcutMateRequestPayload() {
    if (segments.length === 0) {
      onNotice?.("先生成字幕 segments（至少要转写一次）。");
      return;
    }
    setBusy("clips");
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capcut-mate-build-request",
          productId,
          width: 1080,
          height: 1920,
          segments,
          clips,
          autoEditPlan,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "生成剪映草稿请求体失败");
        return;
      }
      const json = JSON.stringify(data.payload, null, 2);
      downloadText(
        "capcut-mate-request-poc.json",
        json,
        "application/json;charset=utf-8"
      );
      onNotice?.("PoC 请求体已下载：capcut-mate-request-poc.json");
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "生成失败");
    } finally {
      setBusy(null);
    }
  }

  async function runCapcutMateCreateDraft() {
    if (segments.length === 0) {
      onNotice?.("先生成字幕 segments（至少要转写一次）。");
      return;
    }
    setBusy("clips");
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "capcut-mate-create-draft",
          productId,
          width: 1080,
          height: 1920,
          segments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "创建剪映草稿失败");
        return;
      }
      const url = typeof data.draftUrl === "string" ? data.draftUrl : "";
      if (url) {
        setCapcutDraftUrl(url);
        await navigator.clipboard.writeText(url).catch(() => {});
      }
      onNotice?.(data.notice || "已创建剪映草稿，URL 已复制。");
    } catch (e) {
      onNotice?.(e instanceof Error ? e.message : "创建失败");
    } finally {
      setBusy(null);
    }
  }

  async function runTts() {
    const value = ttsText.trim();
    if (!value) {
      onNotice?.("先贴一段要合成的文案。");
      return;
    }
    setBusy("tts");
    setAudioUrl(null);
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "tts",
          productId,
          text: value,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "配音失败");
        return;
      }
      if (data.base64) {
        setAudioUrl(`data:${data.mime || "audio/mpeg"};base64,${data.base64}`);
      }
      onNotice?.(
        data.provider ? `配音完成（${data.provider}）。` : "配音完成。"
      );
    } catch {
      onNotice?.(
        "配音请求失败：已有千问密钥会走 CosyVoice；也可配 ElevenLabs / OpenAI。"
      );
    } finally {
      setBusy(null);
    }
  }

  async function runVoiceClone() {
    const value = cloneText.trim();
    if (!value) {
      onNotice?.("先写一句要试听的口播稿。");
      return;
    }
    if (!voiceLane) {
      onNotice?.("请先选择场景（1–5）。");
      return;
    }
    if (!voiceTier) {
      onNotice?.("请再选择档位（高 / 中 / 低）。");
      return;
    }
    if (!voiceModelId) {
      onNotice?.("请再选择具体模型。");
      return;
    }
    if (!cloneConsent) {
      onNotice?.("请先勾选授权声明。");
      return;
    }
    if (!cloneSampleFile) {
      onNotice?.("请先上传人声样本。");
      return;
    }
    if (cloneSampleFile.size > 10 * 1024 * 1024) {
      onNotice?.("样本请控制在 10MB 以内（建议 10–20 秒清晰口播）。");
      return;
    }
    setBusy("voice-clone");
    setCloneAudioUrl(null);
    try {
      const buf = await cloneSampleFile.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      const chunk = 0x8000;
      for (let i = 0; i < bytes.length; i += chunk) {
        binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
      }
      const sampleBase64 = btoa(binary);
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "voice-clone",
          productId,
          text: value,
          consent: true,
          sampleBase64,
          sampleMime: cloneSampleFile.type || "audio/mpeg",
          sampleName: cloneSampleFile.name.slice(0, 80),
          lane: voiceLane,
          voiceTier,
          modelId: voiceModelId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "克隆试听失败");
        return;
      }
      if (data.base64) {
        setCloneAudioUrl(
          `data:${data.mime || "audio/mpeg"};base64,${data.base64}`
        );
      }
      onNotice?.(
        typeof data.notice === "string"
          ? data.notice
          : data.provider
            ? `试听完成（${data.provider}）。`
            : "试听完成。"
      );
    } catch {
      onNotice?.("克隆试听请求失败，请稍后重试。");
    } finally {
      setBusy(null);
    }
  }

  async function runMusic() {
    const value = musicPrompt.trim();
    if (!value) {
      onNotice?.("先写配乐用途、情绪或参考说明。");
      return;
    }
    setBusy("music");
    setMusicBrief(null);
    onNotice?.("Suno 成曲中，通常需要 1–3 分钟，请稍候…");
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "music",
          productId,
          prompt: value,
          useCase: musicUseCase,
          mood: musicMood,
          durationSec: musicDuration,
          live: true,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        // 无密钥时仍展示方案，方便复制提示词
        if (data.sunoPrompt) {
          setMusicBrief({
            title: String(data.title || "配乐方案"),
            zhPrompt: String(data.zhPrompt || ""),
            sunoPrompt: String(data.sunoPrompt || ""),
            structure: Array.isArray(data.structure)
              ? data.structure.map(String)
              : [],
            nextStep: String(
              data.nextStep ||
                "配置 SUNO_API_KEY 后可直接成曲；也可先复制提示词到 Suno。"
            ),
          });
        }
        onNotice?.(data.error || "配乐生成失败");
        return;
      }
      const tracks = Array.isArray(data.tracks)
        ? data.tracks
            .map((t: { audioUrl?: string; title?: string; imageUrl?: string }) => ({
              audioUrl: String(t.audioUrl || ""),
              title: String(t.title || ""),
              imageUrl: t.imageUrl ? String(t.imageUrl) : undefined,
            }))
            .filter((t: { audioUrl: string }) => t.audioUrl)
        : [];
      setMusicBrief({
        title: String(data.title || "配乐方案"),
        zhPrompt: String(data.zhPrompt || ""),
        sunoPrompt: String(data.sunoPrompt || ""),
        structure: Array.isArray(data.structure)
          ? data.structure.map(String)
          : [],
        nextStep: String(data.nextStep || ""),
        audioUrl: typeof data.audioUrl === "string" ? data.audioUrl : undefined,
        tracks,
      });
      onNotice?.(
        typeof data.notice === "string"
          ? data.notice
          : data.audioUrl
            ? "成曲完成，可试听。"
            : "配乐方案已生成。"
      );
    } catch {
      onNotice?.("配乐请求失败或超时，请稍后重试。");
    } finally {
      setBusy(null);
    }
  }

  async function runVideo() {
    const value = videoPrompt.trim();
    if (!value) {
      onNotice?.("先写镜头描述：主体、动作、光线与风格。");
      return;
    }
    setBusy("video");
    setVideoUrl(null);
    onNotice?.(
      productId === "kling-video"
        ? "可灵成片中，通常需要 1–3 分钟，请稍候…"
        : "Runway 成片中，通常需要 1–3 分钟，请稍候…"
    );
    try {
      const res = await fetch("/api/runtime/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "video",
          productId,
          prompt: value,
          promptImage: videoImage || undefined,
          durationSec: videoDuration,
          ratio: videoRatio,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        onNotice?.(data.error || "视频生成失败");
        return;
      }
      const url = typeof data.videoUrl === "string" ? data.videoUrl : "";
      if (!url) {
        onNotice?.("任务完成但未返回视频地址");
        return;
      }
      setVideoUrl(url);
      onNotice?.(
        typeof data.notice === "string"
          ? data.notice
          : `成片完成（${data.model || "runway"}）。`
      );
    } catch {
      onNotice?.("视频请求失败或超时，请稍后重试。");
    } finally {
      setBusy(null);
    }
  }

  const studioTitle =
    mode === "product"
      ? "商品图工作台"
      : mode === "video"
        ? "视频关键帧 / 分镜"
        : "图片制作";

  return (
    <section className="border-t border-white/10 px-5 py-5">
      <h2 className="mb-3 text-[13px] font-medium tracking-wide text-zinc-300">
        专用能力
      </h2>
      <div className="space-y-4">
        {caps.includes("image") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <ImageIcon className="h-3.5 w-3.5" />
              {studioTitle}
              <span className="ml-auto text-[10px] text-emerald-400/80">● 在线</span>
            </p>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] text-zinc-500">出图模型</p>
              <select
                value={imageModelId}
                onChange={(e) => {
                  const id = e.target.value;
                  setImageModelId(id);
                  try {
                    window.localStorage.setItem(modelKey(productId), id);
                  } catch {
                    /* ignore */
                  }
                }}
                className="w-full rounded-md border border-white/10 bg-[#12151c] px-2.5 py-2 text-[12px] text-zinc-200 outline-none focus:border-white/25"
              >
                {studioModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-zinc-600">{imageModel.hint}</p>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] text-zinc-500">
                参考图 · 最多 {MAX_REFS} 张
              </p>
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragging(false);
                  void addRefFiles(e.dataTransfer.files);
                }}
                className={`rounded-md border border-dashed px-3 py-3 ${
                  dragging
                    ? "border-[#3b82f6] bg-[#3b82f6]/10"
                    : "border-white/15 bg-white/[0.02]"
                }`}
              >
                <input
                  ref={refInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/jpg"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = e.target.files;
                    e.target.value = "";
                    if (files) void addRefFiles(files);
                  }}
                />
                <button
                  type="button"
                  onClick={() => refInputRef.current?.click()}
                  className="w-full text-left text-[12px] text-zinc-400 hover:text-zinc-200"
                >
                  点击或拖拽上传参考图
                  <span className="mt-1 block text-[10px] text-zinc-600">
                    JPG/PNG/WebP · 自动压缩
                    {!imageModel.supportsRef
                      ? " · 当前模型不支持参考图"
                      : ""}
                  </span>
                </button>
                {refs.length > 0 ? (
                  <div className="mt-2 grid grid-cols-5 gap-1.5">
                    {refs.map((item) => (
                      <div
                        key={item.id}
                        className="relative aspect-square overflow-hidden rounded border border-white/10"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.dataUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                        <button
                          type="button"
                          aria-label={`移除 ${item.name}`}
                          onClick={() =>
                            setRefs((prev) =>
                              prev.filter((row) => row.id !== item.id)
                            )
                          }
                          className="absolute right-0.5 top-0.5 rounded bg-black/70 p-0.5 text-white"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    {Array.from({ length: Math.max(0, MAX_REFS - refs.length) }).map(
                      (_, i) => (
                        <button
                          key={`slot-${i}`}
                          type="button"
                          onClick={() => refInputRef.current?.click()}
                          className="flex aspect-square items-center justify-center rounded border border-dashed border-white/10 text-zinc-600 hover:border-white/20"
                        >
                          +
                        </button>
                      )
                    )}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] text-zinc-500">
                {mode === "product"
                  ? "套图细分"
                  : mode === "video"
                    ? "分镜细分"
                    : "用途细分"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {scenes.map((item) => (
                  <Chip
                    key={item.id}
                    active={sceneId === item.id}
                    title={item.hint}
                    onClick={() => pickScene(item)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={3}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                  e.preventDefault();
                  void runImage();
                }
              }}
              placeholder={
                mode === "product"
                  ? "商品是什么、材质、卖点、要避免的乱字…"
                  : mode === "video"
                    ? "主体、运镜、时长感、要强调的卖点…"
                    : "描述画面、风格、光线…"
              }
              className="mt-3 w-full resize-none rounded-md border border-white/10 bg-transparent px-2.5 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <p className="mt-1 text-[10px] text-zinc-600">Ctrl / ⌘ + Enter 生成</p>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] text-zinc-500">画面比例</p>
              <div className="flex flex-wrap gap-1.5">
                {ASPECT_RATIOS.map((item) => (
                  <Chip
                    key={item.id}
                    active={aspect === item.id}
                    onClick={() => setAspect(item.id)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="mt-3">
              <p className="mb-1.5 text-[11px] text-zinc-500">分辨率</p>
              <div className="flex flex-wrap gap-1.5">
                {RES_TIERS.map((item) => (
                  <Chip
                    key={item.id}
                    active={tier === item.id}
                    title={item.hint}
                    onClick={() => setTier(item.id)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
              <p className="mt-1.5 text-[10px] text-zinc-600">
                预计输出 {sizeLabel.replace("*", "×")}
                {tier !== "1k" ? "（万相 v1 按白名单就近）" : ""}
                {mode === "video" ? "（关键帧参考）" : ""}
              </p>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-zinc-500">生成数量</p>
              {[1, 2, 3, 4].map((n) => (
                <Chip key={n} active={count === n} onClick={() => setCount(n)}>
                  {n}
                </Chip>
              ))}
            </div>

            <button
              type="button"
              disabled={busy === "image"}
              onClick={() => void runImage()}
              className="mt-3 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs font-medium text-white hover:bg-[#2563eb] disabled:opacity-50"
            >
              {busy === "image"
                ? "生成中…"
                : mode === "video"
                  ? "生成关键帧参考图"
                  : "开始生成"}
            </button>

            {previewUrl ? (
              <div className="mt-3 space-y-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="生成预览"
                  className="max-h-56 w-full rounded-md object-contain"
                  style={{ aspectRatio: aspect.replace(":", " / ") }}
                />
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={saving !== null}
                    onClick={() => void downloadPreview()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    <Download className="h-3.5 w-3.5" />
                    {saving === "download" ? "下载中…" : "下载"}
                  </button>
                  <button
                    type="button"
                    disabled={saving !== null}
                    onClick={() => void copyPreview()}
                    className="inline-flex items-center gap-1.5 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    {saving === "copy" ? "复制中…" : "复制图片"}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="mt-4 border-t border-white/10 pt-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-zinc-500">
                  创作记录 · 共 {history.length} 个
                </p>
                {history.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => persistHistory([])}
                    className="inline-flex items-center gap-1 text-[11px] text-zinc-500 hover:text-zinc-300"
                  >
                    <Trash2 className="h-3 w-3" />
                    清空
                  </button>
                ) : null}
              </div>
              {history.length === 0 ? (
                <p className="py-4 text-center text-[11px] text-zinc-600">
                  生成图片后，记录会显示在这里
                </p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {history.map((item) => (
                    <li
                      key={item.id}
                      className="flex gap-2 rounded-md border border-white/10 bg-white/[0.02] p-1.5"
                    >
                      <button
                        type="button"
                        className="h-12 w-12 shrink-0 overflow-hidden rounded"
                        onClick={() => setPreviewUrl(item.preview)}
                        aria-label="回看这张图"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={item.preview}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] text-zinc-300">
                          {item.prompt}
                        </p>
                        <p className="mt-0.5 text-[10px] text-zinc-600">
                          {item.model}
                          {item.sceneLabel ? ` · ${item.sceneLabel}` : ""} ·{" "}
                          {item.aspect} · {item.tier.toUpperCase()}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void downloadPreview(item.preview)}
                        className="shrink-0 self-center rounded p-1 text-zinc-500 hover:text-zinc-200"
                        aria-label="下载"
                      >
                        <Download className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ) : null}

        {caps.includes("transcribe") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Mic className="h-3.5 w-3.5" />
              录音转写
            </p>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
              上传 mp3 / wav / m4a / webm。优先本机 Whisper；不可用时自动走千问
              ASR（现有 QWEN_API_KEY）。
            </p>
            <input
              ref={audioRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm,.ogg"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void runTranscribe(file);
              }}
            />
            <button
              type="button"
              disabled={busy === "transcribe"}
              onClick={() => audioRef.current?.click()}
              className="mt-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            >
              {busy === "transcribe" ? "转写中…" : "选择音频文件"}
            </button>
          </div>
        ) : null}

        {caps.includes("subtitle") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Captions className="h-3.5 w-3.5" />
              字幕导出
            </p>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
              上传 mp3 / wav / m4a / mp4。转写后下载 SRT / VTT；翻译走千问。
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUBTITLE_LANGS.map((lang) => (
                <Chip
                  key={lang.id}
                  active={subtitleLang === lang.id}
                  onClick={() => setSubtitleLang(lang.id)}
                >
                  {lang.label}
                </Chip>
              ))}
            </div>
            <input
              ref={subtitleRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4,.mov,.mkv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void runSubtitle(file);
              }}
            />
            <button
              type="button"
              disabled={busy === "subtitle"}
              onClick={() => subtitleRef.current?.click()}
              className="mt-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            >
              {busy === "subtitle" ? "生成字幕中…" : "上传音视频"}
            </button>
            {segments.length > 0 ? (
              <div className="mt-3 space-y-2">
                <pre className="max-h-40 overflow-auto whitespace-pre-wrap rounded-md border border-white/10 px-2 py-2 text-[11px] leading-5 text-zinc-300">
                  {toSrt(segments)}
                </pre>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadText("subtitles.srt", toSrt(segments), "application/x-subrip")
                    }
                    className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5"
                  >
                    下载 SRT
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      downloadText("subtitles.vtt", toVtt(segments), "text/vtt")
                    }
                    className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5"
                  >
                    下载 VTT
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {caps.includes("clips") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Scissors className="h-3.5 w-3.5" />
              智能选片
            </p>
            <p className="mt-1 text-[12px] leading-5 text-zinc-500">
              {isAutoEdit
                ? "上传口播/素材：自动选片后可逐镜开关、改入出点，再一键站内出片。"
                : "上传音视频，转写出时间轴后标高潮。导出时间码；成片请用自动剪辑服务。"}
            </p>
            <input
              value={clipPurpose}
              onChange={(e) => setClipPurpose(e.target.value)}
              placeholder="用途：抖音带货 / 课程切片…"
              className="mt-2 w-full rounded-md border border-white/10 bg-transparent px-2.5 py-1.5 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <input
              value={targetPlatform}
              onChange={(e) => setTargetPlatform(e.target.value)}
              placeholder="平台：抖音/小红书/视频号…"
              className="mt-2 w-full rounded-md border border-white/10 bg-transparent px-2.5 py-1.5 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <input
              ref={clipRef}
              type="file"
              accept="audio/*,video/*,.mp3,.wav,.m4a,.webm,.ogg,.mp4,.mov,.mkv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void runClips(file);
              }}
            />
            <button
              type="button"
              disabled={busy === "clips"}
              onClick={() => clipRef.current?.click()}
              className="mt-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            >
              {busy === "clips" ? "转写并选片中…" : "上传音视频"}
            </button>
            {clips.length > 0 ? (
              <div className="mt-3 space-y-2">
                {isAutoEdit ? (
                  <div className="space-y-2">
                    <p className="text-[11px] text-zinc-500">
                      精细管理：勾选要用的镜头，改入出点，上下调整顺序。
                    </p>
                    <ul className="space-y-2">
                      {clips.map((clip, i) => (
                        <li
                          key={clip.id}
                          className="rounded-md border border-white/10 px-2 py-2"
                        >
                          <label className="flex items-start gap-2 text-[12px] text-zinc-300">
                            <input
                              type="checkbox"
                              checked={clip.enabled}
                              onChange={(e) =>
                                patchClip(clip.id, { enabled: e.target.checked })
                              }
                              className="mt-0.5"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="text-[#f3d2a0]">
                                镜头 {i + 1}
                              </span>
                              {" · "}
                              {clip.reason}
                              {clip.quote ? (
                                <span className="block text-zinc-500">
                                  「{clip.quote}」
                                </span>
                              ) : null}
                              <span className="mt-1 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-400">
                                入
                                <input
                                  type="number"
                                  step="0.1"
                                  value={Number(clip.start.toFixed(1))}
                                  onChange={(e) =>
                                    patchClip(clip.id, {
                                      start: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-16 rounded border border-white/10 bg-transparent px-1 py-0.5"
                                />
                                出
                                <input
                                  type="number"
                                  step="0.1"
                                  value={Number(clip.end.toFixed(1))}
                                  onChange={(e) =>
                                    patchClip(clip.id, {
                                      end: Number(e.target.value) || 0,
                                    })
                                  }
                                  className="w-16 rounded border border-white/10 bg-transparent px-1 py-0.5"
                                />
                                <button
                                  type="button"
                                  onClick={() => moveClip(i, -1)}
                                  className="rounded border border-white/10 px-1.5 py-0.5 hover:bg-white/5"
                                >
                                  上
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveClip(i, 1)}
                                  className="rounded border border-white/10 px-1.5 py-0.5 hover:bg-white/5"
                                >
                                  下
                                </button>
                              </span>
                            </span>
                          </label>
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-wrap gap-1.5">
                      {(["9:16", "16:9", "1:1"] as const).map((id) => (
                        <Chip
                          key={id}
                          active={editAspect === id}
                          onClick={() => setEditAspect(id)}
                        >
                          {id}
                        </Chip>
                      ))}
                      {[15, 30, 60].map((sec) => (
                        <Chip
                          key={sec}
                          active={durationCap === sec}
                          onClick={() => setDurationCap(sec)}
                        >
                          {sec}秒
                        </Chip>
                      ))}
                      <Chip
                        active={burnCaptions}
                        onClick={() => setBurnCaptions((v) => !v)}
                      >
                        {burnCaptions ? "烧录字幕" : "不烧字幕"}
                      </Chip>
                      <Chip
                        active={captionSize === "large"}
                        onClick={() =>
                          setCaptionSize((v) =>
                            v === "large" ? "normal" : "large"
                          )
                        }
                      >
                        {captionSize === "large" ? "大字幕" : "标准字幕"}
                      </Chip>
                    </div>
                    <button
                      type="button"
                      disabled={busy === "clips"}
                      onClick={() => void runInSiteRender()}
                      className="rounded-md bg-emerald-600 px-3 py-1.5 text-xs text-white hover:bg-emerald-500 disabled:opacity-50"
                    >
                      {busy === "clips" ? "成片中…" : "站内出片"}
                    </button>
                    {outputUrl ? (
                      <div className="space-y-2">
                        <video
                          src={outputUrl}
                          controls
                          className="w-full rounded-md border border-white/10"
                        />
                        <a
                          href={outputUrl}
                          download="auto-edit.mp4"
                          className="inline-block rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5"
                        >
                          下载 MP4
                        </a>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <ul className="space-y-1.5 text-[12px] leading-5 text-zinc-300">
                    {clips.map((clip, i) => (
                      <li key={clip.id || `${clip.start}-${clip.end}-${i}`}>
                        <span className="text-[#f3d2a0]">
                          {formatClock(clip.start)}–{formatClock(clip.end)}
                        </span>
                        {" · "}
                        {clip.reason}
                        {clip.quote ? (
                          <span className="block text-zinc-500">「{clip.quote}」</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const text = clipsToText(activeClips.length ? activeClips : clips);
                    void navigator.clipboard.writeText(text);
                    onNotice?.("时间码已复制。");
                    onTranscript?.(
                      clipTranscript
                        ? `${clipTranscript}\n\n可剪片段：\n${text}`
                        : text
                    );
                  }}
                  className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5"
                >
                  复制时间码
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={busy === "clips"}
                    onClick={() => void runAutoEditPlan()}
                    className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5 disabled:opacity-50"
                  >
                    生成剪辑草稿
                  </button>
                  {autoEditPlan ? (
                    <button
                      type="button"
                      onClick={() => exportCollabPack()}
                      className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5"
                    >
                      下载协同包
                    </button>
                  ) : null}
                  {autoEditPlan && !isAutoEdit ? (
                    <button
                      type="button"
                      onClick={() => void exportCapcutMateRequestPayload()}
                      className="rounded-md border border-white/15 px-2.5 py-1 text-[11px] text-zinc-200 hover:bg-white/5"
                    >
                      导出 CapCut Mate 请求体（PoC）
                    </button>
                  ) : null}
                  {autoEditPlan && !isAutoEdit ? (
                    <button
                      type="button"
                      disabled={busy === "clips"}
                      onClick={() => void runCapcutMateCreateDraft()}
                      className="rounded-md border border-emerald-400/40 px-2.5 py-1 text-[11px] text-emerald-200 hover:bg-emerald-500/10 disabled:opacity-50"
                    >
                      直连生成剪映草稿
                    </button>
                  ) : null}
                </div>
                {capcutDraftUrl ? (
                  <p className="text-[11px] text-zinc-500">
                    草稿 URL 已生成并复制：{capcutDraftUrl}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {caps.includes("tts") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Volume2 className="h-3.5 w-3.5" />
              配音合成
            </p>
            <textarea
              value={ttsText}
              onChange={(e) => setTtsText(e.target.value)}
              rows={3}
              placeholder="贴入口播稿…"
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-transparent px-2.5 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <button
              type="button"
              disabled={busy === "tts"}
              onClick={() => void runTts()}
              className="mt-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5 disabled:opacity-50"
            >
              {busy === "tts" ? "合成中…" : "合成语音"}
            </button>
            {audioUrl ? (
              <audio controls src={audioUrl} className="mt-3 w-full" />
            ) : null}
          </div>
        ) : null}

        {caps.includes("voice-clone") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Volume2 className="h-3.5 w-3.5" />
              声音通道（先选场景 → 档位 → 模型）
            </p>
            <p className="mt-1 text-[11px] leading-5 text-zinc-600">
              须取得发音人明示授权。缺密钥的模型会自动落到已开通通道。
            </p>

            <p className="mt-3 text-[11px] text-zinc-500">① 你想做什么？</p>
            <div className="mt-1.5 flex flex-col gap-1.5">
              {VOICE_LANES.map((lane) => (
                <button
                  key={lane.id}
                  type="button"
                  onClick={() => {
                    setVoiceLane(lane.id);
                    setVoiceTier(null);
                    setVoiceModelId(null);
                  }}
                  className={`rounded-md border px-2.5 py-1.5 text-left text-[12px] ${
                    voiceLane === lane.id
                      ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-zinc-100"
                      : "border-white/10 text-zinc-400 hover:bg-white/5"
                  }`}
                >
                  <span className="text-zinc-200">
                    {lane.id}. {lane.title}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-zinc-600">
                    {lane.blurb}
                  </span>
                </button>
              ))}
            </div>

            {voiceLane ? (
              <>
                <p className="mt-3 text-[11px] text-zinc-500">② 档位</p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {(["high", "mid", "low"] as VoiceTierId[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setVoiceTier(t);
                        setVoiceModelId(null);
                      }}
                      className={`rounded-md border px-2.5 py-1 text-[11px] ${
                        voiceTier === t
                          ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-zinc-100"
                          : "border-white/10 text-zinc-400 hover:bg-white/5"
                      }`}
                    >
                      {VOICE_TIER_LABELS[t]}
                    </button>
                  ))}
                </div>
              </>
            ) : null}

            {voiceLane && voiceTier ? (
              <>
                <p className="mt-3 text-[11px] text-zinc-500">③ 模型</p>
                <div className="mt-1.5 flex flex-col gap-1.5">
                  {voiceModelsForPick.map((m) => {
                    const ready = voiceReadyMap[m.id] !== false;
                    const known = m.id in voiceReadyMap;
                    const ok = known ? voiceReadyMap[m.id] : ready;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setVoiceModelId(m.id)}
                        className={`rounded-md border px-2.5 py-1.5 text-left text-[12px] ${
                          voiceModelId === m.id
                            ? "border-[#3b82f6]/50 bg-[#3b82f6]/10 text-zinc-100"
                            : "border-white/10 text-zinc-400 hover:bg-white/5"
                        }`}
                      >
                        <span className="flex items-center justify-between gap-2">
                          <span className="text-zinc-200">{m.label}</span>
                          <span
                            className={`text-[10px] ${ok ? "text-emerald-500/80" : "text-amber-500/90"}`}
                          >
                            {ok ? "已开通" : `缺 ${m.envKeys.join("/")}`}
                          </span>
                        </span>
                        <span className="mt-0.5 block text-[11px] text-zinc-600">
                          {m.blurb}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {voiceMissingKeys.length ? (
                  <p className="mt-2 text-[11px] leading-5 text-amber-600/90">
                    尚未配置：{voiceMissingKeys.join("、")}。选中缺密钥模型时会自动改用已开通通道。
                  </p>
                ) : null}
              </>
            ) : null}

            <label className="mt-3 flex items-start gap-2 text-[12px] text-zinc-400">
              <input
                type="checkbox"
                checked={cloneConsent}
                onChange={(e) => setCloneConsent(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                我确认已获得发音人授权，样本仅用于本店口播/课程试听，不用于冒充他人。
              </span>
            </label>
            <input
              ref={cloneSampleRef}
              type="file"
              accept="audio/*,.mp3,.wav,.m4a,.webm"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                setCloneSampleFile(file);
                setCloneSampleName(file.name.slice(0, 80));
              }}
            />
            <button
              type="button"
              onClick={() => cloneSampleRef.current?.click()}
              className="mt-2 rounded-md border border-white/15 px-3 py-1.5 text-xs text-zinc-200 hover:bg-white/5"
            >
              {cloneSampleName ? `已选：${cloneSampleName}` : "上传人声样本"}
            </button>
            <textarea
              value={cloneText}
              onChange={(e) => setCloneText(e.target.value)}
              rows={3}
              placeholder="要试听的口播稿…"
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-transparent px-2.5 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <button
              type="button"
              disabled={busy === "voice-clone"}
              onClick={() => void runVoiceClone()}
              className="mt-2 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs text-white hover:bg-[#2563eb] disabled:opacity-50"
            >
              {busy === "voice-clone" ? "克隆合成中…" : "授权后克隆试听"}
            </button>
            {cloneAudioUrl ? (
              <audio controls src={cloneAudioUrl} className="mt-3 w-full" />
            ) : null}
          </div>
        ) : null}

        {caps.includes("music") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Music2 className="h-3.5 w-3.5" />
              AI 配乐（Suno）
            </p>
            <div className="mt-2">
              <p className="mb-1.5 text-[11px] text-zinc-500">用途</p>
              <div className="flex flex-wrap gap-1.5">
                {MUSIC_USE_CASES.map((item) => (
                  <Chip
                    key={item.id}
                    active={musicUseCase === item.id}
                    title={item.hint}
                    onClick={() => setMusicUseCase(item.id)}
                  >
                    {item.label}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-2">
              <p className="mb-1.5 text-[11px] text-zinc-500">情绪</p>
              <div className="flex flex-wrap gap-1.5">
                {MUSIC_MOODS.map((mood) => (
                  <Chip
                    key={mood}
                    active={musicMood === mood}
                    onClick={() => setMusicMood(mood)}
                  >
                    {mood}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-zinc-500">时长</p>
              {[8, 15, 30, 45].map((sec) => (
                <Chip
                  key={sec}
                  active={musicDuration === sec}
                  onClick={() => setMusicDuration(sec)}
                >
                  {sec}s
                </Chip>
              ))}
            </div>
            <textarea
              value={musicPrompt}
              onChange={(e) => setMusicPrompt(e.target.value)}
              rows={3}
              placeholder="例如：咖啡店周末促销短视频，轻快不抢旁白…"
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-transparent px-2.5 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <button
              type="button"
              disabled={busy === "music"}
              onClick={() => void runMusic()}
              className="mt-2 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs text-white hover:bg-[#2563eb] disabled:opacity-50"
            >
              {busy === "music" ? "成曲中…" : "生成配乐（Suno）"}
            </button>
            {musicBrief ? (
              <div className="mt-3 space-y-2 rounded-md border border-white/10 bg-white/[0.02] p-2.5 text-[12px] text-zinc-300">
                <p className="font-medium text-zinc-200">{musicBrief.title}</p>
                <p className="text-zinc-400">{musicBrief.zhPrompt}</p>
                {musicBrief.audioUrl ? (
                  <audio
                    controls
                    src={musicBrief.audioUrl}
                    className="mt-1 w-full"
                  />
                ) : null}
                {musicBrief.tracks && musicBrief.tracks.length > 1
                  ? musicBrief.tracks.slice(1).map((track, i) => (
                      <div key={`${track.audioUrl}-${i}`} className="space-y-1">
                        <p className="text-[11px] text-zinc-500">
                          备选 {i + 2}
                          {track.title ? ` · ${track.title}` : ""}
                        </p>
                        <audio controls src={track.audioUrl} className="w-full" />
                      </div>
                    ))
                  : null}
                <div>
                  <p className="text-[11px] text-zinc-500">Suno 英文提示词</p>
                  <p className="mt-1 break-words text-zinc-300">
                    {musicBrief.sunoPrompt}
                  </p>
                  <button
                    type="button"
                    className="mt-1.5 text-[11px] text-[#93c5fd] hover:underline"
                    onClick={() => {
                      void navigator.clipboard.writeText(musicBrief.sunoPrompt);
                      onNotice?.("已复制 Suno 提示词。");
                    }}
                  >
                    复制提示词
                  </button>
                </div>
                <ul className="list-disc space-y-0.5 pl-4 text-zinc-500">
                  {musicBrief.structure.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
                <p className="text-[11px] text-zinc-600">{musicBrief.nextStep}</p>
              </div>
            ) : null}
          </div>
        ) : null}

        {caps.includes("video") ? (
          <div className="rounded-lg border border-white/10 bg-[#0b0d10] px-3 py-3">
            <p className="flex items-center gap-1.5 text-[12px] text-zinc-400">
              <Film className="h-3.5 w-3.5" />
              Runway 在线成片
              <span className="ml-auto text-[10px] text-emerald-400/80">● 在线</span>
            </p>
            <p className="mt-1 text-[10px] text-zinc-600">
              纯文字走 gen4.5；上传参考图则走图生视频（更快）。成片约 1–3 分钟。
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-zinc-500">时长</p>
              {[4, 5, 8, 10].map((sec) => (
                <Chip
                  key={sec}
                  active={videoDuration === sec}
                  onClick={() => setVideoDuration(sec)}
                >
                  {sec}s
                </Chip>
              ))}
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <p className="text-[11px] text-zinc-500">画幅</p>
              {(
                [
                  ["1280:720", "横屏"],
                  ["720:1280", "竖屏"],
                  ["960:960", "方屏"],
                ] as const
              ).map(([id, label]) => (
                <Chip
                  key={id}
                  active={videoRatio === id}
                  onClick={() => setVideoRatio(id)}
                >
                  {label}
                </Chip>
              ))}
            </div>
            <div className="mt-2">
              <input
                ref={videoImageRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  void (async () => {
                    try {
                      const dataUrl = await compressToDataUrl(file);
                      setVideoImage(dataUrl);
                      setVideoImageName(file.name);
                    } catch {
                      onNotice?.("参考图读取失败");
                    }
                  })();
                }}
              />
              <button
                type="button"
                onClick={() => videoImageRef.current?.click()}
                className="rounded-md border border-white/10 px-2.5 py-1.5 text-[11px] text-zinc-400 hover:border-white/20 hover:text-zinc-200"
              >
                {videoImageName ? `已选：${videoImageName}` : "可选：上传首帧/商品图"}
              </button>
              {videoImage ? (
                <button
                  type="button"
                  className="ml-2 text-[11px] text-zinc-500 hover:text-zinc-300"
                  onClick={() => {
                    setVideoImage(null);
                    setVideoImageName("");
                  }}
                >
                  清除
                </button>
              ) : null}
            </div>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              rows={3}
              placeholder="例如：白底商品缓慢旋转，柔光棚拍，镜头轻推近…"
              className="mt-2 w-full resize-none rounded-md border border-white/10 bg-transparent px-2.5 py-2 text-[13px] text-zinc-200 outline-none placeholder:text-zinc-600 focus:border-white/25"
            />
            <button
              type="button"
              disabled={busy === "video"}
              onClick={() => void runVideo()}
              className="mt-2 w-full rounded-md bg-[#3b82f6] px-3 py-2 text-xs text-white hover:bg-[#2563eb] disabled:opacity-50"
            >
              {busy === "video" ? "成片生成中…" : "生成短视频"}
            </button>
            {videoUrl ? (
              <div className="mt-3 space-y-2">
                <video
                  controls
                  src={videoUrl}
                  className="w-full rounded-md border border-white/10"
                />
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex text-[11px] text-[#93c5fd] hover:underline"
                >
                  打开 / 下载成片链接
                </a>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
