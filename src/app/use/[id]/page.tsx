import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { ServiceOpsDesk } from "@/components/ReviewOpsDesk";
import { SKU_ALIASES } from "@/lib/sku-aliases";
import { getCatalogProduct } from "@/lib/catalog";
import { getSession } from "@/lib/auth";
import { getActiveSubscription } from "@/lib/subscriptions";
import { getServiceBrief } from "@/lib/service-briefs";
import { catalogRecommendForProduct } from "@/lib/model-catalog";
import { getProductModelLabel } from "@/lib/model-router";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getCatalogProduct(id, { includeHidden: true });
  if (!product) {
    return { title: "服务不存在" };
  }
  return {
    title: `${product.name} 工作台`,
    description: `使用已开通的 ${product.name}`,
  };
}

export default async function UseProductPage({ params }: Props) {
  const { id } = await params;
  const session = await getSession();
  if (!session) {
    redirect(`/login?callbackUrl=${encodeURIComponent(`/use/${id}`)}`);
  }

  const aliasTo = SKU_ALIASES[id];
  if (aliasTo) {
    const oldSub = await getActiveSubscription(session.id, id);
    if (!oldSub) {
      redirect(`/tools/${aliasTo}`);
    }
  }

  const product = await getCatalogProduct(id, { includeHidden: true });
  if (!product) notFound();

  const subscription = await getActiveSubscription(session.id, product.id);
  if (!subscription) {
    redirect(`/tools/${product.id}`);
  }

  const brief = getServiceBrief(product.id);
  const recommend = catalogRecommendForProduct(product);
  const liveLabel = getProductModelLabel(product);
  const subtitle =
    brief.kind === "vision-run"
      ? "左侧发图或 PDF，说清要盯的点即可。"
      : brief.kind === "cs-ops"
        ? "把顾客消息贴到左侧，按店铺口吻起草回复。"
        : brief.kind === "review-ops"
          ? "贴评价可先起草；要自动拉评需开放平台凭证。"
          : "把资料发到左侧对话框，直接开工。";

  return (
    <div className="flex min-h-svh flex-col bg-[#0b0d10] text-zinc-100 lg:h-svh lg:overflow-hidden">
      <Header />
      <div className="mx-auto flex w-full max-w-[1600px] flex-1 flex-col px-4 pb-4 pt-3 sm:px-6 lg:min-h-0 lg:px-8">
        <div className="mb-3 flex shrink-0 flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className="text-lg font-semibold tracking-tight text-zinc-100 sm:text-xl">
            {product.name}
          </h1>
          <p className="text-sm text-zinc-500">{subtitle}</p>
          <p className="w-full text-[11px] text-zinc-600 sm:ml-auto sm:w-auto">
            {liveLabel || recommend.autoHint}
            {recommend.fallbackLabel ? ` · 备选 ${recommend.fallbackLabel}` : ""}
          </p>
        </div>
        <ServiceOpsDesk productId={product.id} />
      </div>
    </div>
  );
}
