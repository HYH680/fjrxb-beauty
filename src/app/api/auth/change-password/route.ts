import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession, hashPassword, verifyPassword } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { changePasswordSchema, firstZodError } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });
    if (!user) {
      return NextResponse.json({ error: "账户不存在" }, { status: 404 });
    }

    const ok = await verifyPassword(parsed.data.currentPassword, user.password);
    if (!ok) {
      return NextResponse.json({ error: "当前密码不正确" }, { status: 400 });
    }

    const next = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(parsed.data.password),
        sessionEpoch: { increment: 1 },
      },
      select: { id: true, email: true, name: true, sessionEpoch: true },
    });

    await createSession({
      id: next.id,
      email: next.email,
      name: next.name,
      epoch: next.sessionEpoch,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "修改密码失败，请稍后重试" }, { status: 500 });
  }
}
