import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resetPasswordSchema, firstZodError } from "@/lib/validation";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = resetPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { resetToken, password } = parsed.data;

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { resetToken },
      include: { user: true },
    });

    if (
      !resetRecord ||
      !resetRecord.verifiedAt ||
      resetRecord.usedAt ||
      resetRecord.expiresAt < new Date()
    ) {
      return NextResponse.json(
        { error: "重置链接无效或已过期，请重新申请" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { password: hashedPassword, sessionEpoch: { increment: 1 } },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
      prisma.passwordResetToken.deleteMany({
        where: {
          userId: resetRecord.userId,
          id: { not: resetRecord.id },
          usedAt: null,
        },
      }),
    ]);

    return NextResponse.json({
      message: "密码重置成功，请使用新密码登录",
    });
  } catch {
    return NextResponse.json(
      { error: "重置密码失败，请稍后重试" },
      { status: 500 }
    );
  }
}
