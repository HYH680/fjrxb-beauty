/**
 * Enfirst Bridge — non-English input → English understanding anchor.
 * Integrates `.cursor/skills/enfirst-bridge` into site guide / chat APIs.
 *
 * English understanding ≠ English output: replies still follow UI locale.
 */

import { detectLanguage, needBridge } from "./enfirst-bridge-lang";

export type EnfirstScenario = "dialog" | "code" | "image" | "copy" | "agent";

export type { LangDetectResult } from "./enfirst-bridge-lang";
export { detectLanguage, needBridge };

/** UI locale → model-facing reply language label (output language, not the English anchor). */
export function replyLanguageLabel(locale?: string): string {
  const code = (locale || "zh-CN").trim() || "zh-CN";
  if (code.startsWith("zh")) {
    return "Chinese (Simplified or Traditional to match the user)";
  }
  if (code === "en" || code.startsWith("en-")) return "English";
  if (code === "ja" || code.startsWith("ja-")) return "Japanese";
  if (code === "ko" || code.startsWith("ko-")) return "Korean";
  if (code.startsWith("es")) return "Spanish";
  if (code.startsWith("fr")) return "French";
  if (code.startsWith("de")) return "German";
  if (code.startsWith("pt")) return "Portuguese";
  if (code.startsWith("ru")) return "Russian";
  if (code.startsWith("ar")) return "Arabic";
  if (code.startsWith("vi")) return "Vietnamese";
  if (code.startsWith("th")) return "Thai";
  if (code.startsWith("id")) return "Indonesian";
  return `the language for locale "${code}" (use English if unsure)`;
}

function guessScenario(text: string): EnfirstScenario {
  if (
    /```|src\/|\.tsx?\b|\.jsx?\b|TypeError|handleSubmit|function\s+\w+/i.test(
      text
    )
  ) {
    return "code";
  }
  if (/画一|生成图|出图|watercolor|cyberpunk|画一个|文生图/i.test(text)) {
    return "image";
  }
  if (/slogan|文案|推文|产品介绍|面向.*群体/i.test(text)) {
    return "copy";
  }
  if (/每天|每周|工具|sendEmail|createTask|\/api\//i.test(text)) {
    return "agent";
  }
  return "dialog";
}

/** Short protocol block appended to guide system prompts. */
export function enfirstSystemAddon(responseLanguageLabel: string): string {
  return [
    "[Enfirst Bridge — understanding layer]",
    "- If the latest user message is non-English: internally form ONE straight English semantic anchor first (literal, no polish, keep identifiers/paths/brand names).",
    "- Reason from that English anchor only. Do NOT show the anchor unless the user asks.",
    `- User-visible reply language: ${responseLanguageLabel} (English understanding ≠ English output).`,
    "- Pure English / pure code / pure math: skip the bridge.",
    "- Many questions: still bridge once, then answer by priority in the reply language.",
  ].join("\n");
}

/**
 * Wrap the user turn so the model runs Enfirst when needed.
 * Returns original text when bridge should not trigger.
 */
export function wrapUserMessageForEnfirst(
  message: string,
  responseLanguageLabel: string,
  scenario: EnfirstScenario | "auto" = "auto"
): {
  content: string;
  bridged: boolean;
  detectedLang: string;
  scenario: EnfirstScenario | null;
} {
  const detected = detectLanguage(message);
  if (!needBridge(message)) {
    return {
      content: message,
      bridged: false,
      detectedLang: detected.primary,
      scenario: null,
    };
  }

  const sc = scenario === "auto" ? guessScenario(message) : scenario;
  const content = [
    `[Enfirst Bridge — ${sc}]`,
    `response_language: ${responseLanguageLabel}`,
    "Internally: straight-translate the user text below into one English anchor (R1 literal; keep code ids/paths/brands). Do not output the anchor.",
    `Then answer the user's intent in ${responseLanguageLabel} only.`,
    "",
    "User text:",
    message,
  ].join("\n");

  return {
    content,
    bridged: true,
    detectedLang: detected.primary,
    scenario: sc,
  };
}
