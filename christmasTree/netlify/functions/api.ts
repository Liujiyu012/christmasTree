import type { Config, Context } from "@netlify/functions";
import { createHandler } from "../../lib/api.ts";
import { database } from "../../lib/netlify-database.ts";
import { withWebhookDiagnostics } from "../../lib/wechat-http.ts";
const handler = withWebhookDiagnostics(createHandler(database, process.env));
// Trust the hosting platform's connection metadata, never a user-supplied header.
export default (request: Request, context: Context) => handler(request, context.ip);
export const config: Config = { path: "/api/*" };
