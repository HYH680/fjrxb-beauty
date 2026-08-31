import type { TranscriptSegment, ClipPick } from "@/lib/subtitle-studio";

export type CapcutMateCreateDraftBody = {
  width: number;
  height: number;
};

export type CapcutMateCaption = {
  text: string;
  start: number; // microseconds
  end: number; // microseconds
};

export type CapcutMateCaptionStyle = {
  // 仅保留最常用字段；capcut-mate 接口支持更多样式参数（可后续补全）。
  font_size?: number;
  color?: string;
  has_shadow?: boolean;
  shadow_alpha?: number;
};

export function secondsToMicroseconds(seconds: number) {
  const s = Number(seconds);
  if (!Number.isFinite(s)) return 0;
  return Math.max(0, Math.round(s * 1_000_000));
}

export function buildCapcutMateCaptions(
  segments: TranscriptSegment[],
  style?: CapcutMateCaptionStyle
): { captions: CapcutMateCaption[]; style?: CapcutMateCaptionStyle } {
  const captions: CapcutMateCaption[] = segments
    .filter((seg) => seg.text.trim().length > 0)
    .map((seg) => ({
      text: seg.text.trim(),
      start: secondsToMicroseconds(seg.start),
      end: secondsToMicroseconds(seg.end),
    }))
    .filter((c) => c.end > c.start);

  return { captions, style };
}

/**
 * 把现有站内编辑结果转换成 capcut-mate 关键请求体（PoC 用）。
 * 注意：capcut-mate 的 add_videos 需要真实 video_url（我们目前只有本地上传文件）。
 */
export function buildCapcutMateRequestPayload(input: {
  width: number;
  height: number;
  segments: TranscriptSegment[];
  clips: ClipPick[];
  // auto-edit-plan 生成的草稿结构（用于后续“镜头顺序/封面/文案”扩展）
  autoEditPlan?: unknown;
}) {
  const createDraftBody: CapcutMateCreateDraftBody = {
    width: input.width,
    height: input.height,
  };

  const { captions, style } = buildCapcutMateCaptions(input.segments);

  return {
    createDraftBody,
    addCaptionsBody: {
      // capcut-mate 的文档里 captions 通常是“JSON string”，不是嵌套对象。
      captions: JSON.stringify(captions),
      ...(style ? { style } : {}),
      // PoC：先不落样式细节（后续可补 color/字号/阴影等）
    },
    warnings: [
      "PoC：目前只生成 create_draft + add_captions 的 payload；未生成 add_videos，因为站内上传文件没有 video_url。",
      "后续接入：需要把上传文件落到可公网访问的 URL，或让 capcut-mate 支持本地文件上传/回传。",
    ],
    // 保留 clips / autoEditPlan，方便你后续扩展镜头与素材映射
    meta: {
      clipsCount: input.clips.length,
    },
  };
}

