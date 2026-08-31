import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "请先登录" }, { status: 401 });
  }

  const { industry, occupation } = await request.json();
  if (!industry || !occupation) {
    return NextResponse.json({ error: "请选择行业和职业" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: session.id },
    data: {
      industry: String(industry).slice(0, 40),
      occupation: String(occupation).slice(0, 40),
    },
    select: {
      id: true,
      email: true,
      name: true,
      industry: true,
      occupation: true,
    },
  });

  return NextResponse.json({ user });
}
