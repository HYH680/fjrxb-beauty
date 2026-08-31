import type { Product } from "@/types";
import {
  resolveDelivery,
  sceneForProduct,
  shelfActionHref,
  type DeliveryStatus,
  type SceneId,
} from "@/lib/product-meta";

export type CatalogFacade = "discover" | "capability" | "shelf";

/** Public catalog detail URL (canonical). `/products/[id]` 301s here. */
export function catalogToolHref(productId: string) {
  return `/tools/${productId}`;
}

export type UnifiedCatalogItem = {
  product: Product;
  scene: SceneId;
  discovery: {
    detailHref: string;
    officialUrl?: string;
    monthlyVisits?: number;
    rating?: number;
    listedAt?: string;
  };
  capability: {
    available: boolean;
    delivery: DeliveryStatus;
    workspaceHref: string;
    provider: string;
    model?: string;
    apiAvailable: boolean;
    freeQuota?: string;
  };
  commerce: {
    sku: string;
    available: boolean;
    price: number;
    unit: string;
  };
};

/**
 * One Catalog adapter.
 *
 * Optional discovery/trust fields stay absent until they come from verified
 * sources. This prevents the UI from presenting invented traffic, ratings,
 * official status, free quota, or external links.
 */
export function toUnifiedCatalogItem(product: Product): UnifiedCatalogItem {
  const delivery = resolveDelivery(product);
  return {
    product,
    scene: sceneForProduct(product),
    discovery: {
      detailHref: catalogToolHref(product.id),
    },
    capability: {
      available: delivery === "live",
      delivery,
      workspaceHref: shelfActionHref(product.id, delivery, product.badge),
      provider: product.provider,
      model: product.runtime?.model,
      apiAvailable: delivery === "live",
    },
    commerce: {
      sku: product.id,
      available: product.published !== false,
      price: product.price,
      unit: product.unit,
    },
  };
}

export function supportsFacade(product: Product, facade: CatalogFacade) {
  if (facade !== "capability") return true;
  return toUnifiedCatalogItem(product).capability.available;
}
