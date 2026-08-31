import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVerificationCode } from "@/lib/auth";
import { forgotPasswordSchema, firstZodError } from "@/lib/validation";
import {
  isPasswordResetOpen,
  sendVerificationEmail,
} from "@/lib/email";

const CODE_EXPIRY_MINUTES = 15;

export async function GET() {
  return NextResponse.json({
    open: isPasswordResetOpen(),
    message: isPasswordResetOpen()
      ? "可通过邮箱验证码重置密码"
      : "密码重置邮件通道尚未开通，请联系站点管理员。",
  });
}

export async function POST(request: NextRequest) {
  try {
    if (!isPasswordResetOpen()) {
      return NextResponse.json(
        {
          error: "密码重置邮件通道尚未开通。若确需重置，请联系站点管理员。",
        },
        { status: 503 }
      );
    }

    const body = await request.json();
    const parsed = forgotPasswordSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const normalizedEmail = parsed.data.email.toLowerCase();

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    // 不暴露邮箱是否存在
    if (!user) {
      return NextResponse.json({
        message: "如果该邮箱已注册，验证码将发送到您的邮箱",
      });
    }

    await prisma.passwordResetToken.deleteMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
    });

    const code = generateVerificationCode();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * 60 * 1000);

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        code,
        expiresAt,
      },
    });

    const { delivered, channel } = await sendVerificationEmail(
      normalizedEmail,
      code
    );

    if (!delivered) {
      return NextResponse.json(
        {
          error: "密码重置邮件通道尚未开通。若确需重置，请联系站点管理员。",
        },
        { status: 503 }
      );
    }

    return NextResponse.json({
      message:
        channel === "console"
          ? "开发环境未配置发信，验证码已写入服务器日志；下方可直接使用本次验证码。"
          : "如果该邮箱已注册，验证码将发送到您的邮箱",
      ...(process.env.NODE_ENV === "development" && channel === "console"
        ? { devCode: code }
        : {}),
    });
  } catch {
    return NextResponse.json(
      { error: "发送验证码失败，请稍后重试" },
      { status: 500 }
    );
  }
}
