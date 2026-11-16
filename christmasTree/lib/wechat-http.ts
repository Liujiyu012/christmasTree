import { AppError } from "./tree-service.ts";
export const noStoreHeaders = { "Cache-Control": "private, no-store", "Vary": "Cookie", "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" };
export const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { ...noStoreHeaders, "Content-Type": "application/json; charset=utf-8" } });
// Record delivery/result metadata only: never log request URLs, signatures,
// encrypted payloads, message contents, user identities, or login links.
export function withWebhookDiagnostics(handler: (request: Request, clientIp?: string) => Promise<Response>, log: (value: string) => void = console.info) {
  return async (request: Request, clientIp?: string) => {
    const url = new URL(request.url);
    if (!["/api/wechat/webhook", "/.netlify/functions/api/wechat/webhook"].includes(url.pathname)) return handler(request, clientIp);
    const started = performance.now();
    const metadata = { event: "wechat_webhook", method: request.method, encrypted: url.searchParams.get("encrypt_type") === "aes", signed: url.searchParams.has("msg_signature") || url.searchParams.has("signature") };
    log(JSON.stringify({ ...metadata, outcome: "received" }));
    try {
      const response = await handler(request, clientIp);
      log(JSON.stringify({ ...metadata, outcome: "completed", status: response.status, reply: response.headers.get("Content-Type")?.startsWith("application/xml") ?? false, durationMs: Math.round(performance.now() - started) }));
      return response;
    } catch (error) {
      log(JSON.stringify({ ...metadata, outcome: "failed", durationMs: Math.round(performance.now() - started) }));
      throw error;
    }
  };
}
export function errorResponse(error: unknown) {
  if (error instanceof AppError) return json({ error: error.message }, error.status);
  // Don't log message bodies, identity records, tokens, or SQL bind parameters.
  console.error("Christmas tree operation failed");
  return json({ error: "暂时没能送达，请稍后重试。" }, 500);
}
export async function limitedText(request: Request, max: number) {
  if (Number(request.headers.get("content-length") ?? 0) > max) throw new AppError(413, "请求内容过长。");
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = []; let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) { await reader.cancel(); throw new AppError(413, "请求内容过长。"); }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}
export async function sameOriginJSON(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) throw new AppError(403, "请在圣诞树网站内完成操作。");
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) throw new AppError(415, "请求格式不正确。");
  let data;
  try { data = JSON.parse(await limitedText(request, 8000)); } catch (e) {
    if (e instanceof AppError) throw e;
    throw new AppError(400, "请求格式不正确。");
  }
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new AppError(400, "请求格式不正确。");
  return data as Record<string, unknown>;
}
