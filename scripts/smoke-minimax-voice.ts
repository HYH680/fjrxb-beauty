/**
 * 冒烟：MiniMax TTS + 场景选型克隆
 * Usage: npx tsx scripts/smoke-minimax-voice.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import {
  synthesizeSpeechMinimax,
  cloneVoiceMinimax,
} from "../src/lib/integrations/minimax-media";
import { synthesizeVoiceClonePreview } from "../src/lib/integrations/media";
import { voiceEnvStatus, resolveVoiceModel } from "../src/lib/voice-lane-catalog";

config({ path: join(process.cwd(), ".env") });

async function main() {
  const env = voiceEnvStatus();
  console.log("已配置:", env.present.join(", ") || "(无)");
  console.log("缺密钥:", env.missing.join(", "));

  const pick = resolveVoiceModel({ lane: 2, tier: "high", modelId: "minimax-speech-2.8-hd" });
  console.log("选型解析:", pick.option.id, pick.fallbackFrom || "(无回退)");

  console.log("\n1) MiniMax 通用 TTS…");
  const tts = await synthesizeSpeechMinimax({
    text: "周末双人套餐上线，含两杯拿铁和一份提拉米苏，欢迎到店。",
    model: "speech-2.6-hd",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-minimax-tts.mp3"),
    Buffer.from(tts.base64, "base64")
  );

  console.log("2) 用 TTS 音频当样本做 MiniMax 克隆…");
  // MiniMax 要求样本 ≥10 秒；多拼几句
  const long = await synthesizeSpeechMinimax({
    text:
      "大家好，我是本店主理人。欢迎光临本店。今天鲜榨果汁买一送一。周末双人套餐也已上线。欢迎带家人来坐坐，品尝招牌拿铁与提拉米苏。我们期待与您见面。谢谢大家。",
    model: "speech-2.6-hd",
  });
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-minimax-sample.mp3"),
    Buffer.from(long.base64, "base64")
  );

  const cloned = await cloneVoiceMinimax({
    sampleBase64: long.base64,
    sampleName: "sample.mp3",
    preferredName: "ShopDemo",
    text: "这是 MiniMax 克隆试听，欢迎周末来店喝杯咖啡。",
    model: "speech-2.6-hd",
  });
  console.log("   voiceId=", cloned.voiceId);
  if (cloned.base64) {
    writeFileSync(
      join(process.cwd(), "scripts", "smoke-minimax-clone.mp3"),
      Buffer.from(cloned.base64, "base64")
    );
  }

  console.log("3) media helper 场景 2 / 高档 / MiniMax…");
  const via = await synthesizeVoiceClonePreview({
    text: "一键选型克隆完成。",
    consent: true,
    sampleBase64: long.base64,
    sampleMime: "audio/mpeg",
    sampleName: "sample.mp3",
    lane: 2,
    tier: "high",
    modelId: "minimax-speech-2.8-hd",
  });

  const out = {
    allOk: Boolean(tts.base64 && cloned.voiceId && via.base64),
    ttsOk: Boolean(tts.base64),
    cloneVoiceId: cloned.voiceId,
    viaMode: via.cloneMode,
    viaNotice: via.notice,
    missingKeys: env.missing,
  };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-minimax-voice-result.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
  console.log(out.allOk ? "\n结论: MiniMax 通路 ✓" : "\n结论: 未通过 ✗");
  process.exit(out.allOk ? 0 : 1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
