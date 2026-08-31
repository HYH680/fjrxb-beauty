/** World UI locales — code + native endonym + English name */

export type LocaleCode = string;

export type LocaleInfo = {
  code: LocaleCode;
  /** Native name shown in the picker */
  native: string;
  /** English name for search */
  en: string;
};

/** Major world languages (UI chrome). More can be added anytime. */
export const WORLD_LOCALES: LocaleInfo[] = [
  { code: "zh-CN", native: "简体中文", en: "Chinese (Simplified)" },
  { code: "zh-TW", native: "繁體中文", en: "Chinese (Traditional)" },
  { code: "en", native: "English", en: "English" },
  { code: "ja", native: "日本語", en: "Japanese" },
  { code: "ko", native: "한국어", en: "Korean" },
  { code: "es", native: "Español", en: "Spanish" },
  { code: "fr", native: "Français", en: "French" },
  { code: "de", native: "Deutsch", en: "German" },
  { code: "pt-BR", native: "Português (Brasil)", en: "Portuguese (Brazil)" },
  { code: "pt-PT", native: "Português (Portugal)", en: "Portuguese (Portugal)" },
  { code: "ru", native: "Русский", en: "Russian" },
  { code: "ar", native: "العربية", en: "Arabic" },
  { code: "hi", native: "हिन्दी", en: "Hindi" },
  { code: "id", native: "Bahasa Indonesia", en: "Indonesian" },
  { code: "th", native: "ไทย", en: "Thai" },
  { code: "vi", native: "Tiếng Việt", en: "Vietnamese" },
  { code: "ms", native: "Bahasa Melayu", en: "Malay" },
  { code: "tr", native: "Türkçe", en: "Turkish" },
  { code: "it", native: "Italiano", en: "Italian" },
  { code: "nl", native: "Nederlands", en: "Dutch" },
  { code: "pl", native: "Polski", en: "Polish" },
  { code: "uk", native: "Українська", en: "Ukrainian" },
  { code: "cs", native: "Čeština", en: "Czech" },
  { code: "ro", native: "Română", en: "Romanian" },
  { code: "hu", native: "Magyar", en: "Hungarian" },
  { code: "sv", native: "Svenska", en: "Swedish" },
  { code: "da", native: "Dansk", en: "Danish" },
  { code: "fi", native: "Suomi", en: "Finnish" },
  { code: "no", native: "Norsk", en: "Norwegian" },
  { code: "el", native: "Ελληνικά", en: "Greek" },
  { code: "he", native: "עברית", en: "Hebrew" },
  { code: "fa", native: "فارسی", en: "Persian" },
  { code: "ur", native: "اردو", en: "Urdu" },
  { code: "bn", native: "বাংলা", en: "Bengali" },
  { code: "ta", native: "தமிழ்", en: "Tamil" },
  { code: "te", native: "తెలుగు", en: "Telugu" },
  { code: "mr", native: "मराठी", en: "Marathi" },
  { code: "gu", native: "ગુજરાતી", en: "Gujarati" },
  { code: "kn", native: "ಕನ್ನಡ", en: "Kannada" },
  { code: "ml", native: "മലയാളം", en: "Malayalam" },
  { code: "pa", native: "ਪੰਜਾਬੀ", en: "Punjabi" },
  { code: "sw", native: "Kiswahili", en: "Swahili" },
  { code: "am", native: "አማርኛ", en: "Amharic" },
  { code: "ha", native: "Hausa", en: "Hausa" },
  { code: "yo", native: "Yorùbá", en: "Yoruba" },
  { code: "zu", native: "isiZulu", en: "Zulu" },
  { code: "af", native: "Afrikaans", en: "Afrikaans" },
  { code: "ca", native: "Català", en: "Catalan" },
  { code: "eu", native: "Euskara", en: "Basque" },
  { code: "gl", native: "Galego", en: "Galician" },
  { code: "sr", native: "Српски", en: "Serbian" },
  { code: "hr", native: "Hrvatski", en: "Croatian" },
  { code: "sk", native: "Slovenčina", en: "Slovak" },
  { code: "sl", native: "Slovenščina", en: "Slovenian" },
  { code: "bg", native: "Български", en: "Bulgarian" },
  { code: "lt", native: "Lietuvių", en: "Lithuanian" },
  { code: "lv", native: "Latviešu", en: "Latvian" },
  { code: "et", native: "Eesti", en: "Estonian" },
  { code: "fil", native: "Filipino", en: "Filipino" },
  { code: "my", native: "မြန်မာ", en: "Burmese" },
  { code: "km", native: "ខ្មែរ", en: "Khmer" },
  { code: "lo", native: "ລາວ", en: "Lao" },
  { code: "ne", native: "नेपाली", en: "Nepali" },
  { code: "si", native: "සිංහල", en: "Sinhala" },
  { code: "ka", native: "ქართული", en: "Georgian" },
  { code: "hy", native: "Հայերեն", en: "Armenian" },
  { code: "az", native: "Azərbaycan", en: "Azerbaijani" },
  { code: "kk", native: "Қазақша", en: "Kazakh" },
  { code: "uz", native: "Oʻzbekcha", en: "Uzbek" },
  { code: "mn", native: "Монгол", en: "Mongolian" },
  { code: "is", native: "Íslenska", en: "Icelandic" },
  { code: "ga", native: "Gaeilge", en: "Irish" },
  { code: "cy", native: "Cymraeg", en: "Welsh" },
];

export const DEFAULT_LOCALE = "zh-CN";
export const FALLBACK_LOCALE = "en";

export const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

export const LOCALE_STORAGE_KEY = "ai-supermarket:locale";

export function getLocaleInfo(code: string): LocaleInfo {
  const hit =
    WORLD_LOCALES.find((l) => l.code === code) ||
    WORLD_LOCALES.find((l) => l.code === DEFAULT_LOCALE) ||
    WORLD_LOCALES[0];
  if (!hit) {
    return { code: DEFAULT_LOCALE, native: "简体中文", en: "Chinese (Simplified)" };
  }
  return hit;
}

export function isRtlLocale(code: string) {
  return RTL_LOCALES.has(code.split("-")[0] || code);
}
