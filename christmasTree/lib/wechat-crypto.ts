import { createHash, createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "node:crypto";
import { AppError } from "./tree-service.ts";
import type { WechatConfig } from "./wechat-config.ts";

export const digest = (value: string) => createHash("sha256").update(value).digest("hex");
export const signature = (...parts: string[]) => createHash("sha1").update(parts.sort().join("")).digest("hex");
const invalid = () => new AppError(403, "微信消息校验失败。");
export function verifySignature(config: WechatConfig, params: URLSearchParams, encrypted?: string, now = Date.now()) {
  const timestamp = params.get("timestamp") ?? "", nonce = params.get("nonce") ?? "";
  const received = params.get(encrypted === undefined ? "signature" : "msg_signature") ?? "";
  if (!/^\d{10}$/.test(timestamp) || Math.abs(now / 1000 - Number(timestamp)) > 300 || !/^[\w-]{1,128}$/.test(nonce) || !/^[a-f0-9]{40}$/.test(received)) throw invalid();
  const expected = signature(config.token, timestamp, nonce, ...(encrypted === undefined ? [] : [encrypted]));
  if (!timingSafeEqual(Buffer.from(received), Buffer.from(expected))) throw invalid();
}
export function decryptMessage(encrypted: string, config: WechatConfig) {
  try {
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(encrypted) || encrypted.length > 44000) throw invalid();
    const ciphertext = Buffer.from(encrypted, "base64");
    if (!ciphertext.length || ciphertext.length % 16) throw invalid();
    const key = Buffer.from(config.aesKey + "=", "base64");
    const decipher = createDecipheriv("aes-256-cbc", key, key.subarray(0, 16));
    decipher.setAutoPadding(false);
    const padded = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    const padding = padded[padded.length - 1];
    if (padding < 1 || padding > 32 || !padded.subarray(-padding).every(b => b === padding)) throw invalid();
    const data = padded.subarray(0, -padding);
    if (data.length < 20) throw invalid();
    const length = data.readUInt32BE(16);
    if (length > data.length - 20 || data.subarray(20 + length).toString("utf8") !== config.appId) throw invalid();
    return new TextDecoder("utf-8", { fatal: true }).decode(data.subarray(20, 20 + length));
  } catch { throw invalid(); }
}
export function encryptReply(message: string, config: WechatConfig, nonce: string, now = Date.now()) {
  const key = Buffer.from(config.aesKey + "=", "base64");
  const text = Buffer.from(message), length = Buffer.alloc(4);
  length.writeUInt32BE(text.length);
  const data = Buffer.concat([randomBytes(16), length, text, Buffer.from(config.appId)]);
  const padding = 32 - data.length % 32;
  const cipher = createCipheriv("aes-256-cbc", key, key.subarray(0, 16));
  cipher.setAutoPadding(false);
  const encrypted = Buffer.concat([cipher.update(Buffer.concat([data, Buffer.alloc(padding, padding)])), cipher.final()]).toString("base64");
  const timestamp = String(Math.floor(now / 1000));
  return `<xml><Encrypt><![CDATA[${encrypted}]]></Encrypt><MsgSignature>${signature(config.token, timestamp, nonce, encrypted)}</MsgSignature><TimeStamp>${timestamp}</TimeStamp><Nonce>${xmlEscape(nonce)}</Nonce></xml>`;
}
export const xmlEscape = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
// Read only protocol scalar fields, without entity expansion or external resources.
export function xmlField(xml: string, name: string): string {
  if (xml.length > 44000 || /<!DOCTYPE|<!ENTITY/i.test(xml) || !/^\s*(?:<\?xml[^?]*\?>\s*)?<xml>[\s\S]*<\/xml>\s*$/.test(xml)) throw invalid();
  const matches = [...xml.matchAll(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`, "g"))];
  if (matches.length !== 1) throw invalid();
  const value = matches[0][1];
  if (value.startsWith("<![CDATA[") && value.endsWith("]]>")) {
    const inside = value.slice(9, -3);
    if (inside.includes("]]>")) throw invalid();
    return inside;
  }
  if (value.includes("<") || /&(?!(?:amp|lt|gt|quot|apos);)/.test(value)) throw invalid();
  return value.replace(/&(amp|lt|gt|quot|apos);/g, (_, key: string) => ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'"}[key]!));
}
