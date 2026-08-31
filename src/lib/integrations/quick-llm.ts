import {
  extractAssistantText,
  getNamedProviderConfig,
  liveConfigAttempts,
} from "@/lib/llm-config";

export async function completeWithQwen(input: {
  system: string;
  user: string;
  productId: string;
  userId?: string;
}) {
  const attempts = liveConfigAttempts(getNamedProviderConfig("qwen"));
  if (attempts.length === 0) {
    throw new Error("未配置千问密钥，无法翻译或选片");
  }
  let last = "模型调用失败";
  for (const config of attempts) {
    const res = await fetch(`${config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
        "X-Product-Id": input.productId,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.3,
        max_tokens: 2500,
        user: input.userId,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      last =
        (data as { error?: { message?: string }; message?: string })?.error
          ?.message ||
        (data as { message?: string })?.message ||
        `模型 ${res.status}`;
      continue;
    }
    const text = extractAssistantText(data).trim();
    if (text) return text;
    last = "模型没有返回文字";
  }
  throw new Error(last);
}
