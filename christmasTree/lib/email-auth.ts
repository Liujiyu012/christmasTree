import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import type { Database } from "./database.ts";
import { AppError } from "./tree-service.ts";
import { digest } from "./wechat-crypto.ts";
import { readCookie, SESSION_COOKIE, SESSION_SECONDS, sessionFor, type WechatSession } from "./wechat-service.ts";

export type CodeSender = (email: string, code: string) => Promise<void>;
type Challenge = { id: string; email_key: string; code_hash: string; expires_at: number; attempts: number; delivered: boolean; consumed_at: number | null; link_subject: string | null; link_user_id: string | null; session_binding: string | null };
const TEN_MINUTES = 600_000;
const keyed = (secret: string, value: string) => createHmac("sha256", Buffer.from(secret, "hex")).update(value).digest("hex");
export function emailAuthReady(env: Record<string, string | undefined>) {
  return /^[a-f0-9]{64}$/.test(env.EMAIL_AUTH_SECRET ?? "") && !!env.SMTP_HOST && !!env.SMTP_USER && !!env.SMTP_PASS && env.EMAIL_LOGIN_ENABLED === "true";
}
function requireSecret(secret: string | undefined): string {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new AppError(503, "邮箱登录正在准备中，请稍后再试。");
  return secret;
}
export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") throw new AppError(400, "请填写正确的邮箱地址。");
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]{1,64}@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/.test(email) || email.startsWith(".") || email.split("@")[0].endsWith(".") || email.includes("..")) throw new AppError(400, "请填写正确的邮箱地址。");
  return email;
}
async function takeLimit(db: Database, bucket: string, maximum: number, period: number, now: number) {
  const row = await db.prepare(`INSERT INTO email_rate_limits (bucket, hits, resets_at) VALUES (?, 1, ?)
    ON CONFLICT(bucket) DO UPDATE SET
      hits = CASE WHEN email_rate_limits.resets_at <= ? THEN 1 ELSE email_rate_limits.hits + 1 END,
      resets_at = CASE WHEN email_rate_limits.resets_at <= ? THEN excluded.resets_at ELSE email_rate_limits.resets_at END
    WHERE email_rate_limits.resets_at <= ? OR email_rate_limits.hits < ? RETURNING hits`)
    .bind(bucket, now + period, now, now, now, maximum).first();
  if (!row) throw new AppError(429, "验证码发送较频繁，请稍后再试。每次发送后请等待 60 秒。");
}
export async function requestEmailCode(db: Database, request: Request, data: Record<string, unknown>, secretValue: string | undefined, send: CodeSender, clientIp: string, now = Date.now()) {
  const secret = requireSecret(secretValue), email = normalizeEmail(data.email);
  const emailKey = keyed(secret, "email\0" + email), ipKey = keyed(secret, "ip\0" + clientIp);
  const link = data.linkCurrent === true;
  const session = link ? await sessionFor(db, request, now) : null;
  if (link && !session) throw new AppError(401, "当前登录已过期，请先找回原账号再绑定邮箱。");
  const id = randomUUID(), code = randomInt(1_000_000).toString().padStart(6, "0");
  await db.atomic(async tx => {
    await takeLimit(tx, "global-day", 100, 86_400_000, now);
    await takeLimit(tx, "ip-hour:" + ipKey, 20, 3_600_000, now);
    await takeLimit(tx, "email-day:" + emailKey, 10, 86_400_000, now);
    await takeLimit(tx, "email-minute:" + emailKey, 1, 60_000, now);
    await tx.prepare("DELETE FROM email_login_challenges WHERE expires_at < ?").bind(now - 86_400_000).run();
    await tx.prepare("DELETE FROM email_rate_limits WHERE resets_at < ?").bind(now - 86_400_000).run();
    await tx.prepare("UPDATE email_login_challenges SET consumed_at = ? WHERE email_key = ? AND consumed_at IS NULL").bind(now, emailKey).run();
    await tx.prepare(`INSERT INTO email_login_challenges (id, email_key, code_hash, created_at, expires_at, link_subject, link_user_id, session_binding)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, emailKey, keyed(secret, "otp\0" + id + "\0" + code), now, now + TEN_MINUTES, session?.subject ?? null, session?.user_id ?? null, session ? digest(readCookie(request, SESSION_COOKIE)) : null).run();
  });
  try {
    await send(email, code);
    await db.prepare("UPDATE email_login_challenges SET delivered = true WHERE id = ? AND consumed_at IS NULL").bind(id).run();
  } catch {
    await db.prepare("UPDATE email_login_challenges SET consumed_at = ? WHERE id = ?").bind(Date.now(), id).run();
    // SMTP exception text can include recipients or credentials. Never log it.
    console.error(JSON.stringify({ event: "email_delivery", outcome: "failed" }));
    throw new AppError(503, "验证码暂时没能发出，请稍后重试。");
  }
  return { challengeId: id, expiresIn: TEN_MINUTES / 1000, retryAfter: 60 };
}
export async function verifyEmailCode(db: Database, request: Request, data: Record<string, unknown>, secretValue: string | undefined, now = Date.now()) {
  const secret = requireSecret(secretValue);
  if (typeof data.challengeId !== "string" || !/^[a-f0-9-]{36}$/.test(data.challengeId) || typeof data.code !== "string" || !/^\d{6}$/.test(data.code)) throw new AppError(400, "请输入邮件中的 6 位验证码。");
  const challengeId = data.challengeId, code = data.code;
  const outcome = await db.atomic(async tx => {
    const challenge = await tx.prepare("SELECT * FROM email_login_challenges WHERE id = ? FOR UPDATE").bind(challengeId).first<Challenge>();
    if (!challenge || challenge.consumed_at !== null || !challenge.delivered || challenge.expires_at <= now || challenge.attempts >= 5) return { error: "验证码已失效，请重新获取。", status: 410 };
    const expected = keyed(secret, "otp\0" + challengeId + "\0" + code);
    if (!timingSafeEqual(Buffer.from(expected), Buffer.from(challenge.code_hash))) {
      await tx.prepare("UPDATE email_login_challenges SET attempts = attempts + 1 WHERE id = ?").bind(challengeId).run();
      return { error: challenge.attempts >= 4 ? "尝试次数已用完，请重新获取验证码。" : "验证码不正确，请核对邮件。", status: 400 };
    }
    if (challenge.link_subject) {
      await tx.prepare("SELECT subject FROM wechat_accounts WHERE subject = ? FOR UPDATE").bind(challenge.link_subject).first();
      const session = await sessionFor(tx, request, now);
      if (!session || session.subject !== challenge.link_subject || session.user_id !== challenge.link_user_id || digest(readCookie(request, SESSION_COOKIE)) !== challenge.session_binding) return { error: "登录状态已变化，请回原账号重新绑定邮箱。", status: 401 };
    }
    // A nullable placeholder gives concurrent first-time sign-ins a row to lock.
    await tx.prepare("INSERT INTO email_identities (email_key) VALUES (?) ON CONFLICT(email_key) DO NOTHING").bind(challenge.email_key).run();
    const identity = (await tx.prepare("SELECT subject FROM email_identities WHERE email_key = ? FOR UPDATE").bind(challenge.email_key).first<{subject: string | null}>())!;
    if (identity.subject && challenge.link_subject && identity.subject !== challenge.link_subject) return { error: "这个邮箱已有另一个账号，无法自动合并。请退出后用该邮箱登录；两边内容都会保留。", status: 409 };
    let subject = identity.subject ?? challenge.link_subject;
    if (!subject) {
      subject = "email:" + randomBytes(24).toString("hex");
      await tx.prepare("INSERT INTO wechat_accounts (subject, user_id) VALUES (?, ?)").bind(subject, subject).run();
    }
    if (!identity.subject) {
      const bound = await tx.prepare("SELECT email_key FROM email_identities WHERE subject = ?").bind(subject).first();
      if (bound) return { error: "当前账号已绑定邮箱，请使用原来的邮箱登录。", status: 409 };
      await tx.prepare("UPDATE email_identities SET subject = ? WHERE email_key = ?").bind(subject, challenge.email_key).run();
    }
    const token = randomBytes(32).toString("base64url");
    await tx.prepare("UPDATE email_login_challenges SET consumed_at = ? WHERE id = ?").bind(now, challengeId).run();
    await tx.prepare("DELETE FROM wechat_sessions WHERE expires_at < ?").bind(now).run();
    await tx.prepare("INSERT INTO wechat_sessions (token_hash, subject, created_at, expires_at) VALUES (?, ?, ?, ?)").bind(digest(token), subject, now, now + SESSION_SECONDS * 1000).run();
    return { token };
  });
  if ("error" in outcome) throw new AppError(outcome.status!, outcome.error!);
  return outcome.token!;
}
export async function profileFor(db: Database, session: WechatSession) {
  const saved = await db.prepare("SELECT name FROM account_profiles WHERE user_id = ?").bind(session.user_id).first<{name:string}>();
  const tree = saved ? null : await db.prepare("SELECT name FROM trees WHERE owner_id = ?").bind(session.user_id).first<{name:string}>();
  const email = await db.prepare("SELECT email_key FROM email_identities WHERE subject = ?").bind(session.subject).first();
  return { name: saved?.name ?? tree?.name ?? "", emailLinked: !!email };
}
export async function saveProfile(db: Database, request: Request, name: unknown) {
  if (typeof name !== "string" || !name.trim() || [...name.trim()].length > 20) throw new AppError(400, "请填写 1～20 个字的姓名或昵称。");
  const value = name.trim();
  return db.atomic(async tx => {
    const initial = await sessionFor(tx, request);
    if (!initial) throw new AppError(401, "请先用邮箱验证码登录。");
    await tx.prepare("SELECT subject FROM wechat_accounts WHERE subject = ? FOR UPDATE").bind(initial.subject).first();
    const session = await sessionFor(tx, request);
    if (!session) throw new AppError(401, "登录已过期，请重新登录。");
    await tx.prepare("INSERT INTO account_profiles (user_id, name) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET name = excluded.name").bind(session.user_id, value).run();
    await tx.prepare("UPDATE trees SET name = ? WHERE owner_id = ?").bind(value, session.user_id).run();
    return { ok: true, name: value };
  });
}
