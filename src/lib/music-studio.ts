/** AI 配乐：先出可投喂音乐平台的方案与提示词 */

export type MusicUseCase = "bgm" | "intro" | "course" | "ad";

export const MUSIC_USE_CASES: {
  id: MusicUseCase;
  label: string;
  hint: string;
}[] = [
  { id: "bgm", label: "短视频 BGM", hint: "循环底噪" },
  { id: "intro", label: "广告片头", hint: "3–15 秒" },
  { id: "course", label: "课程配乐", hint: "轻、不抢人声" },
  { id: "ad", label: "投放广告", hint: "抓耳钩子" },
];

export const MUSIC_MOODS = [
  "轻松明亮",
  "温暖治愈",
  "专业稳重",
  "紧张促销",
  "科技未来",
  "国风雅致",
];

export function buildMusicBrief(input: {
  prompt: string;
  useCase?: MusicUseCase;
  mood?: string;
  durationSec?: number;
}) {
  const useCase = input.useCase || "bgm";
  const mood = input.mood || "轻松明亮";
  const duration = Math.min(60, Math.max(5, input.durationSec || 15));
  const useLabel =
    MUSIC_USE_CASES.find((item) => item.id === useCase)?.label || "短视频 BGM";
  const user = input.prompt.trim();

  const structure =
    useCase === "intro" || useCase === "ad"
      ? [
          `0–2s 钩子击点（${mood}）`,
          `2–${Math.max(3, duration - 2)}s 主题展开`,
          `末 1–2s 收尾留白，方便叠标板`,
        ]
      : useCase === "course"
        ? [
            `全程轻底噪，音量低于人声`,
            `无明显人声采样与强鼓点`,
            `${duration}s 可循环或淡出`,
          ]
        : [
            `前 3s 进主题`,
            `中段保持律动，不抢旁白`,
            `${duration}s 可循环淡出`,
          ];

  const sunoPrompt = [
    `${mood} instrumental`,
    useCase === "course" ? "soft background, no vocals, study friendly" : "catchy but clean",
    useCase === "intro" || useCase === "ad" ? "short intro sting, modern" : "loopable bed",
    user ? `inspired by: ${user.slice(0, 120)}` : "",
    `${duration} seconds`,
  ]
    .filter(Boolean)
    .join(", ");

  const zhPrompt = [
    `用途：${useLabel}`,
    `情绪：${mood}`,
    `时长约 ${duration} 秒`,
    user ? `需求：${user}` : "",
    "纯器乐、无歌词、适合商用口播叠底",
  ]
    .filter(Boolean)
    .join("；");

  return {
    provider: "music-brief",
    useCase,
    mood,
    durationSec: duration,
    title: `${useLabel} · ${mood}`,
    zhPrompt,
    sunoPrompt,
    structure,
      nextStep:
      "配置 SUNO_API_KEY 后可在工作台直接成曲；也可把英文提示词贴到自有 Suno 账号生成。",
  };
}
