/**
 * 演示输入：老板样本口播 → 千问真克隆 → 另一段促销稿试听
 * Usage: npx tsx scripts/demo-voice-clone-input.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { config } from "dotenv";
import { synthesizeSpeechDashScope } from "../src/lib/integrations/dashscope-media";
import { synthesizeVoiceClonePreview } from "../src/lib/integrations/media";

config({ path: join(process.cwd(), ".env") });

const SAMPLE_SCRIPT =
  "大家好，我是本店主理人。欢迎光临，今天鲜榨果汁买一送一，欢迎周末带家人来坐坐。";

const PREVIEW_SCRIPT =
  "各位顾客请注意：周末双人套餐现已上线，含两杯招牌拿铁和一份提拉米苏，欢迎到店或在线预约。";

async function main() {
  console.log("样本稿（当作老板录音）:\n ", SAMPLE_SCRIPT);
  const sample = await synthesizeSpeechDashScope(SAMPLE_SCRIPT);
  writeFileSync(
    join(process.cwd(), "scripts", "demo-clone-sample.mp3"),
    Buffer.from(sample.base64, "base64")
  );

  console.log("\n试听稿（用克隆声线播）:\n ", PREVIEW_SCRIPT);
  const out = await synthesizeVoiceClonePreview({
    text: PREVIEW_SCRIPT,
    consent: true,
    sampleBase64: sample.base64,
    sampleMime: sample.mime,
    sampleName: "boss-sample.mp3",
    voiceName: "bossdemo",
  });

  const ext = out.mime?.includes("wav") ? "wav" : "mp3";
  const outPath = join(process.cwd(), "scripts", `demo-clone-preview.${ext}`);
  writeFileSync(outPath, Buffer.from(out.base64, "base64"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        cloneMode: out.cloneMode,
        provider: out.provider,
        voiceId: (out as { voiceId?: string }).voiceId,
        notice: out.notice,
        outFile: `scripts/demo-clone-preview.${ext}`,
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
