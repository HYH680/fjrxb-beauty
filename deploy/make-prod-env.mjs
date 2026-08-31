import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = readFileSync(join(root, ".env"), "utf8");
const secret = randomBytes(48).toString("base64url");

const drop = new Set([
  "HTTPS_PROXY",
  "HTTP_PROXY",
  "ALL_PROXY",
  "NO_PROXY",
]);

const lines = [];
const seen = new Set();
for (const raw of src.split(/\r?\n/)) {
  const trimmed = raw.trim();
  if (!trimmed || trimmed.startsWith("#")) {
    if (trimmed.includes("本机 VPN") || trimmed.includes("Clash")) continue;
    lines.push(raw);
    continue;
  }
  const eq = raw.indexOf("=");
  if (eq < 0) {
    lines.push(raw);
    continue；
  }
  const key = raw.slice(0, eq).trim();
  if (drop.has(key)) continue;
  seen.add(key);
  if (key === "AUTH_SECRET") {
    lines.push(`AUTH_SECRET="${secret}"`);
    continue;
  }
  if (key === "DATABASE_URL") {
    lines.push('DATABASE_URL="file:./prod.db"');
    continue;
  }
  if (key === "LLM_GATEWAY_BASE_URL") {
    lines.push("LLM_GATEWAY_BASE_URL=http://127.0.0.1:3001/v1");
    continue;
  }
  if (key === "NEXT_PUBLIC_SITE_URL") {
    lines.push("NEXT_PUBLIC_SITE_URL=https://fjrxb.beauty");
    continue;
  }
  if (key === "PAYMENT_MODE") {
    lines.push("PAYMENT_MODE=sandbox");
    continue;
  }
  lines.push(raw);
}

const extras = [];
if (!seen.has("NODE_ENV")) extras.push("NODE_ENV=production");
if (!seen.has("HOSTNAME")) extras.push("HOSTNAME=127.0.0.1");
if (!seen.has("PORT")) extras.push("PORT=3010");
if (extras.length) {
  lines.push("");
  lines.push("# production runtime");
  lines.push(...extras);
}

writeFileSync(join(root, ".env.production"), `${lines.join("\n").replace(/\n+$/, "")}\n`, "utf8");
console.log("wrote .env.production (AUTH_SECRET rotated, proxies stripped)");
