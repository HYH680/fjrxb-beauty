import type { TranscriptSegment } from "@/lib/subtitle-studio";
import { buildCapcutMateCaptions } from "@/lib/integrations/capcut-mate-adapter";

function baseUrl() {
  return (process.env.CAPCUT_MATE_BASE_URL || "").trim().replace(/\/$/, "");
}

export function capcutMateEnabled() {
  return Boolean(baseUrl());
}

type CreateDraftResp = {
  draft_url?: string;
  tip_url?: string;
};

async function postJson<T>(path: string, body: Record<string, unknown>) {
  const base = baseUrl();
  if (!base) {
    throw new Error("未配置 CAPCUT_MATE_BASE_URL");
  }
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json().catch(() => ({}))) as T & {
    error?: string;
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.error || data.message || `capcut-mate ${res.status}`);
  }
  return data;
}

export async function createCapcutDraft(input: { width: number; height: number }) {
  const data = await postJson<CreateDraftResp>("/create_draft", input);
  const draftUrl = String(data.draft_url || "").trim();
  if (!draftUrl) {
    throw new Error("capcut-mate 未返回 draft_url");
  }
  return {
    draftUrl,
    tipUrl: data.tip_url || "",
  };
}

export async function addCapcutCaptions(input: {
  draftUrl: string;
  segments: TranscriptSegment[];
}) {
  const mapped = buildCapcutMateCaptions(input.segments);
  return postJson("/add_captions", {
    draft_url: input.draftUrl,
    captions: JSON.stringify(mapped.captions),
    // 默认样式：更接近短视频白字描边，后续可做工作台可调参数
    text_color: "#FFFFFF",
    has_shadow: true,
    shadow_alpha: 0.85,
    font_size: 7.2,
    // 居中底部稍上
    transform_x: 0,
    transform_y: 0.75,
  });
}

