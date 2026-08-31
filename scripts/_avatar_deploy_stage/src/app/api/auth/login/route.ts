import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accountRole } from "@/lib/admin";
import { createSession, verifyPassword } from "@/lib/auth";
import { loginSchema, firstZodError } from "@/lib/validation";
import { resolveAvatarUrl } from "@/lib/avatars";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json(
        { error: "邮箱或密码错误" },
        { status: 401 }
      );
    }

    const nextRole = accountRole(user.email);
    const synced =
      user.role === nextRole
        ? user
        : await prisma.user.update({
            where: { id: user.id },
            data: { role: nextRole },
          });

    await createSession({
      id: synced.id,
      email: synced.email,
      name: synced.name,
      epoch: synced.sessionEpoch,
    });

    let avatarUrl = resolveAvatarUrl(synced.avatarUrl, synced.id);
    if (!synced.avatarUrl) {
      try {
        await prisma.user.update({
          where: { id: synced.id },
          data: { avatarUrl },
        });
      } catch {
        /* mid-migrate */
      }
    }

    return NextResponse.json({
      user: {
        id: synced.id,
        email: synced.email,
        name: synced.name,
        industry: synced.industry,
        occupation: synced.occupation,
        avatarUrl,
      },
    });
  } catch (error) {
    console.error("[auth/login]", error);
    const message =
      error instanceof Error && /AUTH_SECRET/i.test(error.message)
        ? "登录服务未配置完整，请联系管理员检查 AUTH_SECRET"
        : "登录失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
