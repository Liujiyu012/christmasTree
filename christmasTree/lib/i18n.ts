import { EN } from "./translations.ts";

export type Locale = "zh" | "en";
export type Values = Record<string, string | number>;
export const LANGUAGE_KEY = "christmas-language";

export function resolveLocale(saved: unknown, languages: readonly string[] = []): Locale {
  if (saved === "zh" || saved === "en") return saved;
  for (const language of languages) {
    if (/^zh(?:-|$)/i.test(language)) return "zh";
    if (/^en(?:-|$)/i.test(language)) return "en";
  }
  return "zh";
}

export function translate(locale: Locale, source: string, values: Values = {}): string {
  const copy = locale === "en" && Object.hasOwn(EN, source) ? EN[source] : source;
  // A single pass preserves names containing braces, markup, or other copy keys.
  return copy.replace(/\{(\w+)\}/g, (match, key: string) => Object.hasOwn(values, key) ? String(values[key]) : match);
}
