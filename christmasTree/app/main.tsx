import { createRoot } from "react-dom/client";
import ChristmasApp from "./christmas-app";
import WechatLogin from "./wechat/login/page";
import "./globals.css";
import { LanguageProvider } from "@/components/language-provider";
createRoot(document.getElementById("root")!).render(<LanguageProvider>{location.pathname === "/wechat/login" ? <WechatLogin/> : <ChristmasApp/>}</LanguageProvider>);
