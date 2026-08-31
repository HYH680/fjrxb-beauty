import fs from "fs";

const path = "src/data/products.ts";
let s = fs.readFileSync(path, "utf8");

const LIVE = new Set([
  "dall-e-3",
  "ai-image-make",
  "copy-to-image",
  "ecommerce-image",
  "product-replica",
  "prompt-reverse",
  "retail-marketing",
  "shop-photo-audit",
  "whisper-api",
  "meeting-minutes",
  "elevenlabs-tts",
  "voice-clone",
  "runway-gen3",
  "ai-video-gen",
  "kling-video",
]);

const PLAYBOOK = new Set([
  "stable-diffusion-xl",
  "midjourney-api",
  "ai-music-bgm",
  "langchain-pro",
  "cursor-pro",
  "replicate-api",
  "cohere-embed",
  "capcut-auto",
  "ai-subtitle",
  "smart-clip-select",
  "digital-human",
]);

const parts = s.split(/(\n  \{\n    id: )/);
let out = parts[0];
let patched = 0;

for (let i = 1; i < parts.length; i += 2) {
  const head = parts[i];
  let body = parts[i + 1];
  const idMatch = body.match(/^"([^"]+)"/);
  const id = idMatch ? idMatch[1] : "";
  const hasDelivery = /delivery:\s*"(live|playbook)"/.test(body);
  const hasRuntime = /runtime:\s*\{/.test(body);
  const accessCustomer = /access:\s*"customer"/.test(body);
  const badgePlaybook = /badge:\s*"方案陪跑"/.test(body);

  let delivery = "playbook";
  if (PLAYBOOK.has(id) || badgePlaybook) delivery = "playbook";
  else if (LIVE.has(id) || hasRuntime) delivery = "live";
  else if (accessCustomer) delivery = "playbook";

  if (!hasDelivery) {
    if (/pricingNote:/.test(body)) {
      body = body.replace(
        /(pricingNote:[^\n]+\n)/,
        `$1    delivery: "${delivery}",\n`
      );
    } else {
      body = body.replace(/(\n  \},)/, `\n    delivery: "${delivery}",$1`);
    }
    patched += 1;
  } else {
    body = body.replace(
      /delivery:\s*"(live|playbook)"/,
      `delivery: "${delivery}"`
    );
  }

  if (delivery === "playbook" && !/badge:/.test(body)) {
    body = body.replace(
      /(provider:[^\n]+\n)/,
      `$1    badge: "方案陪跑",\n`
    );
  }

  out += head + body;
}

fs.writeFileSync(path, out);
console.log(`patched ${patched} products`);
