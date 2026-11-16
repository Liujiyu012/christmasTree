import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { Database } from "./database.ts";
import { AppError } from "./tree-service.ts";
import { limitedText } from "./wechat-http.ts";

// A one-time, exact-content transfer. This endpoint is disabled unless the
// operator pins the SHA-256 of the reviewed snapshot in server configuration.
// The snapshot never ships in the frontend, build archive, or repository.
export async function importSnapshot(db: () => Database, request: Request, env: Record<string, string | undefined>, now = Date.now()) {
  const expected = env.MIGRATION_IMPORT_HASH, key = env.MIGRATION_SIGNING_KEY;
  if (!expected || !key) throw new AppError(404, "没有找到这个页面。");
  const body = await limitedText(request, 1_000_000);
  const time = request.headers.get("x-migration-time") ?? "";
  const provided = request.headers.get("x-migration-signature") ?? "";
  if (!/^\d{13}$/.test(time) || Math.abs(now-Number(time)) > 300_000 || !/^[a-f0-9]{64}$/.test(provided) || createHash("sha256").update(body).digest("hex") !== expected) throw new AppError(403, "迁移验证失败。");
  const signature = createHmac("sha256",Buffer.from(key,"hex")).update(time+"\n"+body).digest();
  if (!timingSafeEqual(signature,Buffer.from(provided,"hex"))) throw new AppError(403, "迁移验证失败。");
  const snapshot = JSON.parse(body);
  return db().atomic(async tx => {
    await tx.prepare("INSERT INTO migration_receipts (nonce,user_id,consumed_at) VALUES (?,?,?)").bind("initial-import",expected,now).run();
    for (const id of snapshot.cleanup.treeIds) await tx.prepare("DELETE FROM trees WHERE id = ?").bind(id).run();
    for (const subject of snapshot.cleanup.subjects) {
      await tx.prepare("DELETE FROM wechat_sessions WHERE subject = ?").bind(subject).run();
      await tx.prepare("DELETE FROM wechat_login_tokens WHERE subject = ?").bind(subject).run();
      await tx.prepare("DELETE FROM wechat_accounts WHERE subject = ?").bind(subject).run();
    }
    for (const t of snapshot.trees) await tx.prepare("INSERT INTO trees (id,owner_id,name,created_at) VALUES (?,?,?,?)").bind(t.id,t.owner_id,t.name,t.created_at).run();
    for (const a of snapshot.wechat_accounts) await tx.prepare("INSERT INTO wechat_accounts (subject,user_id) VALUES (?,?)").bind(a.subject,a.user_id).run();
    for (const g of snapshot.gifts) await tx.prepare("INSERT INTO gifts (id,tree_id,sender_id,kind,slot,signature,anonymous,body,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(g.id,g.tree_id,g.sender_id,g.kind,g.slot,g.signature,g.anonymous,g.body,g.created_at).run();
    return { imported: { trees: snapshot.trees.length, gifts: snapshot.gifts.length, accounts: snapshot.wechat_accounts.length } };
  });
}
