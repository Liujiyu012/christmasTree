import { createHmac, timingSafeEqual } from "node:crypto";
import type { Database } from "./database.ts";
import { AppError } from "./tree-service.ts";
import { SITE_ORIGIN } from "./wechat-config.ts";
import { sessionFor } from "./wechat-service.ts";

export const OLD_ORIGIN = "https://little-christmas-tree-2026-wishes.oddferret128.chatgpt.site";
export function verifyMigrationTicket(ticket: unknown, secret: string | undefined, now = Date.now()) {
  if (!secret || !/^[a-f0-9]{64}$/.test(secret)) throw new AppError(503, "原账号找回入口还在准备中。");
  if (typeof ticket !== "string" || ticket.length > 2000) throw new AppError(400, "找回凭证不完整。");
  const [payload, signature, extra] = ticket.split(".");
  if (extra || !/^[A-Za-z0-9_-]+$/.test(payload ?? "") || !/^[A-Za-z0-9_-]{43}$/.test(signature ?? "")) throw new AppError(400, "找回凭证不完整。");
  const expected = createHmac("sha256", Buffer.from(secret, "hex")).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new AppError(403, "找回凭证无效，请回原网站重新验证。");
  let value;
  try { value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")); } catch { throw new AppError(400, "找回凭证格式不正确。"); }
  if (value.v !== 1 || value.aud !== SITE_ORIGIN || typeof value.sub !== "string" || !value.sub || value.sub.length > 256 || value.sub.startsWith("wx:") || !/^[a-f0-9]{32}$/.test(value.nonce ?? "") || !Number.isSafeInteger(value.exp) || value.exp <= now || value.exp > now + 300_000) throw new AppError(410, "找回凭证已过期，请回原网站重新验证。");
  return value as { sub: string; nonce: string; exp: number };
}
export async function restoreAccount(db: Database, request: Request, ticket: unknown, secret: string | undefined, now = Date.now()) {
  const proof = verifyMigrationTicket(ticket, secret, now);
  return db.atomic(async tx => {
    const initial = await sessionFor(tx, request, now);
    if (!initial || now - initial.created_at > 300_000) throw new AppError(401, "请先用邮箱验证码重新登录，再找回原账号。");
    // Every tree write also takes this lock, preventing writes with the old ID
    // while an account is being mapped to its previous, proven identity.
    await tx.prepare("SELECT subject FROM wechat_accounts WHERE subject = ? FOR UPDATE").bind(initial.subject).first();
    const session = (await sessionFor(tx, request, now))!;
    if (session.user_id === proof.sub) return { ok: true };
    if (session.user_id !== "wx:" + session.subject && !(session.subject.startsWith("email:") && session.user_id === session.subject)) throw new AppError(409, "当前账号已关联其他原账号。");
    const oldData = await tx.prepare("SELECT id FROM trees WHERE owner_id = ? UNION ALL SELECT id FROM gifts WHERE sender_id = ? LIMIT 1").bind(proof.sub, proof.sub).first();
    if (!oldData) throw new AppError(409, "原账号内容尚未迁入，请稍后再试。原网站的内容仍会保留。");
    const currentData = await tx.prepare("SELECT id FROM trees WHERE owner_id = ? UNION ALL SELECT id FROM gifts WHERE sender_id = ? LIMIT 1").bind(session.user_id, session.user_id).first();
    if (currentData) throw new AppError(409, "当前账号已有新树或装饰，暂时不能自动合并。两边的内容都会保留。");
    try {
      await tx.prepare("INSERT INTO migration_receipts (nonce, user_id, consumed_at) VALUES (?, ?, ?)").bind(proof.nonce, proof.sub, now).run();
      await tx.prepare("UPDATE wechat_accounts SET user_id = ? WHERE subject = ?").bind(proof.sub, session.subject).run();
    } catch (error) {
      if ((error as {code?:string}).code === "23505") throw new AppError(409, "凭证已使用，或原账号已关联其他登录方式。");
      throw error;
    }
    return { ok: true };
  });
}
