import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const envText = fs.readFileSync(path.join(root, ".env"), "utf8");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith("#") || !line.includes("=")) continue;
  const i = line.indexOf("=");
  env[line.slice(0, i).trim()] = line.slice(i + 1).trim().replace(/^"|"$/g, "");
}

const apiKey = (env.DEEPSEEK_API_KEY || "").trim();
if (!apiKey) {
  console.log(JSON.stringify({ ok: false, detail: "未配置 DEEPSEEK_API_KEY" }));
  process.exit(0);
}

const started = Date.now();
const res = await fetch("https://api.deepseek.com/v1/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  },
  body: JSON.stringify({
    model: "deepseek-chat",
    messages: [{ role: "user", content: "只回复ok" }],
    max_tokens: 8,
    temperature: 0,
  }),
});
const text = await res.text();
let parsed = {};
try {
  parsed = JSON.parse(text);
} catch {
  parsed = {};
}
const reply = parsed?.choices?.[0]?.message?.content?.trim() || "";
const err = parsed?.error?.message || parsed?.message || "";
console.log(
  JSON.stringify(
    {
      ok: res.ok && Boolean(reply),
      status: res.status,
      model: "deepseek-chat",
      reply: reply || "",
      detail: res.ok
        ? reply
          ? "已接通"
          : "接口 200 但没有返回内容"
        : (err || `HTTP ${res.status}`).slice(0, 180),
      ms: Date.now() - started,
      services: ["deepseek-chat", "retail-marketing"],
    },
    null,
    2
  )
);
