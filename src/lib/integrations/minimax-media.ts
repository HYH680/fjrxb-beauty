/**
 * MiniMax 海螺语音：T2A 合成 + 快速复刻。
 * 国内：https://api.minimaxi.com
 */

const MINIMAX_BASE = (
  process.env.MINIMAX_BASE_URL || "https://api.minimaxi.com"
).replace(/\/$/, "");

function minimaxKey() {
  return process.env.MINIMAX_API_KEY?.trim() || "";
}

export function minimaxMediaEnabled() {
  return Boolean(minimaxKey());
}

function authHeaders(json = true): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${minimaxKey()}`,
  };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function assertOk(baseResp: { status_code?: number; status_msg?: string } | undefined) {
  const code = baseResp?.status_code;
  if (code !== undefined && code !== 0) {
    throw new Error(
      baseResp?.status_msg || `MiniMax 错误码 ${code}`
    );
  }
}

/** 上传复刻样本，返回 file_id */
export async function uploadVoiceCloneFileMinimax(
  bytes: Buffer,
  filename: string
) {
  const apiKey = minimaxKey();
  if (!apiKey) throw new Error("未配置 MINIMAX_API_KEY");

  const form = new FormData();
  form.append("purpose", "voice_clone");
  form.append(
    "file",
    new Blob([new Uint8Array(bytes)], {
      type: filename.toLowerCase().endsWith(".wav")
        ? "audio/wav"
        : "audio/mpeg",
    }),
    filename || "sample.mp3"
  );

  const res = await fetch(`${MINIMAX_BASE}/v1/files/upload`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });
  const data = (await res.json().catch(() => ({}))) as {
    file?: { file_id?: number };
    base_resp?: { status_code?: number; status_msg?: string };
  };
  if (!res.ok) {
    throw new Error(data.base_resp?.status_msg || `MiniMax 上传失败 ${res.status}`);
  }
  assertOk(data.base_resp);
  const fileId = data.file?.file_id;
  if (!fileId) throw new Error("MiniMax 上传未返回 file_id");
  return fileId;
}

function makeVoiceId(preferred?: string) {
  const raw = (preferred || "shopvoice")
    .replace(/[^a-zA-Z0-9_-]/g, "")
    .slice(0, 24);
  const base = /^[A-Za-z]/.test(raw) ? raw : `V${raw || "oice"}`;
  const suffix = Date.now().toString(36).slice(-6);
  const id = `${base}${suffix}`.replace(/[-_]+$/g, "");
  return id.length >= 8 ? id.slice(0, 256) : `${id}xxxxxxxx`.slice(0, 12);
}

/** 快速复刻；可选同时用 text+model 出试听 */
export async function cloneVoiceMinimax(input: {
  sampleBase64: string;
  sampleName?: string;
  preferredName?: string;
  text?: string;
  model?: string;
}) {
  const apiKey = minimaxKey();
  if (!apiKey) throw new Error("未配置 MINIMAX_API_KEY");

  const b64 = input.sampleBase64.replace(/^data:[^;]+;base64,/, "");
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > 20 * 1024 * 1024) {
    throw new Error("样本请控制在 20MB 以内");
  }
  const filename = input.sampleName || "sample.mp3";
  const fileId = await uploadVoiceCloneFileMinimax(bytes, filename);
  const voiceId = makeVoiceId(input.preferredName);
  const model =
    input.model?.trim() ||
    process.env.MINIMAX_TTS_MODEL?.trim() ||
    "speech-2.6-hd";

  const body: Record<string, unknown> = {
    file_id: fileId,
    voice_id: voiceId,
    need_noise_reduction: true,
  };
  if (input.text?.trim()) {
    body.text = input.text.trim().slice(0, 1000);
    body.model = model;
  }

  const res = await fetch(`${MINIMAX_BASE}/v1/voice_clone`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as {
    demo_audio?: string;
    base_resp?: { status_code?: number; status_msg?: string };
  };
  if (!res.ok) {
    throw new Error(data.base_resp?.status_msg || `MiniMax 克隆失败 ${res.status}`);
  }
  assertOk(data.base_resp);

  let mime = "audio/mpeg";
  let base64 = "";
  if (data.demo_audio) {
    const audioRes = await fetch(data.demo_audio);
    if (!audioRes.ok) throw new Error(`下载 MiniMax 试听失败 ${audioRes.status}`);
    const buf = Buffer.from(await audioRes.arrayBuffer());
    const ct = audioRes.headers.get("content-type") || "audio/mpeg";
    mime = ct.includes("wav") ? "audio/wav" : "audio/mpeg";
    base64 = buf.toString("base64");
  }

  return { voiceId, model, mime, base64, demoUrl: data.demo_audio || "" };
}

/** T2A 非流式合成 */
export async function synthesizeSpeechMinimax(input: {
  text: string;
  voice?: string;
  model?: string;
}) {
  const apiKey = minimaxKey();
  if (!apiKey) throw new Error("未配置 MINIMAX_API_KEY");

  const model =
    input.model?.trim() ||
    process.env.MINIMAX_TTS_MODEL?.trim() ||
    "speech-2.6-hd";
  const voiceId =
    input.voice?.trim() ||
    process.env.MINIMAX_TTS_VOICE?.trim() ||
    "female-tianmei";

  const res = await fetch(`${MINIMAX_BASE}/v1/t2a_v2`, {
    method: "POST",
    headers: authHeaders(true),
    body: JSON.stringify({
      model,
      text: input.text.slice(0, 5000),
      stream: false,
      voice_setting: {
        voice_id: voiceId,
        speed: 1,
        vol: 1,
        pitch: 0,
      },
      audio_setting: {
        sample_rate: 32000,
        bitrate: 128000,
        format: "mp3",
        channel: 1,
      },
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    data?: { audio?: string };
    base_resp?: { status_code?: number; status_msg?: string };
    message?: string;
  };
  if (!res.ok) {
    throw new Error(
      data.base_resp?.status_msg || data.message || `MiniMax TTS 失败 ${res.status}`
    );
  }
  assertOk(data.base_resp);
  const hex = data.data?.audio;
  if (!hex) throw new Error("MiniMax TTS 未返回音频");
  const buf = Buffer.from(hex, "hex");
  return {
    provider: "minimax-tts" as const,
    mime: "audio/mpeg",
    base64: buf.toString("base64"),
    voiceId,
    model,
  };
}
