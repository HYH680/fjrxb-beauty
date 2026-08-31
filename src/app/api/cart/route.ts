import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { cartSchema, firstZodError } from "@/lib/validation";
import {
  cartItemsFromIds,
  getUserCartIds,
  replaceUserCart,
} from "@/lib/cart";

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const productIds = await getUserCartIds(session.id);
    return NextResponse.json({
      productIds,
      items: await cartItemsFromIds(productIds),
    });
  } catch {
    return NextResponse.json({ error: "读取服务单失败" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = cartSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
    }

    const productIds = await replaceUserCart(session.id, parsed.data.productIds);
    return NextResponse.json({
      productIds,
      items: await cartItemsFromIds(productIds),
    });
  } catch {
    return NextResponse.json({ error: "同步服务单失败" }, { status: 500 });
  }
}
