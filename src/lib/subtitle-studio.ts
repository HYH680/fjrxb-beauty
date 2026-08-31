export type TranscriptSegment = {
  start: number;
  end: number;
  text: string;
};

export type ClipPick = {
  start: number;
  end: number;
  reason: string;
  quote: string;
};

export const SUBTITLE_LANGS = [
  { id: "source", label: "保留原文" },
  { id: "zh", label: "中文" },
  { id: "en", label: "English" },
  { id: "ja", label: "日本語" },
  { id: "ko", label: "한국어" },
] as const;

export type SubtitleLangId = (typeof SUBTITLE_LANGS)[number]["id"];

export function formatTimestamp(seconds: number, vtt = false) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const ms = Math.round((safe - Math.floor(safe)) * 1000);
  const sep = vtt ? "." : ",";
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms).padStart(3, "0")}`;
}

export function formatClock(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function toSrt(segments: TranscriptSegment[]) {
  return segments
    .map((seg, i) => {
      return `${i + 1}\n${formatTimestamp(seg.start)} --> ${formatTimestamp(seg.end)}\n${seg.text.trim()}\n`;
    })
    .join("\n");
}

export function toVtt(segments: TranscriptSegment[]) {
  const body = segments
    .map((seg) => {
      return `${formatTimestamp(seg.start, true)} --> ${formatTimestamp(seg.end, true)}\n${seg.text.trim()}\n`;
    })
    .join("\n");
  return `WEBVTT\n\n${body}`;
}

export function clipsToText(clips: ClipPick[]) {
  return clips
    .map((clip, i) => {
      return `${i + 1}. ${formatClock(clip.start)}–${formatClock(clip.end)}  ${clip.reason}\n   「${clip.quote}」`;
    })
    .join("\n");
}

function splitSentences(text: string) {
  return text
    .split(/(?<=[。！？!?；;])\s*|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** 没有官方时间轴时，按句长把全文摊到预估时长上 */
export function estimateSegments(
  text: string,
  durationSec?: number
): TranscriptSegment[] {
  const parts = splitSentences(text);
  if (parts.length === 0) return [];
  const totalChars = parts.reduce((sum, part) => sum + Math.max(part.length, 1), 0);
  const total =
    durationSec && Number.isFinite(durationSec) && durationSec > 1
      ? durationSec
      : Math.max(parts.length * 2.4, totalChars / 4);
  let cursor = 0;
  return parts.map((part) => {
    const span = (Math.max(part.length, 1) / totalChars) * total;
    const start = cursor;
    const end = cursor + Math.max(span, 1.2);
    cursor = end;
    return { start, end, text: part };
  });
}

export function normalizeSegments(
  raw: unknown,
  fallbackText: string,
  durationSec?: number
): TranscriptSegment[] {
  if (Array.isArray(raw)) {
    const parsed = raw
      .map((item) => {
        const row = item as {
          start?: number;
          end?: number;
          text?: string;
        };
        const text = String(row?.text || "").trim();
        const start = Number(row?.start);
        const end = Number(row?.end);
        if (!text || !Number.isFinite(start) || !Number.isFinite(end)) return null;
        return { start, end: Math.max(end, start + 0.4), text };
      })
      .filter((item): item is TranscriptSegment => Boolean(item));
    if (parsed.length > 0) return parsed;
  }
  return estimateSegments(fallbackText, durationSec);
}

export function parseClipPicks(raw: string, segments: TranscriptSegment[]): ClipPick[] {
  const json = raw.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const start = json.indexOf("[");
  const end = json.lastIndexOf("]");
  if (start < 0 || end <= start) return fallbackClips(segments);
  try {
    const parsed = JSON.parse(json.slice(start, end + 1)) as unknown[];
    const clips = parsed
      .map((item) => {
        const row = item as {
          start?: number | string;
          end?: number | string;
          reason?: string;
          quote?: string;
        };
        const from = parseClock(row.start);
        const to = parseClock(row.end);
        if (from == null || to == null || to <= from) return null;
        return {
          start: from,
          end: to,
          reason: String(row.reason || "可用片段").slice(0, 80),
          quote: String(row.quote || "").slice(0, 160),
        };
      })
      .filter((item): item is ClipPick => Boolean(item));
    return clips.length > 0 ? clips.slice(0, 8) : fallbackClips(segments);
  } catch {
    return fallbackClips(segments);
  }
}

function parseClock(value: number | string | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^\d+(\.\d+)?$/.test(trimmed)) return Number(trimmed);
  const parts = trimmed.split(":").map((part) => Number(part));
  if (parts.some((n) => !Number.isFinite(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return null;
}

function fallbackClips(segments: TranscriptSegment[]): ClipPick[] {
  return [...segments]
    .sort((a, b) => b.text.length - a.text.length)
    .slice(0, 5)
    .sort((a, b) => a.start - b.start)
    .map((seg) => ({
      start: seg.start,
      end: seg.end,
      reason: "较长完整句，适合切片",
      quote: seg.text.slice(0, 80),
    }));
}
