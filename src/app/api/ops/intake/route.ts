import { NextRequest, NextResponse } from "next/server";
import { landCustomerPacket } from "@/lib/land-shop";
import { productIdFrom, requireProductOps } from "@/lib/ops-guard";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const auth = await requireProductOps(productIdFrom(request, body));
  if (auth.error) return auth.error;
  const text = String(body.text || body.message || "").trim();
  if (!text) {
    return NextResponse.json({ error: "请把资料贴进来" }, { status: 400 });
  }
  const result = await landCustomerPacket(auth.session.id, text, auth.productId);
  return NextResponse.json({
    ok: result.ok,
    reply: result.steps.join("\n"),
    steps: result.steps,
  });
}
