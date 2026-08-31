/**
 * 本站自动剪辑引擎：ffmpeg 切片拼接 + 烧录字幕。
 * 不依赖剪映 / CapCut Mate；Mate 只是可选协同出口。
 */
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync } from "node:fs";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import type { ClipPick, TranscriptSegment } from "@/lib/subtitle-studio";

const VENDOR_FFMPEG = path.join(process.cwd(), "vendor", "ffmpeg", "ffmpeg.exe");
const PACKED_FFMPEG = path.join(
  process.cwd(),
  "node_modules",
  "ffmpeg-static",
  process.platform === "win32" ? "ffmpeg.exe" : "ffmpeg"
);
const FFMPEG_GZ =
  "https://github.com/eugeneware/ffmpeg-static/releases/download/b6.1.1/ffmpeg-win32-x64.gz";

export type EditAspect = "9:16" | "16:9" | "1:1";
export type CaptionSize = "normal" | "large";

export type EditRenderInput = {
  sourcePath: string;
  clips: ClipPick[];
  segments: TranscriptSegment[];
  aspect?: EditAspect;
  durationCap?: number;
  burnCaptions?: boolean;
  captionSize?: CaptionSize;
};

function binCandidates() {
  const extra = (process.env.FFMPEG_PATH || "").trim();
  return [
    extra,
    PACKED_FFMPEG,
    VENDOR_FFMPEG,
    path.join(process.cwd(), "vendor", "ffmpeg", "ffmpeg"),
    "ffmpeg",
  ].filter(Boolean);
}

function run(cmd: string, args: string[], cwd?: string) {
  return new Promise<{ code: number; stderr: string }>((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd,
      windowsHide: true,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
      if (stderr.length > 12_000) stderr = stderr.slice(-8_000);
    });
    child.on("error", reject);
    child.on("close", (code) => resolve({ code: code ?? 1, stderr }));
  });
}

async function probeBin(bin: string) {
  try {
    const { code } = await run(bin, ["-version"]);
    return code === 0;
  } catch {
    return false;
  }
}

let cachedBin: string | null | undefined;

export async function resolveFfmpegBin(): Promise<string | null> {
  if (cachedBin !== undefined) return cachedBin;
  for (const cand of binCandidates()) {
    if (cand !== "ffmpeg" && !existsSync(cand)) continue;
    if (await probeBin(cand)) {
      cachedBin = cand;
      return cand;
    }
  }
  cachedBin = null;
  return null;
}

export function editEngineEnabled() {
  return binCandidates()
    .filter((cand) => cand !== "ffmpeg")
    .some((cand) => existsSync(cand));
}

export async function ensureFfmpegBin(): Promise<string> {
  const existing = await resolveFfmpegBin();
  if (existing) return existing;
  if (process.platform !== "win32") {
    throw new Error("未找到 ffmpeg。请安装 ffmpeg 并加入 PATH，或设置 FFMPEG_PATH。");
  }
  mkdirSync(path.dirname(VENDOR_FFMPEG), { recursive: true });
  const res = await fetch(FFMPEG_GZ, { redirect: "follow" });
  if (!res.ok || !res.body) {
    throw new Error(`下载 ffmpeg 失败 HTTP ${res.status}`);
  }
  const out = createWriteStream(VENDOR_FFMPEG);
  await pipeline(Readable.fromWeb(res.body as never), createGunzip(), out);
  cachedBin = undefined;
  const bin = await resolveFfmpegBin();
  if (!bin) throw new Error("ffmpeg 已下载但无法运行");
  return bin;
}

function frameSize(aspect: EditAspect) {
  if (aspect === "16:9") return { w: 1920, h: 1080 };
  if (aspect === "1:1") return { w: 1080, h: 1080 };
  return { w: 1080, h: 1920 };
}

