import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { transcribeAudio } from "@/lib/integrations/media";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "请上传音视频" }, { status: 400 });
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

  const durationRaw = Number(form.get("durationSec"));
  const durationSec = Number.isFinite(durationRaw) && durationRaw > 0 ? durationRaw : undefined;

  try {
    const result = await transcribeAudio(file, file.name || "audio.webm", durationSec);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "转写失败" },
      { status: 400 }
    );
  }
}
