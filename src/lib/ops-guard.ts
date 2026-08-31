import { getSession, type SessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";
import { hasActiveSubscription } from "@/lib/subscriptions";

export async function requireProductOps(productId: string): Promise<
  | { session: SessionUser; productId: string; error?: undefined }
  | { session?: undefined; productId?: undefined; error: NextResponse }
> {
  const id = productId.trim();
  if (!id) {
    return { error: NextResponse.json({ error: "缺少服务" }, { status: 400 }) };
  }
  const session = await getSession();
  if (!session) {
    return { error: NextResponse.json({ error: "请先登录" }, { status: 401 }) };
  }
  if (!(await hasActiveSubscription(session.id, id))) {
    return {
      error: NextResponse.json({ error: "请先开通这项服务" }, { status: 403 }),
    };
  }
  return { session, productId: id };
}

export function productIdFrom(request: Request, body?: { productId?: string }) {
  const url = new URL(request.url);
  return String(body?.productId || url.searchParams.get("productId") || "").trim();
}
