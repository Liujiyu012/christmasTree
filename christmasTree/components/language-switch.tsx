import { Globe2 } from "lucide-react";
import { useLanguage } from "./language-provider";
import "./language-switch.css";

export function LanguageSwitch() {
  const { locale, setLocale } = useLanguage();
  return <div className="language-switch" role="group" aria-label="Language / 语言">
    <Globe2 size={14} aria-hidden="true"/>
    <button type="button" lang="zh-CN" aria-label="切换为中文" aria-pressed={locale === "zh"} onClick={() => setLocale("zh")}>中文</button>
    <span aria-hidden="true">/</span>
    <button type="button" lang="en" aria-label="Switch to English" aria-pressed={locale === "en"} onClick={() => setLocale("en")}>EN</button>
  </div>;
}
