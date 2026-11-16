import { useLanguage } from "@/components/language-provider";
import { useEffect, useRef, useState } from "react";
import { ArrowUpRight, Mail } from "lucide-react";

export type AuthStatus = { available: boolean; signedIn: boolean; name: string; emailLinked: boolean; restoreAvailable?: boolean };
export async function authApi<T = Record<string, unknown>>(data?: Record<string, unknown>): Promise<T> {
  const response = await fetch("/api/auth", { cache: "no-store", ...(data ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "暂时没能完成，请再试一次。");
  return result;
}

export function EmailLogin({ status, linkCurrent = false, editName = false, onComplete }: {
  status: AuthStatus; linkCurrent?: boolean; editName?: boolean; onComplete: (status: AuthStatus) => Promise<void>;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<"email" | "code" | "name">(editName || (status.signedIn && !linkCurrent) ? "name" : "email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState(status.name);
  const [challengeId, setChallenge] = useState("");
  const [wait, setWait] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    if (status.signedIn && !linkCurrent) { setName(status.name); setStep("name"); }
  }, [status.signedIn, status.name, linkCurrent]);
  useEffect(() => { if (!wait) return; const timer = setTimeout(() => setWait(n => Math.max(0, n - 1)), 1000); return () => clearTimeout(timer); }, [wait]);

  async function send() {
    setBusy(true); setError("");
    try {
      const result = await authApi<{ challengeId: string; retryAfter: number }>({ action: "request-code", email, linkCurrent });
      if (!mounted.current) return;
      setChallenge(result.challengeId); setCode(""); setWait(result.retryAfter); setStep("code");
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  async function submit() {
    if (step === "email") return send();
    setBusy(true); setError("");
    try {
      if (step === "code") {
        await authApi({ action: "verify-code", challengeId, code });
        const next = await authApi<AuthStatus>();
        if (!mounted.current) return;
        if (!next.name) { setStep("name"); return; }
        await onComplete(next);
      } else {
        await authApi({ action: "profile", name });
        const next = await authApi<AuthStatus>();
        if (mounted.current) await onComplete(next);
      }
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { if (mounted.current) setBusy(false); }
  }
  if (!status.available && step !== "name") return <p className="auth-notice">{t("邮箱登录正在准备中，请稍后再来。小树可以先慢慢看。")}</p>;
  return <form className="email-login" onSubmit={e => { e.preventDefault(); void submit(); }} aria-busy={busy}>
    <div className="login-motif"><Mail size={32}/></div>
    <p className="modal-lead">{step === "name" ? t("怎么称呼你？让朋友一眼认出这份心意。") : linkCurrent ? t("绑定邮箱后，就能用验证码回到原来的小树。") : t("一封验证码来信，就能回到树下。")}</p>
    {step === "email" && <><label className="field-label" htmlFor="login-email">{t("你的邮箱")}</label><input id="login-email" type="email" autoComplete="email" required maxLength={254} placeholder={t("填写常用邮箱")} value={email} disabled={busy} onChange={e => setEmail(e.target.value)}/><p className="input-hint">{t("QQ、163 等常用邮箱都可以，无需设置密码。")}</p></>}
    {step === "code" && <><p className="email-recipient">{t("验证码已发送到")}<strong>{email.trim()}</strong><br/>{t("10 分钟内有效，也请检查垃圾邮件。")}</p><label className="field-label" htmlFor="login-code">{t("6 位验证码")}</label><input id="login-code" className="code-input" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required value={code} disabled={busy} onChange={e => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}/><div className="code-actions"><button type="button" className="text-button" disabled={busy} onClick={() => { setStep("email"); setError(""); }}>{t("换一个邮箱")}</button><button type="button" className="text-button" disabled={busy || wait > 0} onClick={() => void send()}>{wait > 0 ? t("{seconds} 秒后可重发",{seconds:wait}) : t("重新发送验证码")}</button></div></>}
    {step === "name" && <><label className="field-label" htmlFor="profile-name">{t("姓名或昵称")}</label><input id="profile-name" autoComplete="nickname" maxLength={20} required placeholder={t("例如：小林")} value={name} disabled={busy} onChange={e => setName(e.target.value)}/><p className="input-hint">{t("会显示为「{tree}」，也会作为装饰的默认署名。",{tree:t("{name}的圣诞树",{name:name.trim()||t("你的名字")})})}</p></>}
    {error && <p className="auth-error" role="alert">{t(error)}</p>}
    <button className="button primary full" disabled={busy || (step === "code" && code.length !== 6) || (step === "name" && !name.trim())}>{busy ? t("稍等，正在准备…") : step === "email" ? t("获取验证码") : step === "code" ? linkCurrent ? t("验证并绑定邮箱") : t("验证并登录") : editName ? t("保存名字") : t("带着这个名字，去树下")}<ArrowUpRight size={17}/></button>
    <p className="privacy-note">{t("邮箱只用于登录，不会公开。姓名或昵称会显示在小树和署名上。")}</p>
  </form>;
}
