import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LANGUAGE_KEY, resolveLocale, translate, type Locale, type Values } from "@/lib/i18n";

type Language = { locale: Locale; setLocale: (locale: Locale) => void; t: (source: string, values?: Values) => string };
const Context = createContext<Language | null>(null);

function initialLocale(): Locale {
  let saved: string | null = null;
  try { saved = localStorage.getItem(LANGUAGE_KEY); } catch { /* Private browsers may disable storage. */ }
  return resolveLocale(saved, navigator.languages?.length ? navigator.languages : [navigator.language]);
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, updateLocale] = useState<Locale>(initialLocale);
  const setLocale = useCallback((next: Locale) => {
    updateLocale(next);
    try { localStorage.setItem(LANGUAGE_KEY, next); } catch { /* Switching still works for this visit. */ }
  }, []);
  const t = useCallback((source: string, values?: Values) => translate(locale, source, values), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale === "zh" ? "zh-CN" : "en";
    document.title = t("一棵圣诞树 · 来看看我的圣诞树");
    document.querySelector('meta[name="description"]')?.setAttribute("content", t("有空的话，帮我挂个装饰吧～") + " " + t("一颗星星、一只小袜子，或者一个姜饼人。"));
  }, [locale, t]);
  useEffect(() => {
    const sync = (event: StorageEvent) => {
      if (event.key === LANGUAGE_KEY) updateLocale(resolveLocale(event.newValue, navigator.languages));
    };
    window.addEventListener("storage", sync);
    return () => window.removeEventListener("storage", sync);
  }, []);
  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function useLanguage() {
  const language = useContext(Context);
  if (!language) throw new Error("LanguageProvider is missing");
  return language;
}
