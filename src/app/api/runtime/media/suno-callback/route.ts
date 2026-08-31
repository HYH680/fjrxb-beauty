import { NextResponse } from "next/server";

/** Suno 网关要求 callBackUrl；成曲结果以轮询为准，回调仅确认接收 */
export async function POST() {
  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true });
}
