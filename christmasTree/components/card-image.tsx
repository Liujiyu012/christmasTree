import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Share2 } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { canShareImage, shareImage } from "@/lib/card-save";
import "./card-image.css";

export function CardImage({blob,url,filename,alt,imageClassName="",downloadLabel}:{blob:Blob;url:string;filename:string;alt:string;imageClassName?:string;downloadLabel:string}) {
  const {t}=useLanguage();
  const mobile=/Android|iPhone|iPad|iPod|MicroMessenger/i.test(navigator.userAgent)||navigator.maxTouchPoints>0;
  const wechat=/MicroMessenger/i.test(navigator.userAgent);
  const file=useMemo(()=>new File([blob],filename,{type:"image/png"}),[blob,filename]);
  const native=mobile&&!wechat&&canShareImage(navigator,file);
  const [inline,setInline]=useState("");
  const [saving,setSaving]=useState(false);
  const [showHelp,setShowHelp]=useState(false);
  const [failed,setFailed]=useState(false);
  const picture=useRef<HTMLImageElement>(null);
  useEffect(()=>{
    setInline("");setShowHelp(false);setFailed(false);
    if(!mobile)return;
    // Inline images remain in the page, so WeChat does not open a PNG attachment.
    const reader=new FileReader();reader.onload=()=>setInline(String(reader.result));reader.readAsDataURL(blob);
    return()=>{reader.onload=null;if(reader.readyState===FileReader.LOADING)reader.abort();};
  },[blob,mobile]);
  function showImage(){setShowHelp(true);requestAnimationFrame(()=>picture.current?.scrollIntoView({block:"center",behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"}));}
  async function save(){
    if(saving)return;
    if(!native){showImage();return;}
    setSaving(true);
    const result=await shareImage(navigator,file);
    setSaving(false);
    if(result==="fallback"){setFailed(true);showImage();}
    // Resolving a share does not tell us whether the user saved to Photos.
  }
  return <div className={`card-image ${mobile?"mobile-image":""} ${showHelp?"save-help-open":""}`}>
    <img ref={picture} className={imageClassName} src={inline||url} alt={alt}/>
    {mobile?<>
      <p className="card-save-guide" role="status">{failed?t("暂时无法打开系统菜单，请长按图片保存。"):native&&!showHelp?t("点击下方按钮打开系统菜单；如有「保存图片」，选择即可。也可以长按图片保存。"):t("长按上方图片，保存到相册。")}</p>
      {native&&<><button className="button primary full" disabled={saving} onClick={()=>void save()}><Share2 size={17}/><span>{saving?t("请在系统菜单中操作…"):t("保存 / 分享图片")}</span></button>
      <a className="text-button card-file-download" href={url} download={filename}><Download size={13}/>{t("下载 PNG 文件")}</a></>}
    </>:<a className="button primary full" href={url} download={filename}><Download size={17}/>{downloadLabel}</a>}
  </div>;
}
