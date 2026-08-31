import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";

/**
 * 把出图外链转成可下载的图片字节，避免浏览器跨域拦下载/复制。
 * 仅允许 http(s) 图片地址。
 */
export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("url") || "";
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return NextResponse.json({ error: "图片地址无效" }, { status: 400 });
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return NextResponse.json({ error: "仅支持 http(s) 图片" }, { status: 400 });
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: { Accept: "image/*" },
      redirect: "follow",
    });
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `拉取图片失败 ${upstream.status}` },
        { status: 400 }
      );
    }
    const type = upstream.headers.get("content-type") || "image/png";
    if (!type.startsWith("image/")) {
      return NextResponse.json({ error: "目标不是图片" }, { status: 400 });
    }
    const buf = await upstream.arrayBuffer();
    return new NextResponse(buf, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=300",
        "Content-Disposition": `attachment; filename="ai-image.${type.includes("jpeg") || type.includes("jpg") ? "jpg" : type.includes("webp") ? "webp" : "png"}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "拉取图片失败" }, { status: 400 });
  }
}
