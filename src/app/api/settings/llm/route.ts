import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/admin";
import { getLlmConfig, maskApiKey, normalizeBaseUrl } from "@/lib/llm-config";

export async function GET() {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const config = await getLlmConfig();
  return NextResponse.json({
    baseUrl: config.baseUrl,
    model: config.model,
    configured: Boolean(config.apiKey),
    apiKeyMasked: maskApiKey(config.apiKey),
  });
}

export async function POST(request: NextRequest) {
  const gate = await requireAdmin();
  if (gate.error) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = await request.json();
  const baseUrl = normalizeBaseUrl(String(body.baseUrl || ""));
  const model = String(body.model || "qwen3.8-max").slice(0, 80);
  const incomingKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";

  const existing = await prisma.platformConfig.findUnique({
    where: { id: "default" },
  });

  const apiKey = incomingKey || existing?.apiKey || "";

  const config = await prisma.platformConfig.upsert({
    where: { id: "default" },
    create: { id: "default", baseUrl, apiKey, model },
    update: { baseUrl, model, ...(incomingKey ? { apiKey: incomingKey } : {}) },
  });

  return NextResponse.json({
    baseUrl: config.baseUrl,
    model: config.model,
    configured: Boolean(config.apiKey),
    apiKeyMasked: maskApiKey(config.apiKey),
  });
}
