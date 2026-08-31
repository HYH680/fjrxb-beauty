import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { hasActiveSubscription } from "@/lib/subscriptions";
import { extractDocumentText } from "@/lib/integrations/doc-extract";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) {
    return NextResponse.json({ error: "请上传文件" }, { status: 400 });
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

  const name = file.name || "document.pdf";
  if (!/\.pdf$/i.test(name) && file.type !== "application/pdf") {
    return NextResponse.json({ error: "目前仅支持 PDF 抽字" }, { status: 400 });
  }
  if (file.size > 15 * 1024 * 1024) {
    return NextResponse.json({ error: "PDF 超过 15MB" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  try {
    const result = await extractDocumentText(bytes, name);
    if (!result.text.trim()) {
      return NextResponse.json(
        { error: "未能抽出文字。可改用拍照或换可复制文本的 PDF。" },
        { status: 422 }
      );
    }
    return NextResponse.json({
      ok: true,
      text: result.text,
      pages: result.pages,
      engine: result.engine,
      name,
    });
  } catch {
    return NextResponse.json({ error: "文档解析失败" }, { status: 500 });
  }
}
