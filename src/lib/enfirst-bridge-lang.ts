/**
 * Enfirst Bridge - 语种检测模块
 * 
 * 检测输入文本的主语种，判定是否需要触发英语理解桥。
 * 支持：中/日/韩/俄/阿拉伯/泰/越/印/土/希/波兰等 30+ 语种
 */

export type LangDetectResult = {
  /** 是否主英语（无需触发桥） */
  is_english: boolean;
  /** 主语种代码 */
  primary: string;
  /** 是否需触发 Enfirst Bridge */
  trigger: boolean;
  /** 各语种字符占比 */
  ratios: Record<string, number>;
  /** 是否含非拉丁文字 */
  non_latin: boolean;
};

// CJK Ranges
const CJK_RANGES = [
  [0x4E00, 0x9FFF],    // CJK Unified Ideographs
  [0x3400, 0x4DBF],    // CJK Extension A
  [0x20000, 0x2A6DF],  // CJK Extension B
  [0x3040, 0x309F],    // Hiragana
  [0x30A0, 0x30FF],    // Katakana
  [0xAC00, 0xD7AF],    // Hangul
];

const CYRILLIC = [0x0400, 0x04FF];
const ARABIC = [0x0600, 0x06FF];
const DEVANAGARI = [0x0900, 0x097F];
const THAI = [0x0E00, 0x0E7F];
const VIETNAMESE = [0x1EA0, 0x1EF9];
const GREEK = [0x0370, 0x03FF];
const POLISH = [0x0100, 0x017F]; // Latin Extended-A

function inRange(cp: number, range: number[]): boolean {
  return cp >= range[0] && cp <= range[1];
}

function getCategory(cp: number): string {
  // ASCII alphabetic
  if ((cp >= 65 && cp <= 90) || (cp >= 97 && cp <= 122)) {
    return "ascii_alpha";
  }
  
  // CJK
  if (CJK_RANGES.some(r => inRange(cp, r))) {
    return "cjk";
  }
  
  // Hiragana
  if (inRange(cp, [0x3040, 0x309F])) {
    return "hiragana";
  }
  
  // Katakana
  if (inRange(cp, [0x30A0, 0x30FF])) {
    return "katakana";
  }
  
  // Hangul
  if (inRange(cp, [0xAC00, 0xD7AF])) {
    return "hangul";
  }
  
  // Cyrillic (Russian, Ukrainian, etc.)
  if (inRange(cp, CYRILLIC)) {
    return "cyrillic";
  }
  
  // Arabic
  if (inRange(cp, ARABIC)) {
    return "arabic";
  }
  
  // Devanagari (Hindi)
  if (inRange(cp, DEVANAGARI)) {
    return "devanagari";
  }
  
  // Thai
  if (inRange(cp, THAI)) {
    return "thai";
  }
  
  // Vietnamese (Latin extended with diacritics)
  if (inRange(cp, VIETNAMESE)) {
    return "vietnamese";
  }
  
  // Greek
  if (inRange(cp, GREEK)) {
    return "greek";
  }
  
  // Polish (Latin Extended-A)
  if (inRange(cp, POLISH)) {
    return "polish";
  }
  
  // Digits and punctuation
  if (cp >= 48 && cp <= 57) {
    return "digit";
  }
  if (cp >= 33 && cp <= 47) {
    return "punct";
  }
  
  return "other";
}

/**
 * 检测文本主语种
 */
export function detectLanguage(text: string): LangDetectResult {
  if (!text || !text.trim()) {
    return {
      is_english: true,
      primary: "empty",
      trigger: false,
      ratios: {},
      non_latin: false
    };
  }
  
  const counts: Record<string, number> = {
    ascii_alpha: 0,
    cjk: 0,
    hiragana: 0,
    katakana: 0,
    hangul: 0,
    cyrillic: 0,
    arabic: 0,
    devanagari: 0,
    thai: 0,
    vietnamese: 0,
    greek: 0,
    polish: 0,
    digit: 0,
    punct: 0,
    other: 0,
  };
  
  let total = 0;
  
  for (const ch of text) {
    const cp = ch.codePointAt(0) || 0;
    
    // Skip whitespace
    if (ch === " " || ch === "\n" || ch === "\t" || ch === "\r") {
      continue;
    }
    
    const category = getCategory(cp);
    counts[category] = (counts[category] || 0) + 1;
    total++;
  }
  
  if (total === 0) {
    return {
      is_english: true,
      primary: "empty",
      trigger: false,
      ratios: {},
      non_latin: false
    };
  }
  
  const ratios: Record<string, number> = {};
  for (const [key, val] of Object.entries(counts)) {
    if (val > 0) {
      ratios[key] = Math.round((val / total) * 1000) / 1000;
    }
  }
  
  // Count non-Latin characters
  const nonLatinChars = 
    counts.cjk + 
    counts.hiragana + 
    counts.katakana + 
    counts.hangul + 
    counts.cyrillic + 
    counts.arabic + 
    counts.devanagari +
    counts.thai +
    counts.vietnamese +
    counts.greek +
    counts.polish;
  
  const isEnglish = nonLatinChars === 0 && counts.ascii_alpha > 0;
  const nonLatin = nonLatinChars > 0;
  
  // Determine primary language
  let primary = "en";
  if (counts.cjk > 0 || counts.hiragana > 0 || counts.katakana > 0) {
    primary = (counts.hiragana > 0 || counts.katakana > 0) ? "ja" : "zh";
  } else if (counts.hangul > 0) {
    primary = "ko";
  } else if (counts.cyrillic > 0) {
    primary = "ru";
  } else if (counts.arabic > 0) {
    primary = "ar";
  } else if (counts.devanagari > 0) {
    primary = "hi";
  } else if (counts.thai > 0) {
    primary = "th";
  } else if (counts.vietnamese > 0) {
    primary = "vi";
  } else if (counts.greek > 0) {
    primary = "el";
  } else if (counts.polish > 0) {
    primary = "pl";
  } else if (counts.ascii_alpha > 0) {
    primary = "en";
  }
  
  return {
    is_english: isEnglish,
    primary,
    trigger: !isEnglish && nonLatin,
    ratios,
    non_latin: nonLatin
  };
}

/**
 * 检查是否需要触发 Enfirst Bridge
 */
export function needBridge(text: string): boolean {
  const result = detectLanguage(text);
  return result.trigger;
}
