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

const has = (k) => Boolean((env[k] || "").trim());
const val = (k) => (env[k] || "").trim();

const inventory = {
  LLM_PROVIDER: val("LLM_PROVIDER"),
  QWEN_BASE_URL: val("QWEN_BASE_URL"),
  QWEN_MODEL: val("QWEN_MODEL") || "qwen-plus",
  OPENAI_MODEL: val("OPENAI_MODEL") || "gpt-5.6-sol",
  DEEPSEEK_API_KEY: has("DEEPSEEK_API_KEY"),
  ARK_API_KEY: has("ARK_API_KEY") || has("DOUBAO_API_KEY"),
  QWEN_API_KEY: has("QWEN_API_KEY") || has("DASHSCOPE_API_KEY"),
  OPENAI_API_KEY: has("OPENAI_API_KEY"),
  STABILITY_API_KEY: has("STABILITY_API_KEY"),
  MOONSHOT_API_KEY: has("MOONSHOT_API_KEY") || has("KIMI_API_KEY"),
};

function firstKey(...names) {
  for (const name of names) {
    if (has(name)) return env[name];
  }
  return "";
}

async function chatTest({ name, baseUrl, apiKey, model }) {
  if (!apiKey) {
    return { name, ok: false, status: 0, detail: "未配置密钥" };
  }
  const started = Date.now();
  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
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
    return {
      name,
      ok: res.ok && Boolean(reply),
      status: res.status,
      detail: res.ok
        ? reply
          ? `已接通，模型 ${model}`
          : "接口 200 但没有返回内容"
        : (err || `HTTP ${res.status}`).slice(0, 180),
      ms: Date.now() - started,
    };
  } catch (error) {
    return {
      name,
      ok: false,
      status: 0,
      detail: String(error?.message || error).slice(0, 180),
      ms: Date.now() - started,
    };
  }
}

async function stabilityTest(apiKey) {
  if (!apiKey) {
    return { name: "stability", ok: false, status: 0, detail: "未配置密钥" };
  }
  try {
    const res = await fetch("https://api.stability.ai/v1/user/account", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const text = await res.text();
    let parsed = {};
    try {
      parsed = JSON.parse(text);
    } catch {
      parsed = {};
    }
    return {
      name: "stability",
      ok: res.ok,
      status: res.status,
      detail: res.ok
        ? "账号接口可访问"
        : (parsed?.message || parsed?.name || `HTTP ${res.status}`).slice(0, 180),
    };
  } catch (error) {
    return {
      name: "stability",
      ok: false,
      status: 0,
      detail: String(error?.message || error).slice(0, 180),
    };
  }
}

const qwenBase =
  val("QWEN_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1";

const tests = await Promise.all([
  chatTest({
    name: "qwen",
    baseUrl: qwenBase,
    apiKey: firstKey("QWEN_API_KEY", "DASHSCOPE_API_KEY"),
    model: inventory.QWEN_MODEL,
  }),
  chatTest({
    name: "deepseek",
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: firstKey("DEEPSEEK_API_KEY"),
    model: "deepseek-chat",
  }),
  chatTest({
    name: "doubao",
    baseUrl: "https://ark.cn-beijing.volces.com/api/v3",
    apiKey: firstKey("ARK_API_KEY", "DOUBAO_API_KEY"),
    model: "doubao-seed-2-0-lite-260215",
  }),
  chatTest({
    name: "openai",
    baseUrl: "https://api.openai.com/v1",
    apiKey: firstKey("OPENAI_API_KEY"),
    model: inventory.OPENAI_MODEL,
  }),
  stabilityTest(firstKey("STABILITY_API_KEY")),
]);

const out = { inventory, tests };
const outPath = path.join(root, "scripts", "probe-services.result.json");
fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(JSON.stringify(out, null, 2));
