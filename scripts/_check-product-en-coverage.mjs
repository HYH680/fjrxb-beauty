import fs from "fs";

const products = fs.readFileSync("src/data/products.ts", "utf8");
const en = fs.readFileSync("src/lib/i18n/product-en.ts", "utf8");
const featureEnSrc = fs.readFileSync("src/lib/i18n/feature-en.ts", "utf8");

const ids = [...products.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
const publishedFalse = new Set();
const blocks = products.split(/\{\s*\n\s*id:/);
const featuresById = new Map();

for (const b of blocks.slice(1)) {
  const id = (b.match(/^\s*"([^"]+)"/) || [])[1];
  if (!id) continue;
  if (/published:\s*false/.test(b.slice(0, 900))) publishedFalse.add(id);
  const feats = (b.match(/features:\s*\[([^\]]*)\]/) || [])[1];
  const list = feats
    ? feats.match(/"([^"]+)"/g)?.map((s) => s.slice(1, -1)) || []
    : [];
  featuresById.set(id, list);
}

const hasEn = (id) => en.includes(`"${id}":`);
console.log("we-media published EN:");
for (const id of ids.filter((id) => id.startsWith("we-media") && !publishedFalse.has(id))) {
  console.log(id, hasEn(id));
}

const missing = ids.filter((id) => !publishedFalse.has(id) && !hasEn(id));
console.log("published missing EN count", missing.length);
if (missing.length) console.log(missing.join("\n"));

const missingFeaturePhrases = new Set();
let publishedWithFeatures = 0;
for (const id of ids) {
  if (publishedFalse.has(id)) continue;
  const list = featuresById.get(id) || [];
  if (!list.length) continue;
  publishedWithFeatures += 1;
  for (const zh of list) {
    if (!featureEnSrc.includes(JSON.stringify(zh))) {
      missingFeaturePhrases.add(zh);
    }
  }
}

console.log("published with features", publishedWithFeatures);
console.log("published missing EN feature phrases", missingFeaturePhrases.size);
if (missingFeaturePhrases.size) {
  console.log([...missingFeaturePhrases].join("\n"));
  process.exitCode = 1;
}

if (missing.length) process.exitCode = 1;
