import type { Product } from "@/types";
import { ShelfCard } from "./ShelfCard";

export function ProductCard({
  product,
  compact = false,
}: {
  product: Product;
  compact?: boolean;
}) {
  return <ShelfCard product={product} compact={compact} />;
}
