/**
 * Cartesia Sonic TTS（英文低延迟）
 * Docs: https://docs.cartesia.ai/api-reference/tts/bytes
 */
import { outboundFetch } from "@/lib/integrations/outbound-proxy";

function cartesiaKey() {
  return process.env.CARTESIA_API_KEY?.trim() || "";
}

export function cartesiaMediaEnabled() {
  return Boolean(cartesiaKey());
}

function cartesiaBase() {
  return (
    process.env.CARTESIA_BASE_URL?.trim() || "https://api.cartesia.ai"
  ).replace(/\/$/, "");
}

function cartesiaVersion() {
  return process.env.CARTESIA_VERSION?.trim() || "2026-08-14";
}

function cartesiaModel() {
  return (
    process.env.CARTESIA_MODEL?.trim() ||
    "sonic-3"
  );
}

function headers() {
  const key = cartesiaKey();
  if (!key) throw new Error("未配置 CARTESIA_API_KEY");
  return {
    Authorization: `Bearer ${key}`,
    "Cartesia-Version": cartesiaVersion(),
    "Content-Type": "application/json",
  };
}

type VoiceRow = { id?: string; name?: string; language?: string };

let cachedVoiceId: string | null = null;

/** 解析默认音色：优先 CARTESIA_VOICE_ID，否则拉库取第一个英文声 */
export async function resolveCartesiaVoiceId(preferred?: string) {
  if (preferred?.trim()) return preferred.trim();
  const fromEnv = process.env.CARTESIA_VOICE_ID?.trim();
  if (fromEnv) return fromEnv;
  if (cachedVoiceId) return cachedVoiceId;

  const res = await outboundFetch(`${cartesiaBase()}/voices?limit=20`, {
    method: "GET",
    headers: headers(),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(
      `Cartesia voices ${res.status}: ${text.slice(0, 200) || "failed"}`
    );
  }
  let data: { data?: VoiceRow[] } | VoiceRow[] = {};
  try {
    data = JSON.parse(text) as typeof data;
  } catch {
    throw new Error("Cartesia voices 响应无法解析");
  }
  const rows = Array.isArray(data)
    ? data
    : Array.isArray(data.data)
      ? data.data
      : [];
  const en =
    rows.find((v) => /en/i.test(String(v.language || ""))) || rows[0];
  const id = en?.id?.trim();
  if (!id) {
    throw new Error(
      "Cartesia 音色库为空，请在控制台选一个音色并配置 CARTESIA_VOICE_ID"
    );
  }
  cachedVoiceId = id;
  return id;
}

export async function synthesizeSpeechCartesia(input: {
  text: string;
  voice?: string;
  model?: string;
  language?: string;
}) {
  const transcript = input.text.trim().slice(0, 4000);
  if (!transcript) throw new Error("需要合成文案");

  const voiceId = await resolveCartesiaVoiceId(input.voice);
  const modelId = input.model?.trim() || cartesiaModel();

  const res = await outboundFetch(`${cartesiaBase()}/tts/bytes`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({
      model_id: modelId,
      transcript,
      voice: { id: voiceId },
      language: input.language || "en",
      output_format: {
        container: "mp3",
        sample_rate: 44100,
        bit_rate: 128000,
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(
      `Cartesia TTS ${res.status}: ${detail.slice(0, 280) || "failed"}`
    );
  }

  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length) throw new Error("Cartesia 返回空音频");

  return {
    provider: "cartesia" as const,
    mime: "audio/mpeg",
    base64: buf.toString("base64"),
    model: modelId,
    voiceId,
  };
}
