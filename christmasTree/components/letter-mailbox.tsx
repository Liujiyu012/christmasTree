import { CardImage } from "@/components/card-image";
import { useLanguage } from "@/components/language-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowUpRight, ChevronRight, Download, Heart, LockKeyhole, Mail } from "lucide-react";
import { api } from "@/lib/client-api";
import { makeLetterCards, type Letter } from "@/lib/letter-card";
import "./letter-mailbox.css";

export function LetterMailbox({tree, captureTree, onUnreadChange, onInvite, onDecorate}:{
  tree:{id:string;name:string;isOwner:boolean};captureTree:()=>Promise<HTMLImageElement>;
  onUnreadChange:(treeId:string,count:number)=>void;onInvite:()=>void;onDecorate:()=>void;
}) {
  const {t,locale}=useLanguage();
  const [letters,setLetters]=useState<Letter[]>([]);
  const [active,setActive]=useState<Letter|null>(null);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [readError,setReadError]=useState("");
  const [cardError,setCardError]=useState("");
  const [cardBusy,setCardBusy]=useState(false);
  const [cards,setCards]=useState<{url:string;blob:Blob}[]>([]);
  const alive=useRef(true),request=useRef(0),generation=useRef(0),urls=useRef<string[]>([]),opened=useRef<string|null>(null);
  useEffect(()=>{alive.current=true;return()=>{alive.current=false;generation.current++;urls.current.forEach(URL.revokeObjectURL);};},[]);
  const refresh=useCallback(async()=>{
    const ticket=++request.current;
    try {
      const result=await api<{letters:Letter[]}>(`/api/tree?id=${encodeURIComponent(tree.id)}&letters=1`);
      if(!alive.current||ticket!==request.current)return;
      setLetters(result.letters);setError("");
      if(tree.isOwner)onUnreadChange(tree.id,result.letters.filter(letter=>letter.unread).length);
    } catch(e) { if(alive.current&&ticket===request.current)setError((e as Error).message); }
    finally { if(alive.current&&ticket===request.current)setLoading(false); }
  },[tree.id,tree.isOwner,onUnreadChange]);
  useEffect(()=>{
    void refresh();
    const check=()=>{if(!document.hidden)void refresh();};
    const timer=setInterval(check,45000);document.addEventListener("visibilitychange",check);window.addEventListener("focus",check);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",check);window.removeEventListener("focus",check);};
  },[refresh]);
  function clearCards(){generation.current++;urls.current.forEach(URL.revokeObjectURL);urls.current=[];setCards([]);setCardBusy(false);setCardError("");}
  async function openLetter(letter:Letter){
    clearCards();opened.current=letter.id;setActive(letter);setReadError("");
    if(!letter.unread||!tree.isOwner)return;
    try {
      const result=await api<{unreadCount:number}>("/api/tree",{action:"read-letter",treeId:tree.id,letterId:letter.id,version:letter.version});
      if(!alive.current)return;
      request.current++;setLoading(false);
      setLetters(list=>list.map(item=>item.id===letter.id&&item.version===letter.version?{...item,unread:false}:item));
      setActive(item=>item?.id===letter.id&&item.version===letter.version?{...item,unread:false}:item);
      onUnreadChange(tree.id,result.unreadCount);
    } catch(e) {if(alive.current&&opened.current===letter.id)setReadError((e as Error).message);}
  }
  async function createCard(redraw=false){
    if(!active||(cardBusy&&!redraw))return;
    const letter=active,ticket=++generation.current;setCardBusy(true);setCardError("");
    try {
      const sticker=await captureTree();
      if(!alive.current||ticket!==generation.current)return;
      const blobs=await makeLetterCards(letter,tree.name,sticker,locale);
      if(!alive.current||ticket!==generation.current)return;
      urls.current=blobs.map(blob=>URL.createObjectURL(blob));setCards(blobs.map((blob,index)=>({blob,url:urls.current[index]})));
    } catch(e) {if(alive.current&&ticket===generation.current)setCardError((e as Error).message);}
    finally {if(alive.current&&ticket===generation.current)setCardBusy(false);}
  }
  useEffect(()=>{
    const redraw=cards.length>0||cardBusy;
    clearCards();
    if(redraw)void createCard(true);
    // Keep the selected letter and redraw only the card's product copy.
  },[locale]);
  function back(){clearCards();opened.current=null;setActive(null);setReadError("");void refresh();}
  const unread=letters.filter(letter=>letter.unread).length;
  return <>
    <p className="modal-lead">{tree.isOwner?t("有些话，只想悄悄说给你听。"):t("这里能找到你写给树主人的信。")}</p>
    {active?cards.length?<div className="letter-card-preview">
      <button className="text-button" onClick={clearCards}><ArrowLeft size={15}/>{t("返回信件")}</button>
      <p className="letter-card-caption">{t("把这封信，留成一张小卡片")}</p>
      {cards.map(({url,blob},index)=><div className="letter-card-page" key={url}>
        <CardImage blob={blob} url={url} alt={t("写给{name}的信件卡片，含当前圣诞树贴画，第 {page} 张",{name:tree.name,page:index+1})} filename={t("冬日来信-{date}{page}.png",{date:new Date(active.createdAt).toISOString().slice(0,10),page:cards.length>1?`-${index+1}`:""})} downloadLabel={cards.length>1?t("保存第 {page} 张卡片",{page:index+1}):t("保存信件卡片")}/>
      </div>)}
      <p className="privacy-note">{t("图片包含这封信的内容，仅在你的设备上生成。")}</p>
    </div>:<div className="letter-sheet">
      <button className="text-button" onClick={back}><ArrowLeft size={15}/>{t("回到信箱")}</button>
      <div className="letter-stamp" aria-hidden="true">✧<small>WITH LOVE</small></div>
      <p className="letter-salutation">{t("亲爱的 {name}：",{name:tree.name})}</p><p className="letter-body">{active.body}</p>
      <div className="letter-signature"><span>{active.anonymous?t("一位悄悄想念你的人"):active.signature}</span><small>{new Date(active.createdAt).toLocaleDateString(locale==="zh"?"zh-CN":"en-US")}</small></div>
      {readError&&<div className="letter-read-error" role="status"><p>{t(readError)}</p><button className="text-button" onClick={()=>void openLetter(active)}>{t("重试标记已读")}</button></div>}
      <button className="button subtle full letter-save" disabled={cardBusy} onClick={()=>void createCard()}><Download size={17}/>{cardBusy?t("正在制作信件卡片…"):t("保存为信件卡片")}</button>
      {cardError&&<p className="auth-error" role="alert">{t(cardError)}</p>}
    </div>:loading?<div className="empty-state"><span className="loader"/><p>{t("正在打开信箱…")}</p></div>:<>
      {error&&<div className="letter-read-error" role="status"><p>{t(error)}</p><button className="text-button" onClick={()=>void refresh()}>{t("重新打开信箱")}</button></div>}
      {letters.length?<><div className="mailbox-summary"><span>{t("{count} 封来信",{count:letters.length})}</span>{unread>0&&<span><i className="unread-dot" aria-hidden="true"/>{t("{count} 封未读",{count:unread})}</span>}</div>
        <div className="letters-list">{letters.map(letter=><button className={`letter-row ${letter.unread?"is-unread":""}`} key={letter.id} onClick={()=>void openLetter(letter)} aria-label={(letter.unread?t("未读，"):"")+t("来自{name}的信",{name:letter.anonymous?t("一位悄悄想念你的人"):letter.signature})}>
          <span className="envelope-icon"><Mail size={26}/>{letter.unread&&<i className="unread-dot" aria-hidden="true"/>}</span>
          <span><strong>{letter.anonymous?t("一位悄悄想念你的人"):letter.signature}</strong><small>{new Date(letter.createdAt).toLocaleDateString(locale==="zh"?"zh-CN":"en-US")} · {letter.mine?t("我寄出的信"):t("一封只属于你的信")}</small></span><ChevronRight size={16}/>
        </button>)}</div></>:!error&&<div className="empty-state"><div className="empty-mail"><Mail size={42}/><Heart size={16}/></div><h3>{tree.isOwner?t("信箱里，还藏着一点期待"):t("你的小信还没寄出")}</h3><p>{tree.isOwner?t("邀请朋友来装饰小树，\n也许下一封信，就是一句好久不见。"):t("挂上一件装饰时，\n可以顺便写下想对树主人说的话。")}</p><button className="button subtle" onClick={tree.isOwner?onInvite:onDecorate}>{tree.isOwner?t("邀请一位朋友"):t("去挑一件装饰")}<ArrowUpRight size={15}/></button></div>}
    </>}
    <p className="drawer-tip"><LockKeyhole size={13}/>{t("每封信，只对树主人和写信人开放。")}</p>
  </>;
}
