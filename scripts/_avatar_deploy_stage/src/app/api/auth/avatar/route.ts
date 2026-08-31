import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isPresetAvatarUrl, resolveAvatarUrl } from "@/lib/avatars";
import { avatarUrlSchema, firstZodError } from "@/lib/validation";

/** Set avatar to a preset. Uploads use POST /api/avatars/upload. */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "无效请求" }, { status: 400 });
  }

  const parsed = avatarUrlSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: firstZodError(parsed.error) },
      { status: 400 }
    );
  }

  const { avatarUrl } = parsed.data;
  if (!isPresetAvatarUrl(avatarUrl)) {
    return NextResponse.json(
      { error: "请选择预设头像，或使用上传接口" },
      { status: 400 }
    );
  }

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

  return NextResponse.json({
    user: {
      ...user,
      avatarUrl: resolveAvatarUrl(user.avatarUrl, user.id),
    },
  });
}
