/**
 * 用现有 QWEN_API_KEY 验证万相出图 + CosyVoice 配音。
 * node --env-file=.env scripts/test-dashscope-media.mjs
 */
const apiKey = process.env.QWEN_API_KEY?.trim();
if (!apiKey) {
  console.error("缺少 QWEN_API_KEY");
  process.exit(1);
}

const base = (process.env.DASHSCOPE_BASE_URL || "https://dashscope.aliyuncs.com").replace(
  /\/$/,
  ""
);
const prompt = process.argv[2] || "一只橙色小猫坐在窗台上，午后阳光，写实风格";

async function sleep(ms) {
  await new Promise((r) => setTimeout(r, ms));
}

console.log("1) 提交万相出图…");
const create = await fetch(
  `${base}/api/v1/services/aigc/text2image/image-synthesis`,
  {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-DashScope-Async": "enable",
    },
    body: JSON.stringify({
      model: process.env.IMAGE_MODEL || "wanx-v1",
      input: { prompt },
      parameters: { size: "1024*1024", n: 1 },
    }),
  }
);
const createBody = await create.text();
if (!create.ok) {
  console.error("出图提交失败", create.status, createBody.slice(0, 500));
  process.exit(1);
}
const created = JSON.parse(createBody);
const taskId = created.output?.task_id;
if (!taskId) {
  console.error("无 task_id", createBody.slice(0, 500));
  process.exit(1);
}
console.log("task_id", taskId);

let imageUrl = "";
for (let i = 0; i < 40; i++) {
  await sleep(1500);
  const poll = await fetch(`${base}/api/v1/tasks/${taskId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = await poll.json();
  const status = data.output?.task_status;
  process.stdout.write(`  ${status || "?"}\n`);
  if (status === "SUCCEEDED") {
    imageUrl = data.output?.results?.find((r) => r.url)?.url || "";
    break;
  }
  if (status === "FAILED" || status === "CANCELED") {
    console.error("出图失败", JSON.stringify(data.output).slice(0, 400));
    process.exit(1);
  }
}
if (!imageUrl) {
  console.error("出图超时");
  process.exit(1);
}
console.log("OK image", imageUrl.slice(0, 100) + "…");

console.log("2) CosyVoice 配音…");
const ttsRes = await fetch(`${base}/api/v1/services/audio/tts/SpeechSynthesizer`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    model: process.env.DASHSCOPE_TTS_MODEL || "cosyvoice-v2",
    input: {
      text: "你好，这是 AI 超市配音测试。",
      voice: process.env.DASHSCOPE_TTS_VOICE || "longxiaochun_v2",
      format: "mp3",
      sample_rate: 22050,
    },
  }),
});
const ttsBody = await ttsRes.text();
if (!ttsRes.ok) {
  console.error("配音失败", ttsRes.status, ttsBody.slice(0, 500));
  process.exit(1);
}
const tts = JSON.parse(ttsBody);
const audioUrl = tts.output?.audio?.url;
if (!audioUrl) {
  console.error("无音频 URL", ttsBody.slice(0, 500));
  process.exit(1);
}
const audio = await fetch(audioUrl);
const bytes = Buffer.from(await audio.arrayBuffer());
console.log("OK tts", audio.status, `bytes=${bytes.length}`, audioUrl.slice(0, 80) + "…");
console.log("全部通过：出图与配音可用现有千问密钥跑通。");
