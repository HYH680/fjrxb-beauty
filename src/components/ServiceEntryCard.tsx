import type { Product } from "@/types";
import { ShelfCard } from "./ShelfCard";

/** 落地货架入口：与目录同一套分区色条 */
export function ServiceEntryCard({ product }: { product: Product }) {
  return <ShelfCard product={product} compact showActions={false} />;
}
