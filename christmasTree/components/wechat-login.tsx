"use client";
import { useLanguage } from "@/components/language-provider";
import { useEffect, useState } from "react";
export type WechatStatus = { available: boolean; ready?: boolean; signedIn: boolean; accountName?: string; accountId?: string; qrPath?: string | null; linked?: boolean; restoreAvailable?: boolean };
export function WechatInstructions({ status, treeId }: { status: WechatStatus; treeId?: string }) {
  const { t } = useLanguage();
  const [notice, setNotice] = useState("");
  useEffect(() => {
    let active = true;
    fetch("/api/wechat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "start", treeId }) })
      .then(r => { if (!r.ok && active) setNotice("暂时无法记住邀请位置，登录后可以重新打开朋友的邀请链接。"); })
      .catch(() => { if (active) setNotice("暂时无法记住邀请位置，登录后可以重新打开朋友的邀请链接。"); });
    return () => { active = false; };
  }, [treeId]);
  async function copy() {
    try { await navigator.clipboard.writeText(status.accountId ?? ""); setNotice("微信号已复制，去微信搜索公众号吧。"); }
    catch { setNotice("可以长按下方微信号复制，再去微信搜索。"); }
  }
  return <div className="wechat-instructions">
    <p className="modal-lead">{t("在微信里给「{account}」发送",{account:status.accountName||""})}<strong lang="zh-CN">登录</strong><br/>{t("点开收到的专属链接，就能回来挂一份心意。")}</p>
    {status.qrPath && <img className="wechat-qr" src={status.qrPath} alt={t("{account}的公众号二维码",{account:status.accountName||""})}/>}
    <div className="wechat-account"><span>{status.accountName}</span><code>{status.accountId}</code></div>
    <button className="button primary full" onClick={() => void copy()}>{t("复制公众号微信号")}</button>
    <p className="privacy-note">{t("不要求关注。登录后会在当前浏览器记住你，最长 30 天。")}</p>
    {notice && <p className="auth-notice" role="status">{t(notice)}</p>}
  </div>;
}
