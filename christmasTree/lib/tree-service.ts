import type { Database } from "./database.ts";
import { DEFAULT_DESIGN, isTreeDesign } from "./tree-design.ts";
type Tree = { id: string; owner_id: string; name: string; created_at: number; topper: number; shape: number; base: number };
type Gift = { id: string; tree_id: string; sender_id: string; kind: number; slot: number; signature: string; anonymous: number; body: string; created_at: number; letter_version: number; letter_read_version: number };
export class AppError extends Error {
  status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}
const clean = (v: unknown, limit: number) => typeof v === "string" ? v.trim().slice(0, limit) : "";
function requireUser(user: string | null): string {
  if (!user) throw new AppError(401, "先登录，就能把心意留在这里，也能随时找回自己的信。");
  return user;
}
async function getTree(db: Database, id: string) {
  const tree = await db.prepare("SELECT * FROM trees WHERE id = ?").bind(id).first<Tree>();
  if (!tree) throw new AppError(404, "没有找到这棵树，请检查朋友发来的邀请链接。");
  return tree;
}
async function unreadLetters(db: Database, tree: Tree) {
  const row = await db.prepare("SELECT COUNT(*)::integer AS count FROM gifts WHERE tree_id = ? AND sender_id != ? AND body != '' AND letter_version > letter_read_version").bind(tree.id, tree.owner_id).first<{count:number}>();
  return row?.count ?? 0;
}
export async function readTree(db: Database, user: string | null, id: string | null, letters = false) {
  const tree = id ? await getTree(db, id) : user ? await db.prepare("SELECT * FROM trees WHERE owner_id = ?").bind(user).first<Tree>() : null;
  if (!tree) return { signedIn: !!user, tree: null, gifts: [], mine: null };
  const owner = tree.owner_id === user;
  if (letters) {
    requireUser(user);
    const result = owner
      ? await db.prepare("SELECT * FROM gifts WHERE tree_id = ? AND body != '' ORDER BY created_at DESC").bind(tree.id).all<Gift>()
      : await db.prepare("SELECT * FROM gifts WHERE tree_id = ? AND sender_id = ? AND body != '' ORDER BY created_at DESC").bind(tree.id, user).all<Gift>();
    return { letters: result.results.map(g => ({ id: g.id, body: g.body, signature: g.anonymous ? "一位悄悄想念你的人" : g.signature, anonymous: !!g.anonymous, createdAt: g.created_at, mine: g.sender_id === user,
      version: g.letter_version, unread: owner && g.sender_id !== user && g.letter_version > g.letter_read_version })) };
  }
  const result = await db.prepare("SELECT id, kind, slot, signature, anonymous, sender_id FROM gifts WHERE tree_id = ? ORDER BY slot").bind(tree.id).all<Gift>();
  const mine = user ? await db.prepare("SELECT * FROM gifts WHERE tree_id = ? AND sender_id = ?").bind(tree.id, user).first<Gift>() : null;
  // Hide anonymous signatures and the owner's self-gift signature from visitors.
  return {
    signedIn: !!user,
    ...(owner ? {unreadCount: await unreadLetters(db, tree)} : {}),
    tree: { id: tree.id, name: tree.name, isOwner: owner, createdAt: tree.created_at, design: { topper: tree.topper, shape: tree.shape, base: tree.base } },
    gifts: result.results.map(g => ({ id: g.id, kind: g.kind, slot: g.slot, name: g.anonymous || (g.sender_id === tree.owner_id && !owner) ? "一位朋友" : g.signature, mine: g.sender_id === user, nameHidden: !!g.anonymous || (g.sender_id === tree.owner_id && !owner) })),
    mine: mine ? { id: mine.id, kind: mine.kind, slot: mine.slot, signature: mine.signature, anonymous: !!mine.anonymous, body: mine.body } : null,
  };
}
export async function writeTree(db: Database, user: string | null, data: Record<string, unknown>) {
  const userId = requireUser(user);
  if (data.action === "create") {
    const name = clean(data.name, 20);
    if (!name) throw new AppError(400, "给这棵树写一个主人的昵称吧。");
    const existing = await db.prepare("SELECT id FROM trees WHERE owner_id = ?").bind(userId).first<{id:string}>();
    if (existing) return { id: existing.id };
    const design = data.design === undefined ? DEFAULT_DESIGN : data.design;
    if (!isTreeDesign(design)) throw new AppError(400, "请分别选择树顶、树形和底饰。");
    const id = crypto.randomUUID();
    await db.prepare("INSERT INTO trees (id, owner_id, name, created_at, topper, shape, base) VALUES (?, ?, ?, ?, ?, ?, ?) ON CONFLICT(owner_id) DO NOTHING").bind(id, userId, name, Date.now(), design.topper, design.shape, design.base).run();
    return await db.prepare("SELECT id FROM trees WHERE owner_id = ?").bind(userId).first();
  }
  const tree = await getTree(db, clean(data.treeId, 80));
  if (data.action === "read-letter") {
    if (tree.owner_id !== userId) throw new AppError(403, "只有树主人可以标记收到的信件。");
    if (!Number.isSafeInteger(data.version) || (data.version as number) < 1) throw new AppError(400, "请重新打开这封信。");
    // Compare the version read by the client: a concurrent edit must stay unread.
    const result = await db.prepare("UPDATE gifts SET letter_read_version = letter_version WHERE id = ? AND tree_id = ? AND body != '' AND sender_id != ? AND letter_version = ? RETURNING id")
      .bind(clean(data.letterId, 80), tree.id, userId, data.version).first();
    if (!result) throw new AppError(409, "这封信有了更新，请回到信箱重新打开。");
    return { ok: true, unreadCount: await unreadLetters(db, tree) };
  }
  if (data.action === "customize") {
    if (tree.owner_id !== userId) throw new AppError(403, "只有树主人可以定制小树。");
    if (!isTreeDesign(data.design)) throw new AppError(400, "请分别选择树顶、树形和底饰。");
    const { topper, shape, base } = data.design;
    await db.prepare("UPDATE trees SET topper = ?, shape = ?, base = ? WHERE id = ?").bind(topper, shape, base, tree.id).run();
    return { ok: true };
  }
  if (data.action === "rename") {
    if (tree.owner_id !== userId) throw new AppError(403, "只有树主人可以修改名字。");
    const name = clean(data.name, 20);
    if (!name) throw new AppError(400, "昵称不能为空。");
    await db.prepare("UPDATE trees SET name = ? WHERE id = ?").bind(name, tree.id).run();
    return { ok: true };
  }
  if (data.action === "remove") {
    const gift = await db.prepare("SELECT id, sender_id FROM gifts WHERE id = ? AND tree_id = ?").bind(clean(data.giftId, 80), tree.id).first<Gift>();
    if (!gift) throw new AppError(404, "这件装饰已经被收回了。");
    if (gift.sender_id !== userId) throw new AppError(403, "只能收回自己的装饰。");
    await db.prepare("DELETE FROM gifts WHERE id = ? AND tree_id = ?").bind(gift.id, tree.id).run();
    return { ok: true };
  }
  if (data.action !== "decorate") throw new AppError(400, "没有找到这个操作。");
  if (!Number.isInteger(data.kind) || (data.kind as number) < 0 || (data.kind as number) >= 30 || !Number.isInteger(data.slot) || (data.slot as number) < 0 || (data.slot as number) >= 30) throw new AppError(400, "请选择一件装饰和树上的一个空位置。");
  if (typeof data.body !== "string" || data.body.length > 500 || typeof data.anonymous !== "boolean") throw new AppError(400, "信件最多可以写 500 个字。");
  const signature = clean(data.signature, 20) || "一位朋友";
  try {
    await db.prepare(`INSERT INTO gifts (id, tree_id, sender_id, kind, slot, signature, anonymous, body, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(tree_id, sender_id) DO UPDATE SET kind = excluded.kind, slot = excluded.slot,
      signature = excluded.signature, anonymous = excluded.anonymous, body = excluded.body, created_at = excluded.created_at,
      letter_version = gifts.letter_version + CASE WHEN gifts.body IS DISTINCT FROM excluded.body OR gifts.signature IS DISTINCT FROM excluded.signature OR gifts.anonymous IS DISTINCT FROM excluded.anonymous THEN 1 ELSE 0 END`)
      .bind(crypto.randomUUID(), tree.id, userId, data.kind, data.slot, signature, data.anonymous ? 1 : 0, data.body.trim(), Date.now()).run();
  } catch (error) {
    if ((error as {code?:string}).code === "23505") throw new AppError(409, "这个位置刚被朋友选走了，请再挑一个位置。");
    throw error;
  }
  return { ok: true };
}
