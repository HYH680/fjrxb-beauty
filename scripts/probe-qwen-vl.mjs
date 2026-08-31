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

const apiKey = (env.QWEN_API_KEY || env.DASHSCOPE_API_KEY || "").trim();
const pixel =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAhKmMIQAAAABJRU5ErkJggg==";

const res = await fetch(
  "https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions",
  {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "qwen-vl-plus",
      messages: [
        {
          role: "user",
          content: [
            { type: "image_url", image_url: { url: pixel } },
            { type: "text", text: "这张图是什么颜色？只回复一个词。" },
          ],
        },
      ],
      max_tokens: 16,
    }),
  }
);
const data = await res.json().catch(() => ({}));
console.log(
  JSON.stringify(
    {
      ok: res.ok,
      status: res.status,
      model: "qwen-vl-plus",
      reply: data?.choices?.[0]?.message?.content || "",
      error: data?.error?.message || data?.message || "",
    },
    null,
    2
  )
);
