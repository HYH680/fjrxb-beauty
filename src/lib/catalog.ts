import { prisma } from "@/lib/prisma";
import {
  products as seedProducts,
  productImage,
  categoryCovers,
} from "@/data/products";
import { resolveDelivery, withProductMeta } from "@/lib/product-meta";
import { midjourneyChannelLive, midjourneyMediaEnabled } from "@/lib/integrations/midjourney-media";
import { sunoChannelLive, sunoMediaEnabled } from "@/lib/integrations/suno-media";
import { replicateMediaEnabled } from "@/lib/integrations/replicate-media";
import { cohereEmbedEnabled } from "@/lib/integrations/cohere-embed";
import { editEngineEnabled } from "@/lib/integrations/edit-engine";
import type { Category, Product } from "@/types";

const RUNTIME_PROVIDERS = [
  "qwen",
  "deepseek",
  "openai",
  "doubao",
  "kimi",
  "freellmapi",
  "baidu",
  "anthropic",
] as const;

function catalogTable() {
  return prisma.catalogProduct;
}

function isCategory(value: string): value is Category {
  return value in categoryCovers;
}

function parseList(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function toProduct(row: {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  category: string;
  price: number;
  unit: string;
  tags: string;
  features: string;
  provider: string;
  badge: string | null;
  pricingNote: string;
  access: string;
  runtimeProvider: string | null;
  runtimeModel: string | null;
  image: string;
  published: boolean;
}): Product | null {
  if (!isCategory(row.category)) return null;
  const runtimeProvider = RUNTIME_PROVIDERS.find(
    (item) => item === row.runtimeProvider
  );
  const runtime =
    runtimeProvider && row.runtimeModel
      ? { provider: runtimeProvider, model: row.runtimeModel }
      : undefined;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    longDescription: row.longDescription,
    category: row.category,
    price: row.price,
    unit: row.unit,
    tags: parseList(row.tags),
    features: parseList(row.features),
    provider: row.provider,
    badge: row.badge || undefined,
    pricingNote: row.pricingNote,
    access: row.access === "customer" ? "customer" : "platform",
    delivery: undefined,
    runtime,
    image: row.image || productImage({ category: row.category }),
    published: row.published,
  };
}

async function deliveryOptions() {
  const [sunoLive, mjLive] = await Promise.all([
    sunoChannelLive(),
    midjourneyChannelLive(),
  ]);
  return {
    sunoLive,
    sunoConfigured: sunoMediaEnabled(),
    mjLive,
    mjConfigured: midjourneyMediaEnabled(),
    replicateLive: replicateMediaEnabled(),
    cohereLive: cohereEmbedEnabled(),
    capcutLive: editEngineEnabled(),
  };
}

function finalizeProduct(
  product: Product,
  opts: Awaited<ReturnType<typeof deliveryOptions>>
): Product {
  const seed = seedProducts.find((item) => item.id === product.id);
  return withProductMeta(
    {
      ...product,
      delivery: seed?.delivery ?? product.delivery,
      badge: product.badge ?? seed?.badge,
      access: product.access ?? seed?.access,
      runtime: product.runtime ?? seed?.runtime,
    },
    opts
  );
}

function seedRow(product: Product, index: number) {
  return {
    id: product.id,
    name: product.name,
    description: product.description,
    longDescription: product.longDescription,
    category: product.category,
    price: product.price,
    unit: product.unit,
    tags: JSON.stringify(product.tags),
    features: JSON.stringify(product.features),
    provider: product.provider,
    badge: product.badge ?? null,
    pricingNote: product.pricingNote,
    access: product.access ?? (product.runtime ? "platform" : "customer"),
    runtimeProvider: product.runtime?.provider ?? null,
    runtimeModel: product.runtime?.model ?? null,
    image: productImage(product),
    published: true,
    sortOrder: index,
  };
}

export async function ensureCatalogSeeded() {
  const table = catalogTable();
  if (!table) return;
  const existing = await table.findMany({
    select: { id: true },
  });
  const have = new Set(existing.map((row) => row.id));
  const missing = seedProducts.filter((product) => !have.has(product.id));
  if (missing.length === 0) {
    await syncCatalogRuntimes(table);
    await syncCatalogHonesty(table);
    return;
  }
  await table.createMany({
    data: missing.map((product) =>
      seedRow(product, seedProducts.findIndex((item) => item.id === product.id))
    ),
  });
  await syncCatalogRuntimes(table);
  await syncCatalogHonesty(table);
}

async function syncCatalogRuntimes(
  table: NonNullable<ReturnType<typeof catalogTable>>
) {
  // 只补空的 runtime；FORCE_RUNTIME_SYNC 允许把新接通 SKU 写回
  const rows = await table.findMany({
    select: { id: true, runtimeProvider: true, runtimeModel: true },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));
  await Promise.all(
    seedProducts
      .filter((product) => product.runtime)
      .map(async (product) => {
        const row = byId.get(product.id);
        if (!row) return;
        const nextProvider = product.runtime!.provider;
        const nextModel = product.runtime!.model;
        if (
          row.runtimeProvider === nextProvider &&
          row.runtimeModel === nextModel
        ) {
          return;
        }
        const force = FORCE_RUNTIME_SYNC.has(product.id);
        if (row.runtimeProvider && row.runtimeModel && !force) return;
        await table.updateMany({
          where: { id: product.id },
          data: {
            runtimeProvider: nextProvider,
            runtimeModel: nextModel,
          },
        });
      })
  );
}

