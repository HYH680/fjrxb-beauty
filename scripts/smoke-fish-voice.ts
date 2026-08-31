/**
 * Fish Audio 冒烟：公共音色 TTS + 样本克隆试听
 * Usage: npx tsx scripts/smoke-fish-voice.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import {
  synthesizeSpeechFish,
  cloneAndSpeakFish,
} from "../src/lib/integrations/fish-media";
import { synthesizeSpeechMinimax } from "../src/lib/integrations/minimax-media";
import { synthesizeVoiceClonePreview } from "../src/lib/integrations/media";
import { voiceEnvStatus } from "../src/lib/voice-lane-catalog";

config({ path: join(process.cwd(), ".env"), override: true });

async function main() {
  const env = voiceEnvStatus();
  console.log("FISH 已配置:", env.present.includes("FISH_API_KEY"));

  console.log("1) Fish 公共音色 TTS…");
  const tts = await synthesizeSpeechFish({
    text: "周末双人套餐上线，欢迎到店品尝拿铁。",
    model: "s2-pro",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-fish-tts.mp3"),
    Buffer.from(tts.base64, "base64")
  );

  console.log("2) 生成 ≥10s 样本（MiniMax）再 Fish 克隆…");
  const sample = await synthesizeSpeechMinimax({
    text:
      "大家好，我是本店主理人。欢迎光临本店。今天鲜榨果汁买一送一。周末双人套餐也已上线。欢迎带家人来坐坐，品尝招牌拿铁与提拉米苏。我们期待与您见面。谢谢大家。",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-fish-sample.mp3"),
    Buffer.from(sample.base64, "base64")
  );

  const cloned = await cloneAndSpeakFish({
    text: "这是 Fish Audio 克隆试听，欢迎周末来店。",
    sampleBase64: sample.base64,
    sampleName: "sample.mp3",
    title: "ShopFishDemo",
    model: "s2-pro",
  });
  console.log("   voiceId=", cloned.voiceId, "state=", cloned.state);
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-fish-clone.mp3"),
    Buffer.from(cloned.base64, "base64")
  );

  const via = await synthesizeVoiceClonePreview({
    text: "选型链路 Fish 中档试听。",
    consent: true,
    sampleBase64: sample.base64,
    sampleMime: "audio/mpeg",
    sampleName: "sample.mp3",
    lane: 1,
    tier: "mid",
    modelId: "fish-s2-pro",
  });

  const out = {
    allOk: Boolean(tts.base64 && cloned.base64 && via.base64),
    ttsProvider: tts.provider,
    cloneVoiceId: cloned.voiceId,
    viaMode: via.cloneMode,
    viaNotice: via.notice,
  };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-fish-voice-result.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
  console.log(out.allOk ? "\n结论: Fish 通路 ✓" : "\n结论: 未通过 ✗");
  process.exit(out.allOk ? 0 : 1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
