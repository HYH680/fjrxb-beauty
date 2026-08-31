/** 沙盒当场入账。正式商户凭证到位后，在这里换成微信/支付宝/PayPal/银行卡/Stripe 通道。 */

export const PAYMENT_METHODS = [
  { id: "sandbox", label: "测试开通（不扣款）" },
] as const;

export type PaymentMethodId = (typeof PAYMENT_METHODS)[number]["id"] | "wechat" | "alipay" | "paypal" | "card" | "stripe";

const labels: Record<string, string> = {
  sandbox: "测试开通（不扣款）",
  wechat: "微信支付",
  alipay: "支付宝",
  paypal: "PayPal",
  card: "银行卡",
  stripe: "Stripe",
  developer: "开发者",
};

export function isPaymentMethodId(value: string): value is PaymentMethodId {
  return (
    value === "sandbox" ||
    value === "wechat" ||
    value === "alipay" ||
    value === "paypal" ||
    value === "card" ||
    value === "stripe"
  );
}

export function paymentMethodLabel(id: string | null | undefined): string {
  if (id && labels[id]) return labels[id];
  if (id && isPaymentMethodId(id)) return labels[id];
  return "未选择";
}

export type PaymentMode = "sandbox" | "live";

export function getPaymentMode(): PaymentMode {
  return process.env.PAYMENT_MODE === "live" ? "live" : "sandbox";
}

/** 生产默认禁止沙盒开通；开发者或显式 ALLOW_SANDBOX_CHECKOUT=true 例外 */
export function sandboxCheckoutAllowed(email?: string | null) {
  if (getPaymentMode() === "live") return false;
  if (process.env.ALLOW_SANDBOX_CHECKOUT === "true") return true;
  if (process.env.NODE_ENV !== "production") return true;
  const developer = (process.env.DEVELOPER_EMAIL || "2028391318@qq.com").toLowerCase();
  return Boolean(email && email.toLowerCase() === developer);
}

export type PaymentCapture = {
  status: "sandbox_paid" | "paid";
  providerRef: string;
};

export async function capturePayment(input: {
  orderId: string;
  amount: number;
  paymentMethod: PaymentMethodId;
  email?: string | null;
}): Promise<PaymentCapture> {
  const mode = getPaymentMode();

  if (mode === "sandbox") {
    if (!sandboxCheckoutAllowed(input.email)) {
      throw new Error(
        "生产环境没有正式收款。普通人开不了真微信支付；只有本机或开发者邮箱能走测试开通（不扣款）。"
      );
    }
    return {
      status: "sandbox_paid",
      providerRef: `sandbox_${input.paymentMethod}_${input.orderId}`,
    };
  }

  // live: Stripe（国际卡）；国内微信/支付宝仍待商户凭证
  if (input.paymentMethod === "stripe") {
    const key = process.env.STRIPE_SECRET_KEY?.trim();
    if (!key) throw new Error("未配置 STRIPE_SECRET_KEY");
    // 轻量 PaymentIntent 占位：真实收银台需前端 Elements；此处标记待支付完成由 webhook 确认
    const res = await fetch("https://api.stripe.com/v1/payment_intents", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        amount: String(Math.max(1, input.amount * 100)),
        currency: process.env.STRIPE_CURRENCY || "cny",
        "metadata[orderId]": input.orderId,
        description: `AI智能体超市订单 ${input.orderId}`,
      }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      throw new Error(detail || "Stripe 下单失败");
    }
    const data = (await res.json()) as { id?: string; status?: string };
    if (data.status === "succeeded") {
      return { status: "paid", providerRef: data.id || `stripe_${input.orderId}` };
    }
    throw new Error(
      "Stripe PaymentIntent 已创建，需前端完成支付确认（当前未接 Elements）。"
    );
  }

  throw new Error("正式收款通道尚未配置（微信/支付宝）");
}

export function paymentStatusLabel(status: string) {
  if (status === "sandbox_paid") return "已收款（测试）";
  if (status === "paid") return "已支付";
  if (status === "failed") return "支付失败";
  return "待支付";
}
