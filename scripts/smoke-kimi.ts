/**
 * Smoke Moonshot / Kimi chat.
 * Usage: npx tsx scripts/smoke-kimi.ts
 */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const { getNamedProviderConfig, extractAssistantText, chatTemperature } =
    await import("../src/lib/llm-config");
  const { listLiveModels, attemptsForTask } = await import(
    "../src/lib/model-catalog"
  );

  const cfg = getNamedProviderConfig("kimi");
  if (!cfg.apiKey) {
    console.error("MOONSHOT_API_KEY / KIMI_API_KEY missing");
    process.exit(1);
  }
  console.log("config", {
    baseUrl: cfg.baseUrl,
    model: cfg.model,
    keyLen: cfg.apiKey.length,
  });

  const live = listLiveModels().filter((m) => m.provider === "kimi");
  console.log(
    "live kimi profiles",
    live.map((m) => m.id + ":" + m.model)
  );
  const legalTop = attemptsForTask("legal").slice(0, 5).map((a) => a.model);
  console.log("legal top models", legalTop);

  const res = await fetch(`${cfg.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      temperature: chatTemperature(cfg.model),
      max_tokens: 64,
      messages: [
        { role: "user", content: "用五个字以内回复：连通测试成功" },
      ],
    }),
  });
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    /* ignore */
  }
  if (!res.ok) {
    console.error("HTTP", res.status, text.slice(0, 400));
    process.exit(1);
  }
  console.log("ok", extractAssistantText(data).slice(0, 80));
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
