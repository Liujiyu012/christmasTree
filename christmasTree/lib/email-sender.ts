import nodemailer from "nodemailer";
import type { CodeSender } from "./email-auth.ts";

export function smtpCodeSender(env: Record<string, string | undefined>): CodeSender {
  return async (email, code) => {
    const port = Number(env.SMTP_PORT ?? "465");
    if (!env.SMTP_HOST || !env.SMTP_USER || !env.SMTP_PASS || ![465, 587].includes(port)) throw new Error("Email sender unavailable");
    const transport = nodemailer.createTransport({
      host: env.SMTP_HOST, port, secure: port === 465, requireTLS: true,
      auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
      connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000,
      disableFileAccess: true, disableUrlAccess: true, logger: false, debug: false,
    });
    try {
      const result = await transport.sendMail({
        from: { name: "一棵圣诞树", address: env.SMTP_USER }, to: email,
        subject: "你的圣诞树登录验证码",
        text: `你的登录验证码是：${code}\n\n10 分钟内有效，请回到圣诞树网站填写。\n验证码仅供本人使用，请勿转发。若不是你发起的登录，请忽略这封邮件。`,
        html: `<div style="background:#f7f4eb;padding:32px;color:#304d3d;font-family:sans-serif"><p>一棵圣诞树 · 冬日来信</p><h2>欢迎回到树下</h2><p>你的登录验证码</p><p style="font-size:32px;letter-spacing:8px;color:#8c4147">${code}</p><p>10 分钟内有效，请回到网站填写。</p><p style="font-size:12px;color:#777">验证码仅供本人使用，请勿转发。若不是你发起的登录，请忽略这封邮件。</p></div>`,
      });
      if (!result.accepted?.length) throw new Error("Email not accepted");
    } finally { transport.close(); }
  };
}
