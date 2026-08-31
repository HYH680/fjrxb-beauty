/**
 * Fish Audio：TTS + 持久化音色克隆（POST /model → reference_id）。
 * 文档：https://docs.fish.audio
 */

import { File } from "node:buffer";
import { FormData as UndiciFormData } from "undici";
import { outboundFetch } from "@/lib/integrations/outbound-proxy";

const FISH_BASE = (
  process.env.FISH_BASE_URL || "https://api.fish.audio"
).replace(/\/$/, "");

function fishKey() {
  return process.env.FISH_API_KEY?.trim() || "";
}

export function fishMediaEnabled() {
  return Boolean(fishKey());
}

function fishModelHeader(model?: string) {
  return (
    model?.trim() ||
    process.env.FISH_TTS_MODEL?.trim() ||
    "s2-pro"
  );
}

async function fishFetch(path: string, init: RequestInit) {
  return outboundFetch(`${FISH_BASE}${path}`, init);
}

/** 用已有音色 ID 合成（库内音色或你克隆得到的 _id） */
export async function synthesizeSpeechFish(input: {
  text: string;
  referenceId?: string;
  model?: string;
}) {
  const apiKey = fishKey();
  if (!apiKey) throw new Error("未配置 FISH_API_KEY");

  const referenceId =
    input.referenceId?.trim() ||
    process.env.FISH_TTS_VOICE?.trim() ||
    // 文档示例公共音色，可被 FISH_TTS_VOICE 覆盖
    "9a9cf47702da476aa4629e2506d4a857";

  const model = fishModelHeader(input.model);
  const res = await fishFetch(`/v1/tts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      model,
    },
    body: JSON.stringify({
      text: input.text.slice(0, 5000),
      reference_id: referenceId,
      format: "mp3",
      mp3_bitrate: 128,
      normalize: true,
      latency: "normal",
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Fish TTS 失败 ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("Fish TTS 未返回音频");
  return {
    provider: "fish-tts" as const,
    mime: "audio/mpeg",
    base64: buf.toString("base64"),
    referenceId,
    model,
  };
}

/** 上传样本登记持久化音色，返回 voice _id */
export async function enrollVoiceFish(input: {
  sampleBase64: string;
  sampleName?: string;
  title?: string;
}) {
  const apiKey = fishKey();
  if (!apiKey) throw new Error("未配置 FISH_API_KEY");

  const b64 = input.sampleBase64.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > 20 * 1024 * 1024) {
    throw new Error("样本请控制在 20MB 以内");
  }

  const filename = input.sampleName || "sample.mp3";
  const form = new UndiciFormData();
  form.set("type", "tts");
  form.set("title", (input.title || "shop-voice").slice(0, 60));
  form.set("description", "AI supermarket authorized voice clone");
  form.set("visibility", "private");
  form.set("train_mode", "fast");
  form.set(
    "voices",
    new File([bytes], filename, {
      type: filename.toLowerCase().endsWith(".wav")
        ? "audio/wav"
        : "audio/mpeg",
    })
  );

  const res = await fishFetch(`/model`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form as unknown as BodyInit,
  });
  const data = (await res.json().catch(() => ({}))) as {
    _id?: string;
    id?: string;
    state?: string;
    message?: string;
    status?: number;
  };
  if (!res.ok) {
    throw new Error(
      data.message || `Fish 克隆登记失败 ${res.status}`
    );
  }
  const voiceId = data._id || data.id || "";
  if (!voiceId) throw new Error("Fish 克隆未返回 voice id");
  return { voiceId, state: data.state || "" };
}

/** 登记克隆音色并用口播稿试听 */
export async function cloneAndSpeakFish(input: {
  text: string;
  sampleBase64: string;
  sampleName?: string;
  title?: string;
  model?: string;
}) {
  const enrolled = await enrollVoiceFish({
    sampleBase64: input.sampleBase64,
    sampleName: input.sampleName,
    title: input.title,
  });
  const spoken = await synthesizeSpeechFish({
    text: input.text,
    referenceId: enrolled.voiceId,
    model: input.model,
  });
  return {
    ...spoken,
    provider: "fish-clone" as const,
    voiceId: enrolled.voiceId,
    state: enrolled.state,
  };
}
