/**
 * 冒烟：CosyVoice 生成样本 → DashScope 登记克隆音色 → Qwen3-TTS 试听
 * Usage: npx tsx scripts/smoke-voice-clone.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import {
  synthesizeSpeechDashScope,
  enrollVoiceDashScope,
  synthesizeSpeechQwenTts,
} from "../src/lib/integrations/dashscope-media";
import { synthesizeVoiceClonePreview } from "../src/lib/integrations/media";

config({ path: join(process.cwd(), ".env") });

async function main() {
  const results: Record<string, unknown> = {};

  let denyOk = false;
  try {
    await synthesizeVoiceClonePreview({
      text: "欢迎光临",
      consent: false,
      sampleBase64: "AAAA",
    });
  } catch (e) {
    denyOk = /授权/.test(e instanceof Error ? e.message : String(e));
  }
  results["deny-without-consent"] = { ok: denyOk };

  console.log("1) CosyVoice 生成登记样本…");
  const sample = await synthesizeSpeechDashScope(
    "各位顾客大家好，欢迎光临本店，今天咖啡第二杯半价，欢迎周末来店喝杯咖啡。"
  );
  results["sample-tts"] = {
    ok: Boolean(sample.base64),
    provider: sample.provider,
    mime: sample.mime,
  };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-voice-clone-sample.mp3"),
    Buffer.from(sample.base64, "base64")
  );

  console.log("2) qwen-voice-enrollment 登记…");
  const enrolled = await enrollVoiceDashScope({
    sampleBase64: sample.base64,
    mime: sample.mime,
    preferredName: "smokeshop",
  });
  results["enroll"] = {
    ok: Boolean(enrolled.voice),
    voice: enrolled.voice,
    targetModel: enrolled.targetModel,
    fallbackMode: enrolled.fallbackMode,
  };
  console.log("   voice=", enrolled.voice);

  console.log("3) 用克隆音色合成试听…");
  const preview = await synthesizeSpeechQwenTts(
    "这是品牌口播试听，欢迎周末来店喝杯咖啡。",
    enrolled.voice,
    enrolled.targetModel
  );
  results["clone-tts"] = {
    ok: Boolean(preview.base64),
    provider: preview.provider,
    mime: preview.mime,
  };
  if (preview.base64) {
    writeFileSync(
      join(process.cwd(), "scripts", "smoke-voice-clone-out.wav"),
      Buffer.from(preview.base64, "base64")
    );
  }

  const viaApi = await synthesizeVoiceClonePreview({
    text: "一键克隆链路试听完成。",
    consent: true,
    sampleBase64: sample.base64,
    sampleMime: sample.mime,
    sampleName: "smoke.mp3",
  });
  results["via-media-helper"] = {
    ok: Boolean(viaApi.base64),
    cloneMode: viaApi.cloneMode,
    notice: viaApi.notice,
  };

  const allOk =
    denyOk &&
    Boolean(sample.base64) &&
    Boolean(enrolled.voice) &&
    Boolean(preview.base64) &&
    Boolean(viaApi.base64);

  const out = { allOk, results };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-voice-clone-result.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
  console.log(allOk ? "\n结论: 真克隆通路 ✓" : "\n结论: 未通过 ✗");
  process.exit(allOk ? 0 : 1);
}

void main().catch((e) => {
  console.error(e);
  process.exit(1);
});
