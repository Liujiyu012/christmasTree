import type { Database } from "./database.ts";
import { createHmac, randomBytes } from "node:crypto";
import { AppError } from "./tree-service.ts";
import { SITE_ORIGIN, type WechatConfig } from "./wechat-config.ts";
import { decryptMessage, digest, encryptReply, verifySignature, xmlEscape, xmlField } from "./wechat-crypto.ts";

const FIVE_MINUTES = 300_000;
export const SESSION_SECONDS = 30 * 24 * 60 * 60;
export const SESSION_COOKIE = "__Host-christmas-wx";
export const RETURN_COOKIE = "__Host-christmas-return";
export type WechatSession = { subject: string; user_id: string; created_at: number };
const tokenPattern = /^[A-Za-z0-9_-]{43}$/;
export const cookie = (name: string, value: string, seconds: number) => `${name}=${value}; Path=/; Max-Age=${seconds}; Secure; HttpOnly; SameSite=Lax`;
export function readCookie(request: Request, name: string) {
  const values = (request.headers.get("cookie") ?? "").split(";").map(s => s.trim()).filter(s => s.startsWith(name + "="));
  return values.length === 1 ? values[0].slice(name.length + 1) : "";
}
export function safeReturn(treeId: unknown) {
  return typeof treeId === "string" && /^[a-f0-9-]{36}$/.test(treeId) ? `/?tree=${treeId}` : "/";
}
export async function sessionFor(db: Database, request: Request, now = Date.now()) {
  const token = readCookie(request, SESSION_COOKIE);
  if (!tokenPattern.test(token)) return null;
  return db.prepare(`SELECT s.subject, a.user_id, s.created_at FROM wechat_sessions s
    JOIN wechat_accounts a ON a.subject = s.subject WHERE s.token_hash = ? AND s.expires_at > ?`)
    .bind(digest(token), now).first<WechatSession>();
}
export async function consumeLogin(db: Database, token: unknown, now = Date.now()) {
  if (typeof token !== "string" || !tokenPattern.test(token)) throw new AppError(400, "登录链接不完整，请在公众号重新发送“登录”。");
  const session = randomBytes(32).toString("base64url"), hash = digest(token);
  // PostgreSQL rechecks the predicate after concurrent UPDATEs acquire the row
  // lock. Consuming the ticket and creating its session are one SQL statement.
  const result = await db.prepare(`WITH consumed AS (
    UPDATE wechat_login_tokens SET consumed_at = ?
    WHERE token_hash = ? AND expires_at > ? AND consumed_at IS NULL
    RETURNING subject
  ) INSERT INTO wechat_sessions (token_hash, subject, created_at, expires_at)
    SELECT ?, subject, ?, ? FROM consumed RETURNING token_hash`)
    .bind(now, hash, now, digest(session), now, now + SESSION_SECONDS * 1000).run();
  if (result.meta.changes !== 1) throw new AppError(410, "这封登录邀请已使用或过期，请在公众号重新发送“登录”。");
  return session;
}
export async function revokeSession(db: Database, request: Request) {
  const token = readCookie(request, SESSION_COOKIE);
  if (tokenPattern.test(token)) await db.prepare("DELETE FROM wechat_sessions WHERE token_hash = ?").bind(digest(token)).run();
}

export function verifyWebhook(config: WechatConfig, params: URLSearchParams, now = Date.now()) {
  const echo = params.get("echostr") ?? "";
  if (!echo || echo.length > 2048) throw new AppError(400, "缺少微信验证参数。");
  if (params.has("msg_signature")) {
    verifySignature(config, params, echo, now);
    return decryptMessage(echo, config);
  }
  verifySignature(config, params, undefined, now);
  return echo;
}

export async function receiveMessage(db: Database, config: WechatConfig, params: URLSearchParams, body: string, now = Date.now()) {
  if (params.get("encrypt_type") !== "aes") throw new AppError(403, "请使用微信消息安全模式。");
  const encrypted = xmlField(body, "Encrypt");
  verifySignature(config, params, encrypted, now);
  const message = decryptMessage(encrypted, config);
  const type = xmlField(message, "MsgType");
  const category = ["text", "image", "voice", "video", "shortvideo", "location", "link", "event"].includes(type) ? type : "other";
  if (!config.enabled || type !== "text") {
    let eventType;
    if (type === "event") {
      try {
        const event = xmlField(message, "Event");
        eventType = ["subscribe", "unsubscribe", "SCAN", "LOCATION", "CLICK", "VIEW", "user_enter_tempsession"].includes(event) ? event : "other";
      } catch { eventType = "unknown"; }
    }
    logMessageOutcome(category, config.enabled ? "non_text" : "disabled", eventType);
    return "success";
  }
  if (!["登录", "登陆"].includes(xmlField(message, "Content").trim())) {
    logMessageOutcome(category, "not_login");
    return "success";
  }
  const sender = xmlField(message, "FromUserName"), recipient = xmlField(message, "ToUserName");
  const msgId = xmlField(message, "MsgId"), created = xmlField(message, "CreateTime");
  if (!/^[\w-]{5,128}$/.test(sender) || !/^[\w-]{3,128}$/.test(recipient) || !/^\d{1,30}$/.test(msgId) || !/^\d{10}$/.test(created) || Math.abs(Number(created) * 1000 - now) > FIVE_MINUTES) throw new AppError(403, "微信消息已过期或格式不正确。");
  // No follow-status lookup: identity comes only from WeChat's verified message.
  const subject = digest(config.appId + "\0" + sender);
  const messageId = digest(config.appId + "\0" + sender + "\0" + msgId);
  // Stable on delivery retries, but cannot be predicted without the 256-bit secret.
  const token = createHmac("sha256", Buffer.from(config.aesKey + "=", "base64")).update("christmas-login\0" + messageId).digest("base64url");
  await db.batch([
    db.prepare("DELETE FROM wechat_login_tokens WHERE expires_at < ?").bind(now - 86_400_000),
    db.prepare("DELETE FROM wechat_sessions WHERE expires_at < ?").bind(now),
    db.prepare("INSERT INTO wechat_accounts (subject, user_id) VALUES (?, ?) ON CONFLICT(subject) DO NOTHING").bind(subject, "wx:" + subject),
    db.prepare("INSERT INTO wechat_login_tokens (token_hash, subject, message_id, expires_at) VALUES (?, ?, ?, ?) ON CONFLICT(message_id) DO NOTHING")
      .bind(digest(token), subject, messageId, Number(created) * 1000 + FIVE_MINUTES),
  ]);
  // Fragment keeps the bearer token out of HTTP request URLs, server logs and Referer.
  const link = `${SITE_ORIGIN}/wechat/login#ticket=${token}`;
  const content = `你的圣诞树登录邀请来了。\n<a href="${link}">点这里，回到圣诞树</a>\n链接 5 分钟内有效，仅供你本人使用，请勿转发。不需要关注公众号。`;
  const reply = `<xml><ToUserName>${xmlEscape(sender)}</ToUserName><FromUserName>${xmlEscape(recipient)}</FromUserName><CreateTime>${Math.floor(now / 1000)}</CreateTime><MsgType>text</MsgType><Content><![CDATA[${content}]]></Content></xml>`;
  logMessageOutcome(category, "login_reply");
  return encryptReply(reply, config, params.get("nonce")!, now);
}

function logMessageOutcome(category: string, outcome: string, eventType?: string) {
  // Fixed categories only; no text, identifiers, encrypted payloads, or tickets.
  console.info(JSON.stringify({ event: "wechat_message", category, outcome, eventType }));
}
