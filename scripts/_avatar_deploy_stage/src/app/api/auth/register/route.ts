import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { accountRole } from "@/lib/admin";
import { createSession, hashPassword } from "@/lib/auth";
import { registerSchema, firstZodError } from "@/lib/validation";
import {
  defaultAvatarUrlForUserId,
  isPresetAvatarUrl,
  resolveAvatarUrl,
} from "@/lib/avatars";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const { name, email, password, avatarUrl: requestedAvatar } = parsed.data;
    const normalizedEmail = email.toLowerCase();

    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      return NextResponse.json(
        { error: "???????" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);

    const user = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: accountRole(normalizedEmail),
        avatarUrl:
          requestedAvatar && isPresetAvatarUrl(requestedAvatar)
            ? requestedAvatar
            : null,
      },
    });

    const avatarUrl =
      user.avatarUrl && isPresetAvatarUrl(user.avatarUrl)
        ? user.avatarUrl
        : defaultAvatarUrlForUserId(user.id);

    const withAvatar =
      user.avatarUrl === avatarUrl
        ? user
        : await prisma.user.update({
            where: { id: user.id },
            data: { avatarUrl },
          });

    await createSession({
      id: withAvatar.id,
      email: withAvatar.email,
      name: withAvatar.name,
      epoch: withAvatar.sessionEpoch,
    });

    return NextResponse.json({
      user: {
        id: withAvatar.id,
        email: withAvatar.email,
        name: withAvatar.name,
        avatarUrl: resolveAvatarUrl(withAvatar.avatarUrl, withAvatar.id),
      },
    });
  } catch (error) {
    console.error("[auth/register]", error);
    return NextResponse.json(
      { error: "??????????" },
      { status: 500 }
    );
  }
}
