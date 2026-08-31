import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getCatalogProduct } from "@/lib/catalog";
import { SKU_ALIASES } from "@/lib/sku-aliases";
import { productCopyEn } from "@/lib/i18n/product-en";
import { catalogToolHref } from "@/lib/unified-catalog";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const aliasTo = SKU_ALIASES[id];
  const product = await getCatalogProduct(aliasTo || id);
  if (!product) {
    return { title: "Service not found" };
  }
  const en = productCopyEn(product.id);
  return {
    title: en?.name || product.name,
    description: en?.description || product.description,
    alternates: { canonical: catalogToolHref(product.id) },
  };
}

export default async function ProductDetailPage({ params }: Props) {
  const { id } = await params;
  const aliasTo = SKU_ALIASES[id];
  const product = await getCatalogProduct(aliasTo || id);
  if (!product) notFound();
  permanentRedirect(catalogToolHref(product.id));
}
