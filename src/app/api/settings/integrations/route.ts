import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import {
  getIntegrationCapabilities,
  capabilitiesToLegacyFlags,
} from "@/lib/integrations/capabilities";
import {
  isToggleableFeature,
  setIntegrationFlag,
  getStoredIntegrationFlags,
} from "@/lib/integrations/feature-flags";

/** 切换旁路能力实体开关（管理员）。点开后立即写入 DB 并影响运行时。 */
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "string" ? body.id.trim() : "";
  const on = body.on === true || body.on === "true" || body.on === 1;

  if (!isToggleableFeature(id)) {
    return NextResponse.json(
      {
        error:
          "该能力不能一键切换（需配置密钥的基础能力，或始终开启的内置能力）",
      },
      { status: 400 }
    );
  }

  if (id === "localLlmGateway" && on) {
    if (
      !process.env.LLM_GATEWAY_BASE_URL?.trim() ||
      !process.env.LLM_GATEWAY_API_KEY?.trim()
    ) {
      return NextResponse.json(
        {
          error:
            "请先在 .env 配置 LLM_GATEWAY_BASE_URL 与 LLM_GATEWAY_API_KEY，再打开此开关",
        },
        { status: 400 }
      );
    }
  }

  try {
    const flags = await setIntegrationFlag(id, on);
    const capabilities = await getIntegrationCapabilities({ probeLive: true });
    return NextResponse.json({
      ok: true,
      id,
      on,
      flags,
      capabilities,
      integrations: capabilitiesToLegacyFlags(capabilities),
      hint: on
        ? "已打开。旁路进程未起时会自动回落云端/内置能力，业务仍可用。"
        : "已关闭。将不再优先走该旁路。",
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "保存失败，请确认已执行 prisma db push",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const auth = await requireAdmin();
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }
  const flags = await getStoredIntegrationFlags();
  const capabilities = await getIntegrationCapabilities({ probeLive: true });
  return NextResponse.json({ flags, capabilities });
}
