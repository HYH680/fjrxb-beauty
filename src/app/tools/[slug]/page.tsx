import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { ProductCover } from "@/components/ProductCover";
import { ProductDetailMeta } from "@/components/ProductDetailMeta";
import { ProductDetailBody } from "@/components/ProductDetailBody";
import { getCatalogProduct, listCatalog } from "@/lib/catalog";
import { productCopyEn } from "@/lib/i18n/product-en";
import { getProductModelLabel, getProductRuntimeConfig } from "@/lib/model-router";
import { resolveDelivery } from "@/lib/product-meta";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) return { title: "Service not found" };
  const en = productCopyEn(product.id);
  return {
    title: en?.name || product.name,
    description: en?.description || product.description,
    alternates: { canonical: `/tools/${product.id}` },
    openGraph: {
      title: en?.name || product.name,
      description: en?.description || product.description,
      type: "website",
      url: `/tools/${product.id}`,
    },
  };
}

export async function generateStaticParams() {
  try {
    const products = await listCatalog();
    return products.map((product) => ({ slug: product.id }));
  } catch {
    // Vercel preview may lack a durable DB during build.
    return [];
  }
}

export default async function ToolLandingPage({ params }: Props) {
  const { slug } = await params;
  const product = await getCatalogProduct(slug);
  if (!product) notFound();

  const catalog = await listCatalog();
  const related = catalog
    .filter((item) => item.category === product.category && item.id !== product.id)
    .slice(0, 3);
  const delivery = resolveDelivery(product);
  const liveLabel = getProductModelLabel(product);
  const live = Boolean(getProductRuntimeConfig(product));
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL || "https://fjrxb.beauty"
  ).replace(/\/$/, "");
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: product.name,
    description: product.description,
    provider: {
      "@type": "Organization",
      name: product.provider,
    },
    offers: {
      "@type": "Offer",
      priceCurrency: "CNY",
      price: product.price,
      availability:
        product.published !== false
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      url: `${siteUrl}/tools/${product.id}`,
    },
  };

  return (
    <div className="min-h-screen bg-[#0b0d10] text-zinc-100">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c"),
        }}
      />
      <Header />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <div className="mt-8 overflow-hidden rounded-2xl border border-white/10">
          <ProductCover product={product} priority className="rounded-none" />
        </div>
        <ProductDetailMeta product={product} />
        <ProductDetailBody
          product={product}
          live={live}
          liveLabel={liveLabel || ""}
          delivery={delivery}
          related={related}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
