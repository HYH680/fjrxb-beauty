/**
 * Smoke Cartesia TTS.
 * Usage: npx tsx scripts/smoke-cartesia.ts
 */
import { config } from "dotenv";
config({ path: ".env" });

async function main() {
  const {
    cartesiaMediaEnabled,
    resolveCartesiaVoiceId,
    synthesizeSpeechCartesia,
  } = await import("../src/lib/integrations/cartesia-media");

  if (!cartesiaMediaEnabled()) {
    console.error("CARTESIA_API_KEY missing");
    process.exit(1);
  }

  const voiceId = await resolveCartesiaVoiceId();
  console.log("voice", voiceId.slice(0, 8) + "…");

  const result = await synthesizeSpeechCartesia({
    text: "Hello from Cartesia smoke test. Low latency English voice.",
  });
  console.log("ok", {
    provider: result.provider,
    model: result.model,
    mime: result.mime,
    bytes: Math.round((result.base64.length * 3) / 4),
  });
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
