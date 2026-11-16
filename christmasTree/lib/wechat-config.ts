export const SITE_ORIGIN = "https://cool-pavlova-b2ef63.netlify.app";
export type WechatConfig = {
  appId: string; token: string; aesKey: string; enabled: boolean; visible: boolean;
  accountName: string; accountId: string; qrPath: string | null;
};
export function wechatConfig(env: {
  WECHAT_LOGIN_ENABLED?: string; WECHAT_LOGIN_VISIBLE?: string; WECHAT_APP_ID?: string; WECHAT_TOKEN?: string;
  WECHAT_ENCODING_AES_KEY?: string; WECHAT_ACCOUNT_NAME?: string;
  WECHAT_ACCOUNT_ID?: string; WECHAT_QR_PATH?: string;
}): WechatConfig | null {
  const appId = env.WECHAT_APP_ID ?? "", token = env.WECHAT_TOKEN ?? "", aesKey = env.WECHAT_ENCODING_AES_KEY ?? "";
  if (!/^wx[a-f0-9]{16}$/.test(appId) || !/^[a-zA-Z0-9]{3,32}$/.test(token) || !/^[a-zA-Z0-9]{43}$/.test(aesKey)) return null;
  const accountName = (env.WECHAT_ACCOUNT_NAME ?? "").trim().slice(0, 80);
  const accountId = (env.WECHAT_ACCOUNT_ID ?? "").trim().slice(0, 80);
  const qr = env.WECHAT_QR_PATH ?? "";
  return { appId, token, aesKey, accountName, accountId,
    enabled: env.WECHAT_LOGIN_ENABLED === "true" && !!accountName && !!accountId,
    visible: env.WECHAT_LOGIN_VISIBLE === "true",
    qrPath: /^\/wechat-[a-zA-Z0-9_-]+\.(png|jpe?g)$/.test(qr) ? qr : null };
}
