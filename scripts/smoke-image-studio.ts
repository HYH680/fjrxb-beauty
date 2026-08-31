/**
 * 随机出题考作图台：比例 + 场景 + 万相通道
 * Usage: npx tsx scripts/smoke-image-studio.ts
 *        $env:SMOKE_TASK="camp"; npx tsx scripts/smoke-image-studio.ts
 */
import { writeFileSync } from "fs";
import { join } from "path";
import {
  PRODUCT_SCENES,
  buildStudioPrompt,
  wanxSize,
  type AspectRatioId,
  type ResTierId,
} from "../src/lib/image-studio";
import { generateImage } from "../src/lib/integrations/media";

const TASKS = [
  {
    name: "陶瓷马克杯 · 电商白底主图",
    sceneId: "white-main",
    aspect: "1:1" as AspectRatioId,
    tier: "1k" as ResTierId,
    prompt:
      "哑光米白陶瓷马克杯，圆弧把手，杯身无logo，棚拍柔光，商品完整入镜，边缘干净",
  },
  {
    name: "露营帐篷 · 场景图 4:5",
    sceneId: "scene",
    aspect: "4:5" as AspectRatioId,
    tier: "1k" as ResTierId,
    prompt:
      "两人帐篷支在湖边草地，傍晚暖光，帐篷为主体，真实户外使用感，不要文字",
  },
  {
    name: "护肤精华 · Amazon 主图",
    sceneId: "amazon-main",
    aspect: "1:1" as AspectRatioId,
    tier: "1k" as ResTierId,
    prompt:
      "30ml 玻璃滴管精华瓶，淡绿色液体，纯白背景，瓶身居中约占画面85%，无文字水印",
  },
];

async function main() {
  const forced = process.env.SMOKE_TASK;
  const task =
    forced === "camp"
      ? TASKS[1]
      : TASKS[Math.floor(Math.random() * TASKS.length)];
  const scene = PRODUCT_SCENES.find((s) => s.id === task.sceneId)!;
  const finalPrompt = buildStudioPrompt({
    userPrompt: task.prompt,
    scene,
    aspect: task.aspect,
    tier: task.tier,
    mode: "product",
  });
  const size = wanxSize(task.aspect, task.tier);

  console.log("=== 随机考题 ===");
  console.log("任务:", task.name);
  console.log("场景:", scene.label);
  console.log("比例:", task.aspect, "分辨率:", task.tier, "→", size);
  console.log("提示词:\n", finalPrompt);
  console.log("\n=== 开始出图 ===");

  const started = Date.now();
  try {
    const result = await generateImage({
      prompt: finalPrompt,
      aspect: task.aspect,
      tier: task.tier,
      n: 1,
      imageModel: "wanx-v1",
    });
    const ms = Date.now() - started;
    const out = {
      ok: true,
      task: task.name,
      aspect: task.aspect,
      tier: task.tier,
      size: result.size || size,
      provider: result.provider,
      model: (result as { model?: string }).model,
      usedRef: (result as { usedRef?: boolean }).usedRef,
      hasB64: Boolean(result.b64),
      hasUrl: Boolean(result.url),
      latencyMs: ms,
      url: result.url ? result.url.slice(0, 120) : "",
    };
    console.log(JSON.stringify(out, null, 2));

    if (result.b64) {
      const file = join(process.cwd(), "scripts", "smoke-image-studio-out.png");
      writeFileSync(file, Buffer.from(result.b64, "base64"));
      console.log("saved:", file);
    }
    writeFileSync(
      join(process.cwd(), "scripts", "smoke-image-studio-result.json"),
      JSON.stringify(out, null, 2)
    );
    console.log(out.hasB64 || out.hasUrl ? "\n结论: 胜任 ✓" : "\n结论: 返回空图 ✗");
    process.exit(out.hasB64 || out.hasUrl ? 0 : 1);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const fail = {
      ok: false,
      task: task.name,
      error: message.slice(0, 500),
      latencyMs: Date.now() - started,
    };
    console.error(JSON.stringify(fail, null, 2));
    writeFileSync(
      join(process.cwd(), "scripts", "smoke-image-studio-result.json"),
      JSON.stringify(fail, null, 2)
    );
    console.log("\n结论: 未通过 ✗");
    process.exit(1);
  }
}

void main();
