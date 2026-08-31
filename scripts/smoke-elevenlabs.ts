/**
 * ElevenLabs 冒烟：TTS +（可选）克隆登记
 * Usage: npx tsx scripts/smoke-elevenlabs.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { synthesizeSpeech, synthesizeVoiceClonePreview } from "../src/lib/integrations/media";
import { synthesizeSpeechMinimax } from "../src/lib/integrations/minimax-media";
import { voiceEnvStatus } from "../src/lib/voice-lane-catalog";

config({ path: join(process.cwd(), ".env"), override: true });

async function main() {
  const env = voiceEnvStatus();
  console.log("ELEVENLABS 已配置:", env.present.includes("ELEVENLABS_API_KEY"));

  console.log("1) ElevenLabs 默认音色 TTS…");
  const tts = await synthesizeSpeech({
    text: "Weekend set is ready. Welcome to our cafe.",
    lane: 3,
    tier: "high",
    modelId: "elevenlabs-multilingual",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-elevenlabs-tts.mp3"),
    Buffer.from(tts.base64, "base64")
  );
  console.log("   provider=", tts.provider, "modelId=", (tts as { modelId?: string }).modelId);

  console.log("2) 样本克隆试听（MiniMax 生成样本 → ElevenLabs）…");
  const sample = await synthesizeSpeechMinimax({
    text:
      "Hello everyone, welcome to our shop. Today we have fresh juice buy one get one free. Please come this weekend with your family. Thank you for visiting us today.",
  });
  const cloned = await synthesizeVoiceClonePreview({
    text: "This is an ElevenLabs clone preview. See you this weekend.",
    consent: true,
    sampleBase64: sample.base64,
    sampleMime: "audio/mpeg",
    sampleName: "sample.mp3",
    lane: 3,
    tier: "high",
    modelId: "elevenlabs-multilingual",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-elevenlabs-clone.mp3"),
    Buffer.from(cloned.base64, "base64")
  );

  const out = {
    allOk: Boolean(tts.base64 && cloned.base64),
    ttsProvider: tts.provider,
    cloneMode: cloned.cloneMode,
    notice: cloned.notice,
  };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-elevenlabs-result.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
  console.log(out.allOk ? "\n结论: ElevenLabs 通路 ✓" : "\n结论: 未通过 ✗");
  process.exit(out.allOk ? 0 : 1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
