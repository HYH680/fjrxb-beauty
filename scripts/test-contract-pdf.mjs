import fs from "fs";
import dotenv from "dotenv";
import { extractText } from "unpdf";

dotenv.config();

const path =
  "c:/Users/ZhuanZ(无密码)/WPSDrive/1514064947/WPS云盘/备忘录文档_202608152225.pdf";
const buf = new Uint8Array(fs.readFileSync(path));
console.log("fileBytes", buf.byteLength);

const result = await extractText(buf, { mergePages: true });
const text = (
  Array.isArray(result.text) ? result.text.join("\n") : result.text || ""
).trim();
console.log("pages", result.totalPages, "chars", text.length);

const base = (
  process.env.LLM_GATEWAY_BASE_URL ||
  process.env.QWEN_BASE_URL ||
  "https://dashscope.aliyuncs.com/compatible-mode/v1"
).replace(/\/$/, "");
const key =
  process.env.LLM_GATEWAY_API_KEY ||
  process.env.QWEN_API_KEY ||
  process.env.OPENAI_API_KEY;
const model =
  process.env.QWEN_MODEL || process.env.OPENAI_MODEL || "qwen-plus";

if (!key) {
  console.error("NO_API_KEY");
  process.exit(2);
}

const system =
  "你是合同拍照审阅助手。标责任不清、单方解约、自动续费、赔偿上限、管辖地、付款条件、违约金。每条写原文要点、为什么可疑、建议向对方确认什么。这是审阅草稿，不是律师意见。";
const user = `请审阅下面这份「股东合伙协议」抽出的全文：\n\n${text.slice(0, 12000)}`;

const res = await fetch(`${base}/chat/completions`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  },
  body: JSON.stringify({
    model,
    temperature: 0.3,
    max_tokens: 1200,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  }),
});

const data = await res.json();
console.log("status", res.status, "model", model);
if (!res.ok) {
  console.log(JSON.stringify(data).slice(0, 1000));
  process.exit(1);
}
const reply = data.choices?.[0]?.message?.content || "";
console.log("---reply---");
console.log(reply);
