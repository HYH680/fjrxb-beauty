/**
 * 用已有的 QWEN_API_KEY（DashScope）补齐出图 / 配音 / 转写，
 * 避免本地网关没有 DALL·E / Whisper / ElevenLabs、或 Docker 起不来时整条链路不可用。
 */

const DASHSCOPE_BASE =
  (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com").replace(
    /\/$/,
    ""
  );

function dashscopeKey() {
  return (
    process.env.QWEN_API_KEY?.trim() ||
    process.env.DASHSCOPE_API_KEY?.trim() ||
    ""
  );
}

export function dashscopeMediaEnabled() {
  return Boolean(dashscopeKey());
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function pollTask(taskId: string, apiKey: string, maxAttempts = 40) {
  for (let i = 0; i < maxAttempts; i++) {
    const res = await fetch(`${DASHSCOPE_BASE}/api/v1/tasks/${taskId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || `DashScope 任务查询失败 ${res.status}`);
    }
    const data = (await res.json()) as {
      output?: {
        task_status?: string;
        results?: { url?: string; code?: string; message?: string }[];
        message?: string;
      };
      message?: string;
    };
    const status = data.output?.task_status;
    if (status === "SUCCEEDED") {
      const url = data.output?.results?.find((r) => r.url)?.url || "";
      if (!url) throw new Error("DashScope 出图成功但未返回图片地址");
      return url;
    }
    if (status === "FAILED" || status === "CANCELED" || status === "UNKNOWN") {
      const msg =
        data.output?.results?.find((r) => r.message)?.message ||
        data.output?.message ||
        data.message ||
        status;
      throw new Error(`DashScope 出图失败：${msg}`);
    }
    await sleep(1500);
  }
  throw new Error("DashScope 出图超时，请稍后重试");
}

/** 万相文生图（异步任务）；可选参考图 URL / data URL */
export async function generateImageDashScope(
  prompt: string,
  options?: {
    size?: string;
    n?: number;
    model?: string;
    refImg?: string;
  }
) {
  const apiKey = dashscopeKey();
  if (!apiKey) throw new Error("未配置 QWEN_API_KEY，无法用千问万相出图");

  const model =
    options?.model?.trim() ||
    process.env.IMAGE_MODEL?.trim() ||
    "wanx-v1";
  const count = Math.min(4, Math.max(1, Math.floor(options?.n || 1)));
  const size = options?.size || process.env.IMAGE_SIZE || "1024*1024";
  const refImg = options?.refImg?.trim() || "";

  const input: Record<string, string> = {
    prompt: prompt.slice(0, 800),
  };
  if (refImg) input.ref_img = refImg;

  const parameters: Record<string, string | number> = {
    size,
    n: count,
  };
  if (refImg) {
    parameters.ref_mode = "refonly";
    parameters.ref_strength = 0.65;
  }

  const res = await fetch(
    `${DASHSCOPE_BASE}/api/v1/services/aigc/text2image/image-synthesis`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "X-DashScope-Async": "enable",
      },
      body: JSON.stringify({
        model,
        input,
        parameters,
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    // 参考图不被接受时，去掉再试一次纯文生图
    if (refImg && /ref_img|reference|image/i.test(detail)) {
      return generateImageDashScope(prompt, {
        size,
        n: count,
        model,
      });
    }
    throw new Error(detail || `DashScope 出图提交失败 ${res.status}`);
  }
  const data = (await res.json()) as {
    output?: { task_id?: string };
    message?: string;
  };
  const taskId = data.output?.task_id;
  if (!taskId) {
    throw new Error(data.message || "DashScope 未返回 task_id");
  }
  const url = await pollTask(taskId, apiKey);
  let b64 = "";
  try {
    const imgRes = await fetch(url);
    if (imgRes.ok) {
      const buf = Buffer.from(await imgRes.arrayBuffer());
      b64 = buf.toString("base64");
    }
  } catch {
    /* 外链仍可用；客户端可再走代理下载 */
  }
  return {
    provider: "dashscope-wanx",
    model,
    url,
    b64,
    size,
    usedRef: Boolean(refImg),
  };
}

function cloneTargetModel() {
  return (
    process.env.DASHSCOPE_CLONE_TARGET_MODEL?.trim() ||
    "qwen3-tts-vc-2026-01-22"
  );
}

async function fetchDashScopeAudio(
  audioUrl?: string,
  b64Inline?: string,
  fallbackMime = "audio/mpeg"
) {
  if (b64Inline) {
    return {
      provider: "dashscope-tts" as const,
      mime: fallbackMime,
      base64: b64Inline,
    };
  }
  if (!audioUrl) throw new Error("DashScope 配音未返回音频");
  const audioRes = await fetch(audioUrl);
  if (!audioRes.ok) throw new Error(`下载配音失败 ${audioRes.status}`);
  const buf = Buffer.from(await audioRes.arrayBuffer());
  const contentType = audioRes.headers.get("content-type") || fallbackMime;
  const mime = contentType.includes("wav")
    ? "audio/wav"
    : contentType.includes("mpeg") || contentType.includes("mp3")
      ? "audio/mpeg"
      : audioUrl.includes(".wav")
        ? "audio/wav"
        : fallbackMime;
  return {
    provider: "dashscope-tts" as const,
    mime,
    base64: buf.toString("base64"),
  };
}

/** Qwen3-TTS（含克隆音色）多模态非流式合成 */
export async function synthesizeSpeechQwenTts(
  text: string,
  voice: string,
  model?: string
) {
  const apiKey = dashscopeKey();
  if (!apiKey) throw new Error("未配置 QWEN_API_KEY，无法用千问配音");
  const ttsModel = model?.trim() || cloneTargetModel();

  const res = await fetch(
    `${DASHSCOPE_BASE}/api/v1/services/aigc/multimodal-generation/generation`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: ttsModel,
        input: {
          text: text.slice(0, 2500),
          voice,
          language_type: "Chinese",
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `Qwen TTS 失败 ${res.status}`);
  }
  const data = (await res.json()) as {
    output?: { audio?: { url?: string; data?: string } };
    message?: string;
  };
  return fetchDashScopeAudio(
    data.output?.audio?.url,
    data.output?.audio?.data || undefined,
    "audio/wav"
  );
}

/**
 * 用样本登记克隆音色（qwen-voice-enrollment，支持本地 base64，无需公网 URL）。
 * 返回的 voice 必须与 target_model 成对用于后续合成。
 */
export async function enrollVoiceDashScope(input: {
  sampleBase64: string;
  mime: string;
  preferredName?: string;
}) {
  const apiKey = dashscopeKey();
  if (!apiKey) throw new Error("未配置 QWEN_API_KEY，无法登记克隆音色");

  const mime = input.mime.includes("wav")
    ? "audio/wav"
    : input.mime.includes("mp4") || input.mime.includes("m4a")
      ? "audio/mp4"
      : "audio/mpeg";
  const preferredName = (input.preferredName || "shopvoice")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .slice(0, 16) || "shopvoice";
  const targetModel = cloneTargetModel();
  const dataUri = input.sampleBase64.startsWith("data:")
    ? input.sampleBase64
    : `data:${mime};base64,${input.sampleBase64}`;

  const res = await fetch(
    `${DASHSCOPE_BASE}/api/v1/services/audio/tts/customization`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen-voice-enrollment",
        input: {
          action: "create",
          target_model: targetModel,
          preferred_name: preferredName,
          audio: { data: dataUri },
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `声音克隆登记失败 ${res.status}`);
  }
  const data = (await res.json()) as {
    output?: {
      voice?: string;
      voice_id?: string;
      fallback_mode?: boolean;
      fallback_reason?: string;
    };
    message?: string;
  };
  const voice = data.output?.voice || data.output?.voice_id || "";
  if (!voice) {
    throw new Error(data.message || "声音克隆登记成功但未返回 voice id");
  }
  return {
    voice,
    targetModel,
    fallbackMode: Boolean(data.output?.fallback_mode),
    fallbackReason: data.output?.fallback_reason || "",
  };
}

/** CosyVoice / Qwen-Audio-TTS 非流式配音 */
export async function synthesizeSpeechDashScope(text: string, voice?: string) {
  const apiKey = dashscopeKey();
  if (!apiKey) throw new Error("未配置 QWEN_API_KEY，无法用千问配音");

  const model =
    process.env.DASHSCOPE_TTS_MODEL?.trim() || "cosyvoice-v2";
  const voiceId =
    voice ||
    process.env.DASHSCOPE_TTS_VOICE?.trim() ||
    "longxiaochun_v2";

  const res = await fetch(
    `${DASHSCOPE_BASE}/api/v1/services/audio/tts/SpeechSynthesizer`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        input: {
          text: text.slice(0, 2500),
          voice: voiceId,
          format: "mp3",
          sample_rate: 22050,
        },
      }),
    }
  );
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `DashScope 配音失败 ${res.status}`);
  }
  const data = (await res.json()) as {
    output?: { audio?: { url?: string; data?: string } };
    message?: string;
  };
  return fetchDashScopeAudio(
    data.output?.audio?.url,
    data.output?.audio?.data || undefined,
    "audio/mpeg"
  );
}

function guessAudioMime(filename: string) {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".wav")) return "audio/wav";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".m4a")) return "audio/mp4";
  if (lower.endsWith(".ogg")) return "audio/ogg";
  if (lower.endsWith(".webm")) return "audio/webm";
  return "audio/mpeg";
}

/** Qwen3-ASR：本地文件转写（不依赖 Docker Whisper） */
export async function transcribeAudioDashScope(file: Blob, filename: string) {
  const apiKey = dashscopeKey();
  if (!apiKey) throw new Error("未配置 QWEN_API_KEY，无法用千问转写");

  const buf = Buffer.from(await file.arrayBuffer());
  if (buf.length > 8 * 1024 * 1024) {
    throw new Error("音频过大（建议压缩到 8MB 以内）后再转写");
  }
  const mime = guessAudioMime(filename);
  const dataUrl = `data:${mime};base64,${buf.toString("base64")}`;
  const model = process.env.DASHSCOPE_ASR_MODEL?.trim() || "qwen3-asr-flash";
  const compatibleBase = (
    process.env.QWEN_BASE_URL ||
    `${DASHSCOPE_BASE}/compatible-mode/v1`
  ).replace(/\/$/, "");

  const res = await fetch(`${compatibleBase}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "input_audio",
              input_audio: { data: dataUrl },
            },
          ],
        },
      ],
      stream: false,
      asr_options: { enable_itn: false },
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(detail || `DashScope 转写失败 ${res.status}`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    message?: string;
  };
  const text = data.choices?.[0]?.message?.content?.trim() || "";
  if (!text) throw new Error(data.message || "DashScope 转写未返回文字");
  return { text, provider: "dashscope-asr" };
}
