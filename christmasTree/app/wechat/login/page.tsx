"use client";
import { LanguageSwitch } from "@/components/language-switch";
import { useLanguage } from "@/components/language-provider";
import { useEffect, useRef, useState } from "react";
import type { WechatStatus } from "@/components/wechat-login";
export default function WechatLogin() {
  const { t } = useLanguage();
  const ticket = useRef("");
  const [ready, setReady] = useState(false), [busy, setBusy] = useState(false);
  const [error, setError] = useState(""), [returnTo, setReturnTo] = useState<string | null>(null);
  const [accountName, setAccountName] = useState("");
  useEffect(() => {
    // Read once, then remove the bearer token before any application network call.
    const value = new URLSearchParams(location.hash.slice(1)).get("ticket") ?? "";
    if (value) ticket.current = value;
    history.replaceState(null, "", "/wechat/login");
    if (!/^[A-Za-z0-9_-]{43}$/.test(ticket.current)) setError("链接不完整，请在公众号重新发送“登录”。");
    fetch("/api/wechat", { cache: "no-store" }).then(r => r.json() as Promise<WechatStatus>).then(s => {
      if (s.accountName) setAccountName(s.accountName);
      if (!s.ready) setError("微信登录还在准备中，请稍后再来。");
      setReady(!!s.ready);
    }).catch(() => setError("暂时无法连接，请稍后重新打开登录链接。"));
  }, []);
  async function login() {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/wechat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "login", ticket: ticket.current }) });
      const data = await response.json() as {error?:string;returnTo?:unknown};
      if (!response.ok) throw new Error(data.error ?? "暂时无法完成登录。");
      ticket.current = "";
      setReturnTo(typeof data.returnTo === "string" && /^\/(?:\?tree=[a-f0-9-]{36})?$/.test(data.returnTo) ? data.returnTo : "/");
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <main className="wechat-login-page"><div className="paper-grain" aria-hidden="true"/><section className="auth-sheet"><div className="auth-language"><LanguageSwitch/></div>
    <p className="eyebrow">A LITTLE CHRISTMAS</p><div className="auth-star" aria-hidden="true">✧</div>
    <h1>{returnTo ? t("欢迎回来，冬日的朋友") : t("小树在等你")}</h1>
    {returnTo ? <><p className="modal-lead">{t("微信登录完成了。")}<br/>{t("把一份心意，挂在枝头吧。")}</p><a className="button primary full" href={returnTo}>{t("回到圣诞树")}</a>
      <a className="text-button full" href={`${returnTo}${returnTo.includes("?") ? "&" : "?"}connect=wechat`}>{t("以前用 ChatGPT 登录过？找回原来的树")}</a></> : <>
      <p className="modal-lead">{t("使用你在「{account}」发消息的微信身份登录。",{account:accountName||t("公众号")})}<br/>{t("请只使用你本人收到的链接，不要使用他人转发的链接。")}</p>
      <button className="button primary full" disabled={!ready || busy || !ticket.current} onClick={() => void login()}>{busy ? t("正在打开小屋…") : t("确认微信登录")}</button>
      <p className="privacy-note">{t("不要求关注公众号，也不会公开你的微信身份。")}</p></>}
    {error && <p role="alert" className="auth-error">{t(error)}</p>}
    <a className="text-button full" href="/">{t("先看看圣诞树")}</a>
  </section></main>;
}
