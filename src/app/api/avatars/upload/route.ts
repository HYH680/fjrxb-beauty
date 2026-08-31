import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AVATAR_ALLOWED_MIME, AVATAR_MAX_BYTES, AVATAR_UPLOAD_API_PREFIX } from "@/lib/avatars";
import { getAvatarUploadDir } from "@/lib/avatars-server";

function extForMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "请上传图片文件" }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少图片文件" }, { status: 400 });
  }

  if (file.size <= 0 || file.size > AVATAR_MAX_BYTES) {
    return NextResponse.json({ error: "图片须小于 2MB" }, { status: 400 });
  }

  const mime = (file.type || "").toLowerCase();
  if (!AVATAR_ALLOWED_MIME.has(mime)) {
    return NextResponse.json(
      { error: "仅支持 JPEG / PNG / WebP" },
      { status: 400 }
    );
  }

  const ext = extForMime(mime);
  if (!ext) {
    return NextResponse.json({ error: "不支持的图片格式" }, { status: 400 });
  }

  const safeUser =
    session.id.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16) || "user";
  const token = randomBytes(8).toString("hex");
  const filename = `${safeUser}-${token}.${ext}`;
  const dir = getAvatarUploadDir();
  await mkdir(dir, { recursive: true });
  await writeFile(
    path.join(dir, filename),
    Buffer.from(await file.arrayBuffer())
  );

  const avatarUrl = `${AVATAR_UPLOAD_API_PREFIX}${filename}`;
  const user = await prisma.user.update({
    where: { id: session.id },
    data: { avatarUrl },
    select: {
      id: true,
      email: true,
      name: true,
      avatarUrl: true,
      industry: true,
      occupation: true,
    },
  });

  return NextResponse.json({ user, avatarUrl: user.avatarUrl });
}
