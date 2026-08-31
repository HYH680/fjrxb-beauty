import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateResetToken } from "@/lib/auth";
import { verifyCodeSchema, firstZodError } from "@/lib/validation";

const RESET_TOKEN_EXPIRY_MINUTES = 10;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = verifyCodeSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { email, code } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    const resetRecord = await prisma.passwordResetToken.findFirst({
      where: {
        userId: user.id,
        code,
        usedAt: null,
        verifiedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!resetRecord) {
      return NextResponse.json({ error: "验证码错误或已过期" }, { status: 400 });
    }

    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(
      Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000
    );

    await prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: {
        verifiedAt: new Date(),
        resetToken,
        expiresAt: resetTokenExpiry,
      },
    });

    return NextResponse.json({
      message: "验证成功，请设置新密码",
      resetToken,
    });
  } catch {
    return NextResponse.json(
      { error: "验证失败，请稍后重试" },
      { status: 500 }
    );
  }
}
