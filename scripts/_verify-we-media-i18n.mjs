import { appendFileSync, readFileSync } from "fs";

const src = readFileSync(new URL("../src/lib/i18n/product-en.ts", import.meta.url), "utf8");
const ids = [
  "we-media-topics",
  "we-media-script",
  "we-media-storyboard",
  "we-media-voice",
  "we-media-video",
  "we-media-publish",
  "we-media-review",
];

const rows = ids.map((id) => {
  const re = new RegExp(`"${id}":\\s*\\{\\s*name:\\s*"([^"]+)"`);
  const m = src.match(re);
  const name = m?.[1] || "";
  return {
    id,
    hasEn: Boolean(m),
    name,
    nameIsZh: /[\u4e00-\u9fff]/.test(name),
  };
});

const payload = {
  sessionId: "1cde22",
  runId: "post-fix",
  hypothesisId: "A",
  location: "scripts/_verify-we-media-i18n.mjs",
  message: "runtime EN resolve for we-media",
  data: {
    missing: rows.filter((r) => !r.hasEn).map((r) => r.id),
    stillZh: rows.filter((r) => r.nameIsZh || !r.hasEn).map((r) => r.id),
    rows,
  },
  timestamp: Date.now(),
};

appendFileSync(new URL("../debug-1cde22.log", import.meta.url), `${JSON.stringify(payload)}\n`);
console.log(JSON.stringify(payload.data, null, 2));
