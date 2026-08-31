import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { synthesizeSpeech } from "../src/lib/integrations/media";
import { resolveVoiceModel, voiceEnvStatus } from "../src/lib/voice-lane-catalog";

config({ path: join(process.cwd(), ".env"), override: true });

async function main() {
  console.log(
    "present:",
    voiceEnvStatus().present.filter((k) =>
      /OPENAI|QWEN|MINIMAX/.test(k)
    )
  );
  const r = resolveVoiceModel({
    lane: 3,
    tier: "low",
    modelId: "openai-tts-hd",
  });
  console.log("resolve:", r.option.id, r.fallbackFrom || "direct");

  const out = await synthesizeSpeech({
    text: "Weekend set meal is ready. Welcome to our cafe.",
    lane: 3,
    tier: "low",
    modelId: "openai-tts-hd",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-openai-api2d.mp3"),
    Buffer.from(out.base64, "base64")
  );
  console.log(
    JSON.stringify(
      {
        ok: Boolean(out.base64),
        provider: out.provider,
        modelId: (out as { modelId?: string }).modelId,
        notice: (out as { notice?: string }).notice,
      },
      null,
      2
    )
  );
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
