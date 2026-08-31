/**
 * 冒烟：配乐方案 + 声音克隆校验 + 静图动效场景
 * Usage: npx tsx scripts/smoke-new-media.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import { buildMusicBrief } from "../src/lib/music-studio";
import {
  VIDEO_SCENES,
  buildStudioPrompt,
  wanxSize,
} from "../src/lib/image-studio";
import { synthesizeVoiceClonePreview } from "../src/lib/integrations/media";
import { getProductById } from "../src/data/products";
import { getServiceBrief } from "../src/lib/service-briefs";

async function main() {
  const results: Record<string, unknown> = {};

  // 1) 商品是否上架
  for (const id of ["voice-clone", "ai-music-bgm", "ai-video-gen"]) {
    const p = getProductById(id);
    results[`product:${id}`] = p
      ? { ok: true, name: p.name, category: p.category }
      : { ok: false };
  }

  // 2) briefs
  results["brief:voice-clone"] = {
    ok: getServiceBrief("voice-clone").materials.length > 0,
    kind: getServiceBrief("voice-clone").kind,
  };
  results["brief:ai-music-bgm"] = {
    ok: getServiceBrief("ai-music-bgm").followUps.length > 0,
  };

  // 3) 右侧能力挂载（与 WorkspaceMediaTools 保持一致）
  results["caps:voice-clone"] = ["voice-clone"];
  results["caps:ai-music-bgm"] = ["music"];
  results["caps:ai-video-gen"] = ["image"];
  results["caps:check"] = {
    ok:
      getServiceBrief("voice-clone").kind === "playbook-run" &&
      getServiceBrief("ai-music-bgm").kind === "playbook-run",
  };

  // 4) 视频静图动效 / 首尾帧
  const still = VIDEO_SCENES.find((s) => s.id === "still-to-motion");
  const frame = VIDEO_SCENES.find((s) => s.id === "first-last-frame");
  const videoPrompt = buildStudioPrompt({
    userPrompt: "哑光白色保温杯主图，要做成 8 秒轻微旋转动效",
    scene: still!,
    aspect: "1:1",
    tier: "1k",
    mode: "video",
  });
  results["video:still-to-motion"] = {
    ok: Boolean(still && frame),
    size: wanxSize("1:1", "1k"),
    promptPreview: videoPrompt.slice(0, 160),
  };

  // 5) 配乐方案
  const music = buildMusicBrief({
    prompt: "咖啡店周末促销短视频，旁白需要清楚，节奏轻快",
    useCase: "bgm",
    mood: "轻松明亮",
    durationSec: 15,
  });
  results["music:brief"] = {
    ok: Boolean(music.sunoPrompt && music.zhPrompt),
    title: music.title,
    sunoPrompt: music.sunoPrompt,
  };

  // 6) 声音克隆：无授权应失败；有样本走真克隆（需 QWEN_API_KEY）
  let cloneDenied = false;
  try {
    await synthesizeVoiceClonePreview({
      text: "欢迎光临本店",
      consent: false,
      sampleBase64: "AAAA",
    });
  } catch (e) {
    cloneDenied = /授权/.test(e instanceof Error ? e.message : String(e));
  }
  results["clone:deny-without-consent"] = { ok: cloneDenied };

  let cloneOk = false;
  let cloneDetail = "";
  try {
    const { synthesizeSpeechDashScope } = await import(
      "../src/lib/integrations/dashscope-media"
    );
    const sample = await synthesizeSpeechDashScope(
      "各位顾客大家好，欢迎光临本店，周末来店喝杯咖啡。"
    );
    const preview = await synthesizeVoiceClonePreview({
      text: "这是品牌口播试听，欢迎周末来店喝杯咖啡。",
      consent: true,
      sampleBase64: sample.base64,
      sampleMime: sample.mime,
      sampleName: "smoke.mp3",
    });
    cloneOk = Boolean(preview.base64);
    cloneDetail = `${preview.provider}/${preview.cloneMode}`;
    if (preview.base64) {
      writeFileSync(
        join(process.cwd(), "scripts", "smoke-voice-clone-out.mp3"),
        Buffer.from(preview.base64, "base64")
      );
    }
  } catch (e) {
    cloneDetail = e instanceof Error ? e.message.slice(0, 200) : String(e);
  }
  results["clone:preview"] = { ok: cloneOk, detail: cloneDetail };

  const allOk =
    Boolean((results["product:voice-clone"] as { ok?: boolean }).ok) &&
    Boolean((results["product:ai-music-bgm"] as { ok?: boolean }).ok) &&
    Boolean((results["video:still-to-motion"] as { ok?: boolean }).ok) &&
    Boolean((results["music:brief"] as { ok?: boolean }).ok) &&
    cloneDenied &&
    cloneOk;

  const out = { allOk, results };
  writeFileSync(
    join(process.cwd(), "scripts", "smoke-new-media-result.json"),
    JSON.stringify(out, null, 2)
  );
  console.log(JSON.stringify(out, null, 2));
  console.log(allOk ? "\n结论: 胜任 ✓" : "\n结论: 部分未通过 ✗");
  process.exit(allOk ? 0 : 1);
}

void main();
