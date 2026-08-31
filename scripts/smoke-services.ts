/**
 * Smoke-test every catalog service via /api/runtime/chat.
 * Usage: npx tsx scripts/smoke-services.ts
 */
import "dotenv/config";
import { writeFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { SignJWT } from "jose";
import { products } from "../src/data/products";

const BASE = process.env.SMOKE_BASE || "http://localhost:3000";
const COOKIE = "ai-supermarket-session";
const MAX_AGE = 60 * 60;

type Row = {
  id: string;
  name: string;
  category: string;
  access: string;
  status: "ok" | "fail";
  http: number;
  model: string;
  route: string;
  ms: number;
  error: string;
  preview: string;
};

async function mintCookie(user: { id: string; email: string; name: string }) {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET missing");
  const token = await new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${MAX_AGE}s`)
    .sign(new TextEncoder().encode(secret));
  return `${COOKIE}=${token}`;
}

function probeMessage(product: { id: string; name: string; category: string }) {
  if (["restaurant-cs", "shop-review", "shop-cs"].includes(product.id)) {
    return "你好，这项服务怎么开始？先别让我填表。";
  }
  if (product.category === "video-edit") {
    return "我想出一条30秒竖版口播，风格干净一点，先告诉我要准备什么。";
  }
  if (product.category === "docs") {
    return "还没有图。先告诉我拍照要注意什么。";
  }
  return `你好，我已开通「${product.name}」，请用一两句话告诉我现在怎么开始。`;
}

async function main() {
  const prisma = new PrismaClient();
  const developer = await prisma.user.findFirst({
    where: { email: "2028391318@qq.com" },
    select: { id: true, email: true, name: true },
  });
  const user =
    developer ||
    (await prisma.user.findFirst({
      orderBy: { createdAt: "asc" },
      select: { id: true, email: true, name: true },
    }));
  if (!user) throw new Error("no user in database");

  const cookie = await mintCookie(user);
  const list = products.filter((p) => !(p as { hidden?: boolean }).hidden);
  const results: Row[] = [];

  console.log(`User: ${user.email}  products: ${list.length}  base: ${BASE}`);

  for (const product of list) {
    const started = Date.now();
    try {
      const res = await fetch(`${BASE}/api/runtime/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Cookie: cookie,
        },
        body: JSON.stringify({
          productId: product.id,
          message: probeMessage(product),
          history: [],
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        reply?: string;
        error?: string;
        model?: string;
        route?: string;
      };
      const ok = res.ok && Boolean(data.reply);
      const row: Row = {
        id: product.id,
        name: product.name,
        category: product.category,
        access: product.access || "platform",
        status: ok ? "ok" : "fail",
        http: res.status,
        model: data.model || "",
        route: data.route || "",
        ms: Date.now() - started,
        error: ok ? "" : String(data.error || data.reply || res.statusText).slice(0, 180),
        preview: ok ? String(data.reply).slice(0, 90).replace(/\s+/g, " ") : "",
      };
      results.push(row);
      console.log(
        `${row.status.toUpperCase().padEnd(4)} ${row.id.padEnd(22)} ${String(row.http).padEnd(3)} ${(row.model || "-").padEnd(18)} ${row.error || row.preview}`
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      results.push({
        id: product.id,
        name: product.name,
        category: product.category,
        access: product.access || "platform",
        status: "fail",
        http: 0,
        model: "",
        route: "",
        ms: Date.now() - started,
        error: message.slice(0, 180),
        preview: "",
      });
      console.log(`FAIL ${product.id} ${message}`);
    }
  }

  await prisma.$disconnect();

  const ok = results.filter((r) => r.status === "ok").length;
  const fail = results.filter((r) => r.status === "fail");
  console.log("\n=== SUMMARY ===");
  console.log(`ok=${ok} fail=${fail.length} total=${results.length}`);
  for (const row of fail) {
    console.log(`- ${row.id}: ${row.error}`);
  }

  writeFileSync(
    "scripts/smoke-services-result.json",
    JSON.stringify({ at: new Date().toISOString(), user: user.email, results }, null, 2)
  );
  console.log("wrote scripts/smoke-services-result.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
