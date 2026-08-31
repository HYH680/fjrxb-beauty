import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { getAvatarUploadDir, sanitizeAvatarFilename } from "@/lib/avatars-server";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ file: string }> }
) {
  const { file: raw } = await context.params;
  const filename = sanitizeAvatarFilename(raw);
  if (!filename) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const root = path.resolve(getAvatarUploadDir());
  const resolved = path.resolve(path.join(root, filename));
  if (!resolved.startsWith(root + path.sep) && resolved !== root) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await stat(resolved);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const buf = await readFile(resolved);
  const ext = path.extname(filename).toLowerCase();
  const contentType =
    ext === ".png"
      ? "image/png"
      : ext === ".webp"
        ? "image/webp"
        : "image/jpeg";

  return new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400, immutable",
    },
  });
}
