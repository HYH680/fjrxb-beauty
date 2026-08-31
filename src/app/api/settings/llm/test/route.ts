import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { getLlmConfig } from "@/lib/llm-config";

export async function POST() {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const { apiKey, baseUrl, model } = await getLlmConfig();
  if (!apiKey) {
    return NextResponse.json({ error: "还没有填写 API 密钥" }, { status: 400 });
  }

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "只回复：ok" }],
        max_tokens: 8,
        temperature: 0,
      }),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const message =
        data?.error?.message || `接口返回 ${response.status}`;
      return NextResponse.json({ error: message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, model });
  } catch {
    return NextResponse.json({ error: "无法连上接口，请检查地址" }, { status: 400 });
  }
}
