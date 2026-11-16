import type { Database } from "./database.ts";
import { readTree, writeTree, AppError } from "./tree-service.ts";
import { SITE_ORIGIN, wechatConfig } from "./wechat-config.ts";
import { consumeLogin, cookie, readCookie, receiveMessage, RETURN_COOKIE, revokeSession, safeReturn, SESSION_COOKIE, SESSION_SECONDS, sessionFor, verifyWebhook } from "./wechat-service.ts";
import { errorResponse, json, limitedText, noStoreHeaders, sameOriginJSON } from "./wechat-http.ts";
import { restoreAccount } from "./migration.ts";
import { importSnapshot } from "./import-snapshot.ts";
import { emailAuthReady, profileFor, requestEmailCode, saveProfile, verifyEmailCode, type CodeSender } from "./email-auth.ts";
import { smtpCodeSender } from "./email-sender.ts";

export function createHandler(getDatabase: () => Database, env: Record<string, string | undefined>, sendCode: CodeSender = smtpCodeSender(env)) {
  return async (request: Request, clientIp = "unknown") => {
    try {
      const url = new URL(request.url);
      const path = url.pathname.replace(/^\/\.netlify\/functions\/api(?=\/)/, "/api");
      if (!["GET", "POST"].includes(request.method)) return json({ error: "不支持这个请求方式。" }, 405);
      if (url.origin !== SITE_ORIGIN) throw new AppError(403, "请从圣诞树的正式网址打开。");
      const config = wechatConfig(env);
      if (path === "/api/auth" && request.method === "GET") {
        const session = readCookie(request, SESSION_COOKIE) ? await sessionFor(getDatabase(), request) : null;
        const profile = session ? await profileFor(getDatabase(), session) : { name: "", emailLinked: false };
        return json({ available: emailAuthReady(env), signedIn: !!session, ...profile,
          restoreAvailable: !!env.MIGRATION_SIGNING_KEY && !!session && (session.user_id === session.subject || session.user_id === "wx:" + session.subject) });
      }
      if (path === "/api/migration/import" && request.method === "POST") return json(await importSnapshot(getDatabase, request, env));
      if (path === "/api/wechat/webhook") {
        if (!config) throw new AppError(503, "微信登录尚未配置。");
        const post = request.method === "POST";
        const result = post
          ? await receiveMessage(getDatabase(), config, url.searchParams, await limitedText(request, 44000))
          : verifyWebhook(config, url.searchParams);
        return new Response(result, { headers: { ...noStoreHeaders, "Content-Type": post && result !== "success" ? "application/xml; charset=utf-8" : "text/plain; charset=utf-8" } });
      }
      if (path === "/api/wechat" && request.method === "GET") {
        const session = readCookie(request, SESSION_COOKIE) ? await sessionFor(getDatabase(), request) : null;
        return json({ available: !!config?.enabled && (!!config.visible || !!session), ready: !!config?.enabled,
          signedIn: !!session, linked: !!session && !session.user_id.startsWith("wx:"),
          restoreAvailable: !!env.MIGRATION_SIGNING_KEY,
          accountName: config?.accountName, accountId: config?.accountId, qrPath: config?.qrPath });
      }
      if (path === "/api/tree" && request.method === "GET") {
        if (!url.searchParams.get("id") && !readCookie(request, SESSION_COOKIE)) return json({ signedIn: false, tree: null, gifts: [], mine: null });
        const db = getDatabase(), session = await sessionFor(db, request);
        return json(await readTree(db, session?.user_id ?? null, url.searchParams.get("id"), url.searchParams.get("letters") === "1"));
      }
      if (request.method !== "POST" || !["/api/tree", "/api/wechat", "/api/auth"].includes(path)) return json({ error: "没有找到这个页面。" }, 404);
      const data = await sameOriginJSON(request);
      const db = getDatabase();
      if (path === "/api/tree") {
        return json(await db.atomic(async tx => {
          const initial = await sessionFor(tx, request);
          if (!initial) throw new AppError(401, "请先用邮箱验证码登录。");
          await tx.prepare("SELECT subject FROM wechat_accounts WHERE subject = ? FOR UPDATE").bind(initial.subject).first();
          const current = await sessionFor(tx, request);
          if (current?.subject.startsWith("email:") && ["create", "decorate"].includes(String(data.action))) {
            const profile = await profileFor(tx, current);
            if (!profile.name) throw new AppError(400, "请先填写姓名或昵称，再留下心意。");
            if (data.action === "create") data.name = profile.name;
            if (data.action === "decorate" && !data.signature) data.signature = profile.name;
          }
          return writeTree(tx, current?.user_id ?? null, data);
        }));
      }
      if (data.action === "logout") {
        await revokeSession(db, request);
        const response = json({ ok: true });
        response.headers.append("Set-Cookie", cookie(SESSION_COOKIE, "", 0));
        response.headers.append("Set-Cookie", cookie(RETURN_COOKIE, "", 0));
        return response;
      }
      if (data.action === "restore") return json(await restoreAccount(db, request, data.ticket, env.MIGRATION_SIGNING_KEY));
      if (path === "/api/auth") {
        if (data.action === "profile") return json(await saveProfile(db, request, data.name));
        if (!emailAuthReady(env)) throw new AppError(503, "邮箱登录正在准备中，请稍后再来。");
        if (data.action === "request-code") return json(await requestEmailCode(db, request, data, env.EMAIL_AUTH_SECRET, sendCode, clientIp));
        if (data.action === "verify-code") {
          const token = await verifyEmailCode(db, request, data, env.EMAIL_AUTH_SECRET);
          const response = json({ ok: true });
          response.headers.append("Set-Cookie", cookie(SESSION_COOKIE, token, SESSION_SECONDS));
          return response;
        }
        throw new AppError(400, "没有找到这个操作。");
      }
      if (!config?.enabled) throw new AppError(503, "微信登录还在准备中，请稍后再来。");
      if (data.action === "start") {
        const response = json({ ok: true });
        response.headers.append("Set-Cookie", cookie(RETURN_COOKIE, safeReturn(data.treeId).slice(7), 1800));
        return response;
      }
      if (data.action === "login") {
        const token = await consumeLogin(db, data.ticket);
        const response = json({ returnTo: safeReturn(readCookie(request, RETURN_COOKIE)) });
        response.headers.append("Set-Cookie", cookie(SESSION_COOKIE, token, SESSION_SECONDS));
        response.headers.append("Set-Cookie", cookie(RETURN_COOKIE, "", 0));
        return response;
      }
      throw new AppError(400, "没有找到这个操作。");
    } catch (error) { return errorResponse(error); }
  };
}
