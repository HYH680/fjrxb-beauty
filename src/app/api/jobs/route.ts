import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isDeveloperEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { enqueueJob, processDueJobs } from "@/lib/integrations/jobs";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const productId = request.nextUrl.searchParams.get("productId")?.trim() || "";
  const items = await prisma.job.findMany({
    where: {
      userId: session.id,
      ...(productId ? { productId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const action = typeof body.action === "string" ? body.action : "enqueue";

  if (action === "process") {
    const secret = request.headers.get("x-jobs-secret");
    const expected = process.env.JOBS_PROCESS_SECRET?.trim();
    const allowed =
      (expected && secret === expected) ||
      isDeveloperEmail(session.email);
    if (!allowed) {
      return NextResponse.json({ error: "无权触发任务处理" }, { status: 403 });
    }
    const results = await processDueJobs(Number(body.limit) || 20);
    return NextResponse.json({ ok: true, results });
  }

  const type = typeof body.type === "string" ? body.type.trim() : "";
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  if (!type) {
    return NextResponse.json({ error: "需要 type" }, { status: 400 });
  }

  const runAt =
    typeof body.runAt === "string" && body.runAt
      ? new Date(body.runAt)
      : new Date();

  const job = await enqueueJob({
    userId: session.id,
    productId,
    type,
    payload: {
      ...(typeof body.payload === "object" && body.payload ? body.payload : {}),
      email: session.email,
    },
    runAt: Number.isNaN(runAt.getTime()) ? new Date() : runAt,
  });

  return NextResponse.json({ ok: true, job });
}