function assTime(seconds: number) {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const cs = Math.round((safe - Math.floor(safe)) * 100);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(cs).padStart(2, "0")}`;
}

function escapeAss(text: string) {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\n/g, "\\N");
}

function remapCaptions(
  clips: ClipPick[],
  segments: TranscriptSegment[]
): { start: number; end: number; text: string }[] {
  const out: { start: number; end: number; text: string }[] = [];
  let cursor = 0;
  for (const clip of clips) {
    const span = Math.max(0.2, clip.end - clip.start);
    for (const seg of segments) {
      const start = Math.max(seg.start, clip.start);
      const end = Math.min(seg.end, clip.end);
      if (end - start < 0.15) continue;
      const text = seg.text.trim();
      if (!text) continue;
      out.push({
        start: cursor + (start - clip.start),
        end: cursor + (end - clip.start),
        text,
      });
    }
    cursor += span;
  }
  return out;
}

function buildAss(
  events: { start: number; end: number; text: string }[],
  size: { w: number; h: number },
  captionSize: CaptionSize
) {
  const font = captionSize === "large" ? 72 : 54;
  const margin = captionSize === "large" ? 96 : 72;
  const lines = [
    "[Script Info]",
    "ScriptType: v4.00+",
    `PlayResX: ${size.w}`,
    `PlayResY: ${size.h}`,
    "WrapStyle: 0",
    "",
    "[V4+ Styles]",
    "Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding",
    `Style: Default,Microsoft YaHei,${font},&H00FFFFFF,&H000000FF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,3,1,2,48,48,${margin},1`,
    "",
    "[Events]",
    "Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text",
    ...events.map(
      (ev) =>
        `Dialogue: 0,${assTime(ev.start)},${assTime(ev.end)},Default,,0,0,0,,${escapeAss(ev.text)}`
    ),
  ];
  return lines.join("\n");
}

export async function renderAutoEdit(
  input: EditRenderInput
): Promise<{ outputPath: string; cleanup: () => Promise<void> }> {
  const bin = await ensureFfmpegBin();
  const clips = input.clips
    .filter((c) => Number.isFinite(c.start) && Number.isFinite(c.end) && c.end > c.start)
    .slice(0, 12);
  if (!clips.length) throw new Error("没有可剪片段");
  if (!existsSync(input.sourcePath)) throw new Error("找不到上传的素材");

  const aspect = input.aspect || "9:16";
  const size = frameSize(aspect);
  const workDir = await mkdtemp(path.join(tmpdir(), "ais-edit-"));
  const cleanup = async () => {
    await rm(workDir, { recursive: true, force: true });
  };

  try {
    const vf = `scale=${size.w}:${size.h}:force_original_aspect_ratio=decrease,pad=${size.w}:${size.h}:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p`;
    const parts: string[] = [];
    for (const [i, clip] of clips.entries()) {
      const dur = Math.max(0.2, clip.end - clip.start);
      const part = path.join(workDir, `p${i}.mp4`);
      const cut = await run(bin, [
        "-y",
        "-ss",
        clip.start.toFixed(3),
        "-i",
        input.sourcePath,
        "-t",
        dur.toFixed(3),
        "-vf",
        vf,
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-crf",
        "23",
        "-c:a",
        "aac",
        "-ar",
        "44100",
        "-ac",
        "2",
        "-movflags",
        "+faststart",
        part,
      ]);
      if (cut.code !== 0) {
        const fallback = await run(bin, [
          "-y",
          "-f",
          "lavfi",
          "-i",
          `color=c=0x0b0d10:s=${size.w}x${size.h}:d=${dur.toFixed(3)}`,
          "-ss",
          clip.start.toFixed(3),
          "-i",
          input.sourcePath,
          "-t",
          dur.toFixed(3),
          "-map",
          "0:v:0",
          "-map",
          "1:a:0?",
          "-c:v",
          "libx264",
          "-preset",
          "veryfast",
          "-crf",
          "23",
          "-c:a",
          "aac",
          "-shortest",
          part,
        ]);
        if (fallback.code !== 0) {
          throw new Error(cut.stderr.slice(-400) || "切片失败");
        }
      }
      parts.push(part);
    }

    const listPath = path.join(workDir, "list.txt");
    await writeFile(
      listPath,
      parts.map((p) => `file '${p.replace(/\\/g, "/").replace(/'/g, "'\\''")}'`).join("\n")
    );
    const concatPath = path.join(workDir, "concat.mp4");
    const concat = await run(bin, [
      "-y",
      "-f",
      "concat",
      "-safe",
      "0",
      "-i",
      listPath,
      "-c",
      "copy",
      concatPath,
    ]);
    if (concat.code !== 0) {
      throw new Error(concat.stderr.slice(-400) || "拼接失败");
    }

    const outputPath = path.join(workDir, "output.mp4");
    const cap = input.durationCap && input.durationCap > 1 ? input.durationCap : undefined;
    const burn = input.burnCaptions !== false;
    const args = ["-y", "-i", concatPath];
    if (burn && input.segments.length > 0) {
      const events = remapCaptions(clips, input.segments);
      await writeFile(
        path.join(workDir, "subs.ass"),
        buildAss(events, size, input.captionSize || "large"),
        "utf8"
      );
      args.push("-vf", "subtitles=subs.ass");
    }
    if (cap) args.push("-t", String(cap));
    args.push(
      "-c:v",
      "libx264",
      "-preset",
      "veryfast",
      "-crf",
      "23",
      "-c:a",
      "aac",
      "-movflags",
      "+faststart",
      outputPath
    );
    const burnRes = await run(bin, args, workDir);
    if (burnRes.code !== 0) {
      throw new Error(burnRes.stderr.slice(-400) || "烧录字幕失败");
    }
    return { outputPath, cleanup };
  } catch (error) {
    await cleanup();
    throw error;
  }
}
