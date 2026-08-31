import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminAccount, isDeveloperEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { resolveAvatarUrl } from "@/lib/avatars";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ user: null });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      industry: true,
      occupation: true,
      avatarUrl: true,
    },
  });

  if (!user) {
    return NextResponse.json({ user: null });
  }

  let avatarUrl = resolveAvatarUrl(user.avatarUrl, user.id);
  if (!user.avatarUrl) {
    try {
      await prisma.user.update({
        where: { id: user.id },
        data: { avatarUrl },
      });
    } catch {
      /* mid-migrate */
    }
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      industry: user.industry,
      occupation: user.occupation,
      avatarUrl,
      isAdmin: isAdminAccount(user.email),
      isDeveloper: isDeveloperEmail(user.email),
    },
  });
}
