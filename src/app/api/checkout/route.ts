import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCatalogProduct } from "@/lib/catalog";
import { canonicalSkuId } from "@/lib/sku-aliases";
import { checkoutSchema, firstZodError } from "@/lib/validation";
import { clearUserCart } from "@/lib/cart";
import { capturePayment } from "@/lib/payment";
import type { Product } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "请先登录" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const parsed = checkoutSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: firstZodError(parsed.error) },
        { status: 400 }
      );
    }

    const products: Product[] = [];
    for (const id of [...new Set(parsed.data.productIds)]) {
      const product = await getCatalogProduct(canonicalSkuId(id));
      if (product) products.push(product);
    }
    if (products.length === 0) {
      return NextResponse.json({ error: "服务单是空的" }, { status: 400 });
    }
    const amount = products.reduce((sum, product) => sum + product.price, 0);
    const paymentMethod = parsed.data.paymentMethod;

    const order = await prisma.order.create({
      data: {
        userId: session.id,
        amount,
        paymentMethod,
        status: "pending",
        items: {
          create: products.map((product) => ({
            productId: product.id,
            name: product.name,
            price: product.price,
          })),
        },
      },
    });

    const capture = await capturePayment({
      orderId: order.id,
      amount,
      paymentMethod,
      email: session.email,
    });

    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: capture.status,
          providerRef: capture.providerRef,
        },
      });
      for (const product of products) {
        await tx.subscription.upsert({
          where: {
            userId_productId: { userId: session.id, productId: product.id },
          },
          create: {
            userId: session.id,
            productId: product.id,
            status: "active",
            paymentMethod,
            orderId: order.id,
          },
          update: {
            status: "active",
            paymentMethod,
            orderId: order.id,
          },
        });
      }
    });

    await clearUserCart(session.id);

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      amount,
      paymentMethod,
      status: capture.status,
      providerRef: capture.providerRef,
      count: products.length,
    });
  } catch (error) {
    const message =
      error instanceof Error &&
      (error.message === "正式收款通道尚未配置（微信/支付宝）" ||
        error.message.includes("测试收款") ||
        error.message.includes("Stripe") ||
        error.message.includes("正式收款"))
        ? error.message
        : "支付提交失败，请稍后重试";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
