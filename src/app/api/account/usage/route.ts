import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { isAdminAccount } from "@/lib/admin";
import { summarizeUsageForUser } from "@/lib/integrations/langfuse";
import {
  capabilitiesToLegacyFlags,
  getIntegrationCapabilities,
} from "@/lib/integrations/capabilities";
import { getStoredIntegrationFlags } from "@/lib/integrations/feature-flags";
import { getPaymentMode, sandboxCheckoutAllowed } from "@/lib/payment";

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "需要先登录" }, { status: 401 });
  }

  await getStoredIntegrationFlags();

  const usage = await summarizeUsageForUser(session.id, 30);
  const capabilities = await getIntegrationCapabilities({ probeLive: true });
  const legacy = capabilitiesToLegacyFlags(capabilities);

  return NextResponse.json({
    usage,
    capabilities,
    canToggleIntegrations: isAdminAccount(session.email),
    integrations: {
      ...legacy,
      elevenlabs: Boolean(process.env.ELEVENLABS_API_KEY?.trim()),
      paymentMode: getPaymentMode(),
      sandboxAllowed: sandboxCheckoutAllowed(session.email),
    },
  });
}