/** 新接通或必须纠正的 SKU，允许覆盖已有 runtime */
const FORCE_RUNTIME_SYNC = new Set([
  "claude-sonnet",
  "whisper-api",
  "pinecone",
  "weaviate-cloud",
  "meeting-minutes",
  "ppt-deck",
  "sales-leads",
  "work-im-bot",
  "sheet-analyst",
  "brand-visual",
  "poster-layout",
  "ui-wireframe",
  "packaging-design",
  "dall-e-3",
  "jimeng-image",
  "stable-diffusion-xl",
  "kling-video",
  "ai-video-gen",
  "runway-gen3",
  "midjourney-api",
  "ai-music-bgm",
  "doubao-seed",
  "ernie-5",
  "digital-human",
  "ai-image-make",
  "shop-cs",
  "langchain-pro",
  "cursor-pro",
  "ai-subtitle",
  "smart-clip-select",
  "gemini-pro",
  "replicate-api",
  "cohere-embed",
  "capcut-auto",
  "open-resume",
  "cover-letter",
  "mock-interview",
  "job-search-agent",
]);

/** 方案陪跑 + 交付标注 + 强制接通 SKU：同步徽章与文案（仅写有变化的行，避免慢盘 SQLite 被 Promise.all 打爆） */
async function syncCatalogHonesty(
  table: NonNullable<ReturnType<typeof catalogTable>>
) {
  const opts = await deliveryOptions();
  const rows = await table.findMany({
    select: {
      id: true,
      access: true,
      badge: true,
      name: true,
      pricingNote: true,
      description: true,
      longDescription: true,
      tags: true,
      features: true,
      published: true,
    },
  });
  const byId = new Map(rows.map((row) => [row.id, row]));

  for (const product of seedProducts) {
    const row = byId.get(product.id);
    if (!row) continue;
    const delivery = resolveDelivery(product, opts);
    const stamped = withProductMeta(product, opts);
    const next = {
      access: product.access ?? (product.runtime ? "platform" : "customer"),
      badge:
        stamped.badge ??
        (delivery === "playbook"
          ? "方案陪跑"
          : delivery === "setup"
            ? "待配置"
            : "已接通"),
      name: product.name,
      pricingNote: product.pricingNote,
      description: product.description,
      longDescription: product.longDescription,
      tags: JSON.stringify(product.tags),
      features: JSON.stringify(product.features),
      published: product.published !== false,
    };
    if (
      row.access === next.access &&
      (row.badge ?? null) === (next.badge ?? null) &&
      row.name === next.name &&
      row.pricingNote === next.pricingNote &&
      row.description === next.description &&
      row.longDescription === next.longDescription &&
      row.tags === next.tags &&
      row.features === next.features &&
      row.published === next.published
    ) {
      continue;
    }
    await table.updateMany({
      where: { id: product.id },
      data: next,
    });
  }
}

async function seedCatalog(options?: { includeHidden?: boolean }): Promise<Product[]> {
  const opts = await deliveryOptions();
  return seedProducts
    .map((product) =>
      finalizeProduct(
        {
          ...product,
          image: productImage(product),
          published: product.published !== false,
        },
        opts
      )
    )
    .filter((product) => options?.includeHidden || product.published);
}

export async function listCatalog(options?: {
  includeHidden?: boolean;
}): Promise<Product[]> {
  await ensureCatalogSeeded();
  const table = catalogTable();
  if (!table) return seedCatalog(options);
  const opts = await deliveryOptions();
  const rows = await table.findMany({
    where: options?.includeHidden ? undefined : { published: true },
    orderBy: { sortOrder: "asc" },
  });
  return rows
    .map(toProduct)
    .filter((product): product is Product => Boolean(product))
    .map((product) => finalizeProduct(product, opts));
}

export async function getCatalogProduct(
  id: string,
  options?: { includeHidden?: boolean }
): Promise<Product | undefined> {
  await ensureCatalogSeeded();
  const table = catalogTable();
  if (!table) {
    return (await seedCatalog(options)).find((product) => product.id === id);
  }
  const row = await table.findUnique({ where: { id } });
  if (!row) {
    return (await seedCatalog(options)).find((product) => product.id === id);
  }
  if (!options?.includeHidden && !row.published) return undefined;
  const product = toProduct(row);
  if (!product) return undefined;
  const opts = await deliveryOptions();
  return finalizeProduct(product, opts);
}

export async function updateCatalogProduct(
  id: string,
  patch: {
    name?: string;
    description?: string;
    longDescription?: string;
    price?: number;
    unit?: string;
    badge?: string | null;
    pricingNote?: string;
    published?: boolean;
  }
) {
  const table = catalogTable();
  if (!table) {
    throw new Error("目录表尚未就绪，请重启开发服务器后再保存");
  }
  const data: Record<string, unknown> = {};
  if (typeof patch.name === "string") data.name = patch.name.slice(0, 80);
  if (typeof patch.description === "string") {
    data.description = patch.description.slice(0, 200);
  }
  if (typeof patch.longDescription === "string") {
    data.longDescription = patch.longDescription.slice(0, 2000);
  }
  if (typeof patch.price === "number" && Number.isFinite(patch.price)) {
    data.price = Math.max(0, Math.round(patch.price));
  }
  if (typeof patch.unit === "string") data.unit = patch.unit.slice(0, 20);
  if (patch.badge !== undefined) {
    data.badge = patch.badge ? patch.badge.slice(0, 20) : null;
  }
  if (typeof patch.pricingNote === "string") {
    data.pricingNote = patch.pricingNote.slice(0, 200);
  }
  if (typeof patch.published === "boolean") data.published = patch.published;

  const row = await table.update({
    where: { id },
    data,
  });
  return toProduct(row);
}
