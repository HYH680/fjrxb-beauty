import { NextRequest, NextResponse } from "next/server";
import { writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import {
  renderAutoEdit,
  type CaptionSize,
  type EditAspect,
} from "@/lib/integrations/edit-engine";
import type { ClipPick, TranscriptSegment } from "@/lib/subtitle-studio";

export const maxDuration = 300;

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "请上传素材" }, { status: 400 });
  }
  const productId = String(form.get("productId") || "").trim();
  const file = form.get("file");
  if (!productId || !(file instanceof File)) {
    return NextResponse.json({ error: "需要 productId 与 file" }, { status: 400 });
  }
  const subscribed = await hasActiveSubscription(session.id, productId);
  if (!subscribed) {
    return NextResponse.json({ error: "开通这项服务后才能使用" }, { status: 403 });
  }
  if (file.size > 40 * 1024 * 1024) {
    return NextResponse.json({ error: "文件超过 40MB" }, { status: 400 });
  }

  const clips = parseJson<ClipPick[]>(form.get("clips"), []).filter(
    (clip) =>
      Number.isFinite(clip.start) &&
      Number.isFinite(clip.end) &&
      clip.end > clip.start
  );
  if (!clips.length) {
    return NextResponse.json({ error: "先选出可剪片段，并打开要用的镜头" }, { status: 400 });
  }
  const segments = parseJson<TranscriptSegment[]>(form.get("segments"), []);
  const aspectRaw = String(form.get("aspect") || "9:16");
  const aspect: EditAspect =
    aspectRaw === "16:9" || aspectRaw === "1:1" ? aspectRaw : "9:16";
  const durationCap = Number(form.get("durationCap")) || 30;
  const burnCaptions = String(form.get("burnCaptions") || "1") !== "0";
  const captionSize: CaptionSize =
    String(form.get("captionSize") || "large") === "normal" ? "normal" : "large";

  const ext = path.extname(file.name || "").slice(0, 8) || ".mp4";
  const sourcePath = path.join(
    tmpdir(),
    `ais-src-${session.id.slice(0, 8)}-${Date.now()}${ext}`
  );
  await writeFile(sourcePath, Buffer.from(await file.arrayBuffer()));

  try {
    const { outputPath, cleanup } = await renderAutoEdit({
      sourcePath,
      clips,
      segments,
      aspect,
      durationCap,
      burnCaptions,
      captionSize,
    });
    const buf = await readFile(outputPath);
    await cleanup();
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": "video/mp4",
        "Content-Disposition": 'attachment; filename="auto-edit.mp4"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "站内出片失败" },
      { status: 400 }
    );
  } finally {
    await rm(sourcePath, { force: true }).catch(() => undefined);
  }
}
