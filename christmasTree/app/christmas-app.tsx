import { CardImage } from "@/components/card-image";
"use client";
import { LanguageSwitch } from "@/components/language-switch";
import { useLanguage } from "@/components/language-provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Check, ChevronRight, Copy, Download, Gift, Heart, HelpCircle, LockKeyhole, Mail, Pencil, Plus, Share2, Sparkles, Trash2, TreePine, X } from "lucide-react";
import { Ornament, ORNAMENTS, SceneProps, TreeArt, TreeScenery } from "@/components/christmas-art";
import { FallingSnow, HangingOrnament, MusicBox, MusicCredit, SwayingTree } from "@/components/christmas-atmosphere";
import { PaperSky, SkyClock, useChristmasSky } from "@/components/christmas-sky";
import { TreeCustomizer } from "@/components/tree-customizer";
import { DEFAULT_DESIGN, treeDesign, treeSlots, type TreeDesign } from "@/lib/tree-design";
import { drawCardSky } from "@/lib/christmas-card-sky";
import { api } from "@/lib/client-api";
import { LetterMailbox } from "@/components/letter-mailbox";
import { BorderCollie, freezeCollieForCard } from "@/components/border-collie";
import { EmailLogin, authApi, type AuthStatus } from "@/components/email-login";

type GiftData = {id:string;kind:number;slot:number;name:string;mine:boolean;nameHidden?:boolean};
type Draft = {id?:string;kind:number;slot:number;signature:string;anonymous:boolean;body:string};
type TreeData = {id:string;name:string;isOwner:boolean;createdAt:number;design?:TreeDesign};
type State = {signedIn:boolean;tree:TreeData|null;gifts:GiftData[];mine:Draft|null;unreadCount?:number};
type Modal = "gift"|"compose"|"mailbox"|"invite"|"card"|"create"|"help"|"detail"|"login"|"account"|"customize"|null;
const empty:State = {signedIn:false,tree:null,gifts:[],mine:null};
const blank:Draft = {kind:0,slot:-1,signature:"",anonymous:false,body:""};

export default function ChristmasApp() {
  const { t, locale } = useLanguage();
  const sky = useChristmasSky();
  const [state,setState]=useState<State>(empty);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [modal,setModal]=useState<Modal>(null);
  const [draft,setDraft]=useState<Draft>(blank);
  const [selecting,setSelecting]=useState(false);
  const [category,setCategory]=useState("全部");
  const [busy,setBusy]=useState(false);
  const [name,setName]=useState("");
  const [designDraft,setDesignDraft]=useState<TreeDesign>({...DEFAULT_DESIGN});
  const [designTarget,setDesignTarget]=useState<string|null>(null);
  const [designError,setDesignError]=useState("");
  const [toast,setToast]=useState("");
  const [detail,setDetail]=useState<GiftData|null>(null);
  const [confirmRemove,setConfirmRemove]=useState(false);
  const [card,setCard]=useState("");
  const [cardBlob,setCardBlob]=useState<Blob|null>(null);
  const [cardBusy,setCardBusy]=useState(false);
  const [url,setUrl]=useState("");
  const [snow,setSnow]=useState(true);
  const [celebration,setCelebration]=useState<{slot:number;key:number}|null>(null);
  const [restoreTicket,setRestoreTicket]=useState("");
  const [auth,setAuth]=useState<AuthStatus>({available:false,signedIn:false,name:"",emailLinked:false});
  const [accountMode,setAccountMode]=useState<"view"|"bind"|"name">("view");
  const pendingAction=useRef<Modal>(null);
  const dialog=useRef<HTMLDialogElement>(null);
  const scene=useRef<SVGSVGElement>(null);
  const treeId=useRef<string|null>(null);
  const currentCard=useRef("");
  const cardRequest=useRef(0);
  const currentRequest=useRef(0);
  const tree=state.tree;
  const design=treeDesign(tree?.design);
  const slots=treeSlots(design.shape);
  useEffect(()=>setCelebration(null),[tree?.id]);
  const count=state.gifts.length;
  const canEditDetail=!!detail?.mine&&state.mine?.id===detail.id;
  const inviteUrl=tree&&url?`${url}/?tree=${encodeURIComponent(tree.id)}`:"";
  const notify=(message:string)=>setToast(message);
  const load=useCallback(async (silent=false)=>{
    const request=++currentRequest.current;
    try {
      const result=await api<State>(`/api/tree${treeId.current?`?id=${encodeURIComponent(treeId.current)}`:""}`);
      if(request!==currentRequest.current)return result;
      setState(result);setError("");
      if(result.tree&&!treeId.current){treeId.current=result.tree.id;history.replaceState({},"",`/?tree=${result.tree.id}`);}
      return result;
    }catch(e){if(!silent)setError((e as Error).message);throw e;}finally{if(request===currentRequest.current)setLoading(false);}
  },[]);
  useEffect(()=>{
    treeId.current=new URLSearchParams(location.search).get("tree");setUrl(location.origin);
    const restore = new URLSearchParams(location.hash.slice(1)).get("restore");
    if(restore){setRestoreTicket(restore);history.replaceState({},"",location.pathname+location.search);setModal("account");}
    if(new URLSearchParams(location.search).get("connect")==="wechat")setModal("account");
    void authApi<AuthStatus>().then(setAuth).catch(()=>{});
    void load().catch(()=>{});

    const focus=()=>{void load(true).catch(()=>{});void authApi<AuthStatus>().then(setAuth).catch(()=>{});};window.addEventListener("focus",focus);
    return()=>{window.removeEventListener("focus",focus);++cardRequest.current;if(currentCard.current)URL.revokeObjectURL(currentCard.current);};
  },[load]);
  useEffect(()=>{
    if(!tree?.isOwner)return;
    const check=()=>{if(!document.hidden)void load(true).catch(()=>{});};
    const timer=setInterval(check,45000);document.addEventListener("visibilitychange",check);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",check);};
  },[tree?.id,tree?.isOwner,load]);
  const updateUnread=useCallback((id:string,count:number)=>{
    if(treeId.current!==id)return;
    currentRequest.current++;
    setState(current=>current.tree?.id===id&&current.tree.isOwner?{...current,unreadCount:count}:current);
  },[]);
  useEffect(()=>{if(toast){const t=setTimeout(()=>setToast(""),4000);return()=>clearTimeout(t);}},[toast]);
  useEffect(()=>{
    if(modal){dialog.current?.showModal();document.body.style.overflow="hidden";}
    return()=>{document.body.style.overflow="";};
  },[modal]);
  useEffect(()=>{
    ++cardRequest.current;
    if(currentCard.current){URL.revokeObjectURL(currentCard.current);currentCard.current="";}
    setCard("");
    if(modal==="card")void makeCard();
    // Changing language redraws an open card without resetting any form or tree.
  },[locale]);
  const close=()=>{if(!busy){setModal(null);setConfirmRemove(false);}};
  function needTree(next:Modal) {
    if(loading)return;
    if(error){notify("请先重试连接，再继续操作。");return;}
    if(!state.signedIn||!auth.name){pendingAction.current=tree?next:"create";setModal("login");return;}
    if(!tree){void ownTree();return;}
    setModal(next);
  }
  function openGifts(){setDraft(state.mine?{...state.mine}:{...blank,signature:auth.name});setCategory("全部");needTree("gift");}
  function editLetter(){
    if(!canEditDetail||!state.mine)return;
    setDraft({...state.mine});setSelecting(false);setModal("compose");
  }
  function pickKind(kind:number){setDraft(d=>({...d,kind,slot:-1}));setSelecting(true);setModal(null);notify("选一个亮起的位置，把心意挂上去。");}
  function pickSlot(slot:number){setDraft(d=>({...d,slot}));setModal("compose");}
  async function sendGift(){
    if(!tree||draft.slot<0)return;
    setBusy(true);
    try{await api("/api/tree",{action:"decorate",treeId:tree.id,...draft});await load();setCelebration({slot:draft.slot,key:Date.now()});setSelecting(false);setModal(null);notify(draft.id?"你的装饰和信件已经更新。":draft.body.trim()?"装饰挂好了，你的信也悄悄送达了。":"心意已挂上，圣诞快乐！");}
    catch(e){notify((e as Error).message);if((e as {status?:number}).status===409){await load(true).catch(()=>{});setModal(null);setDraft(d=>({...d,slot:-1}));}}
    finally{setBusy(false);}
  }
  async function ownTree(profile=auth,customize=false){
    if(!profile.signedIn||!profile.name){pendingAction.current=customize?"customize":"create";setModal("login");return;}
    setBusy(true);
    try{
      const existing=await api<State>("/api/tree");
      if(!existing.tree){
        setDesignTarget(null);setDesignDraft({...DEFAULT_DESIGN});setDesignError("");setModal("customize");return;
      }
      const id=existing.tree.id;
      treeId.current=id;history.replaceState({},"",`/?tree=${id}`);setSelecting(false);
      await load();
      if(customize){setDesignTarget(id);setDesignDraft(treeDesign(existing.tree.design));setDesignError("");setModal("customize");}
      else setModal(null);
    }catch(e){notify((e as Error).message);}finally{setBusy(false);}
  }
  function openCustomizer(){
    if(!tree?.isOwner||busy)return;
    setDesignTarget(tree.id);setDesignDraft(treeDesign(tree.design));setDesignError("");setSelecting(false);setModal("customize");
  }
  async function saveDesign(){
    if(busy)return;
    setBusy(true);setDesignError("");
    try{
      let id=designTarget;
      if(id)await api("/api/tree",{action:"customize",treeId:id,design:designDraft});
      else id=(await api<{id:string}>("/api/tree",{action:"create",name:auth.name,design:designDraft})).id;
      treeId.current=id;history.replaceState({},"",`/?tree=${id}`);setSelecting(false);
      await load();setModal(null);notify(designTarget?"小树换好新装，朋友的心意都还在。":"小树种好了，邀请朋友来添个装饰吧。");
    }catch(e){setDesignError((e as Error).message);}finally{setBusy(false);}
  }
  async function createTree(){setBusy(true);try{
    await authApi({action:"profile",name});
    const next=await authApi<AuthStatus>();setAuth(next);
    await load();setModal(null);notify("你的名字已经更新。");
  }catch(e){notify((e as Error).message);}finally{setBusy(false);}}
  async function loginComplete(next:AuthStatus){
    setAuth(next);setAccountMode("view");
    const intent=pendingAction.current;pendingAction.current=null;
    const latest=await load();
    if(intent==="create"||intent==="customize"){await ownTree(next,intent==="customize");return;}
    if(intent==="gift"){
      setDraft(latest?.mine?{...latest.mine}:{...blank,signature:next.name});setCategory("全部");setModal("gift");return;
    }
    if(intent==="mailbox"&&latest?.tree){setModal("mailbox");return;}
    setModal(intent||null);notify("已经准备好，欢迎回到树下。");
  }
  async function openMailbox(){
    if(!tree||!state.signedIn){needTree("mailbox");return;}
    setModal("mailbox");
  }
  async function copyLink(){
    try{await navigator.clipboard.writeText(inviteUrl);notify("邀请链接已复制，发给你惦记的人吧。");}catch{notify("请长按或选中下方链接，手动复制。");}
  }
  async function removeGift(){if(!tree||!detail||!canEditDetail)return;setBusy(true);try{
    await api("/api/tree",{action:"remove",treeId:tree.id,giftId:detail.id});await load();setModal(null);setConfirmRemove(false);notify("装饰和随附的信已收回。");
  }catch(e){notify((e as Error).message);}finally{setBusy(false);}}
  async function restoreAccount(){setBusy(true);try{await authApi({action:"restore",ticket:restoreTicket});setRestoreTicket("");location.replace("/");}catch(e){notify((e as Error).message);setBusy(false);}}
  async function logoutAccount(){setBusy(true);try{await authApi({action:"logout"});location.replace(tree?`/?tree=${tree.id}`:"/");}catch(e){notify((e as Error).message);setBusy(false);}}
  async function captureTreeSticker(){
    const expected=tree?.id;
    const latest=await load();
    await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
    if(!scene.current||!latest?.tree||latest.tree.id!==expected||treeId.current!==expected)throw new Error("小树还没准备好，请重新制作卡片。");
    const clone=scene.current.cloneNode(true) as SVGSVGElement;
    clone.querySelectorAll(".slot-guide,.selection-halo").forEach(node=>node.remove());
    freezeCollieForCard(scene.current,clone);
    clone.querySelector(".tree-paper-outline")?.setAttribute("opacity","0");
    clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("width","1200");clone.setAttribute("height","1160");
    const source=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:"image/svg+xml;charset=utf-8"}));
    const image=new Image();
    try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("小树贴画加载失败，请重试。"));image.src=source;});return image;}
    finally{URL.revokeObjectURL(source);}
  }
  async function makeCard(){
    if(!tree){needTree("create");return;}setSelecting(false);setModal("card");setCardBusy(true);setCard("");
    const request=++cardRequest.current;
    const cardSky=sky;
    try{
      const latest=await load();
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      if(!scene.current||!latest?.tree)throw new Error("还没能生成卡片，请重试。");
      const clone=scene.current.cloneNode(true) as SVGSVGElement;
      clone.querySelectorAll(".slot-guide,.selection-halo").forEach(n=>n.remove());
      freezeCollieForCard(scene.current, clone);
      clone.querySelector(".tree-paper-outline")?.setAttribute("opacity", String(cardSky.dark * .7));
      clone.setAttribute("xmlns","http://www.w3.org/2000/svg");clone.setAttribute("width","1200");clone.setAttribute("height","1160");
      const svgBlob=new Blob([new XMLSerializer().serializeToString(clone)],{type:"image/svg+xml;charset=utf-8"});
      const source=URL.createObjectURL(svgBlob);
      const image=new Image();
      try{await new Promise<void>((resolve,reject)=>{image.onload=()=>resolve();image.onerror=()=>reject(new Error("插画加载失败，请重新生成。"));image.src=source;});
        const canvas=document.createElement("canvas");canvas.width=1200;canvas.height=1500;
        const ctx=canvas.getContext("2d");if(!ctx)throw new Error("当前浏览器暂不支持生成图片。");
        drawCardSky(ctx,cardSky);
        ctx.strokeStyle=cardSky.colors.line;ctx.lineWidth=1;ctx.strokeRect(38,38,1124,1424);ctx.strokeRect(47,47,1106,1406);
        ctx.textAlign="center";ctx.fillStyle=cardSky.colors.accent;ctx.font='20px Georgia, serif';ctx.fillText("CHRISTMAS, TOGETHER",600,124);
        ctx.fillStyle=cardSky.colors.ink;ctx.font='48px "Songti SC", "Noto Serif CJK SC", serif';ctx.fillText(t("{name}的圣诞树",{name:latest.tree.name}),600,208,1020);
        ctx.fillStyle=cardSky.colors.muted;ctx.font='22px sans-serif';ctx.fillText(t("把心意挂在枝头，让这个冬天暖一点。"),600,260,1020);
        ctx.drawImage(image,60,270,1080,1044);
        ctx.fillStyle=cardSky.colors.ink;ctx.font='26px serif';ctx.fillText(t("这棵树，收到了 {count} 份心意",{count:latest.gifts.length}),600,1330);
        ctx.fillStyle=cardSky.colors.accent;ctx.font='italic 24px Georgia, serif';ctx.fillText(`With love, Christmas ${new Date().getFullYear()}`,600,1400);
        const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error("图片生成失败，请重试。")),"image/png"));
        if(request!==cardRequest.current)return;
        if(currentCard.current)URL.revokeObjectURL(currentCard.current);currentCard.current=URL.createObjectURL(blob);setCard(currentCard.current);setCardBlob(blob);
      }finally{URL.revokeObjectURL(source);}
    }catch(e){if(request===cardRequest.current)notify((e as Error).message);}finally{if(request===cardRequest.current)setCardBusy(false);}
  }
  const titles:Record<Exclude<Modal,null|"detail">,string>={gift:"挑一份小小的心意",compose:"再捎一句暖暖的话",mailbox:"冬日信箱",invite:"邀请你，来我的树下",card:"收藏2026年的圣诞回忆",create:tree?.isOwner?"给圣诞树改个名字":"领养你的圣诞树",help:"一起，把圣诞慢慢点亮",login:"让这份心意，有迹可寻",account:"你的名字，你的小树",customize:designTarget?"给小树换个样子":"挑一棵，只属于你的小树"};
  const restoreUrl="https://little-christmas-tree-2026-wishes.oddferret128.chatgpt.site/migrate";
  return <div className="app-shell" data-sky-phase={sky.phase} style={sky.style}>
    <PaperSky/>
    <FallingSnow enabled={snow}/>
    <div className="paper-grain" aria-hidden="true"/>
    <header className="site-header">
      <a href="/" className="brand" aria-label={t("一棵圣诞树首页")}><svg viewBox="0 0 32 38" aria-hidden="true"><path d="m16 3-8 12h5L5 25h8v9h6v-9h8l-8-10h5Z" fill="currentColor"/><circle cx="16" cy="2" r="2" fill="#b59a61"/></svg><span>{t("一棵圣诞树")}<small>A LITTLE CHRISTMAS</small></span></a>
      <nav><button className="text-button help-button" onClick={()=>setModal("help")}><HelpCircle size={16}/>{t("怎么玩")}</button><span className="nav-divider"/><button className="text-button" onClick={()=>void ownTree()} disabled={busy||loading}>{tree?.isOwner?t("我的圣诞树"):t("我的小树")}<ArrowUpRight size={15}/></button><LanguageSwitch/></nav>
    </header>
    <main>
      <section className="intro"><p className="eyebrow"><span/>CHRISTMAS, TOGETHER · {new Date().getFullYear()}<span/></p><p className="intro-title">{t("来看看")}<span>{locale === "zh" ? "我的圣诞树" : t("首页标题的小树")}</span><svg className="title-star" viewBox="0 0 30 38" aria-hidden="true"><path d="m15 0 3 15 12 4-12 3-3 16-3-16L0 19l12-4Z" fill="#b4975d"/></svg></p><p>{t("有空的话，帮我挂个装饰吧～")}<br/>{t("一颗星星、一只小袜子，或者一个姜饼人。")}</p></section>
      <div className="atmosphere-controls"><MusicBox/><SkyClock mode={sky.mode} phase={sky.phase} onChange={sky.setMode}/></div>
      {error&&<div className="error-banner" role="alert">{t(error)}<button onClick={()=>{setLoading(true);void load().catch(()=>{});}}>{t("重试")}</button></div>}
      <section className={`christmas-scene ${selecting?"is-selecting":""}`} aria-label={t("圣诞树互动场景")}>
        <div className="tree-column">
          <h1 className="tree-name"><span className="little-star" aria-hidden="true">✧</span><span className="tree-title-text">{loading?t("小树正在醒来…"):tree?t("{name}的圣诞树",{name:tree.name}):t("你的圣诞树")}</span>{tree?.isOwner&&<button aria-label={t("修改树主人昵称")} onClick={()=>{setName(tree.name);setModal("create");}}><Pencil size={14}/></button>}<span className="little-star" aria-hidden="true">✧</span></h1>
          <button className="tree-customize-link" disabled={busy||loading||!!error} onClick={()=>tree?.isOwner?openCustomizer():void ownTree(auth,true)}><Sparkles size={15}/>{tree?.isOwner?t("定制小树"):t("定制我的小树")}<ChevronRight size={14}/></button>
          <div className="illustration">
            <div className="winter-caption" aria-hidden="true">a little tree,<br/><span>a lot of love.</span></div>
            <svg ref={scene} className="scene-svg" viewBox="0 0 600 580" aria-label={t("圣诞树，已挂 {count} 件装饰，共 30 个位置",{count})}>
              <TreeScenery snow={snow}/>
              <SwayingTree disabled={selecting} artwork={<TreeArt design={design}/>}>
              {slots.map(([x,y],slot)=>{
                const existing=state.gifts.find(g=>g.slot===slot);
                const canPick=selecting&&(!existing||existing.mine);
                return <g key={slot}>
                  {(!existing||canPick)&&<g className={`slot-guide ${canPick?"active":""}`} role={canPick?"button":undefined} tabIndex={canPick?0:undefined} aria-label={canPick?t("挂在第 {slot} 个位置",{slot:slot+1}):undefined} onClick={()=>canPick&&pickSlot(slot)} onKeyDown={e=>{if(canPick&&(e.key==="Enter"||e.key===" ")){e.preventDefault();pickSlot(slot);}}}>
                    <circle cx={x} cy={y} r="22" fill="transparent"/>
                    <circle cx={x} cy={y} r={canPick?13:3} fill={canPick?"#f9efd5":"none"} fillOpacity=".13" stroke="#e4cf99" strokeWidth="1" strokeDasharray={canPick?"2 3":undefined} opacity={canPick?.9:.4}/>
                    {canPick&&<path d={`M${x-4} ${y}h8m-4-4v8`} stroke="#efe0b5" strokeWidth="1.5"/>}
                  </g>}
                  {existing&&!(selecting&&existing.mine)&&<g className="placed-gift" role="button" tabIndex={0} aria-label={t("{name}送的{ornament}",{name:existing.nameHidden?t("一位朋友"):existing.name,ornament:t(ORNAMENTS[existing.kind][0])})} onClick={()=>{setDetail(existing);setConfirmRemove(false);setModal("detail");}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setDetail(existing);setConfirmRemove(false);setModal("detail");}}}>
                    <circle cx={x} cy={y} r="24" fill="transparent"/>
                    <HangingOrnament x={x} y={y} celebration={celebration?.slot===slot?celebration.key:0}><Ornament kind={existing.kind}/></HangingOrnament>
                  </g>}
                  {selecting&&draft.slot===slot&&<g className="selection-halo" pointerEvents="none"><svg x={x-31} y={y-25} width="62" height="50" viewBox="0 0 100 80"><Ornament kind={draft.kind}/></svg></g>}
                </g>;
              })}
              </SwayingTree>
              <SceneProps/>
              <BorderCollie paused={selecting}/>
            </svg>
            <button className="scene-action gift-action" onClick={openGifts} aria-label={t("打开礼盒，选择装饰")}><span>{t("打开礼盒")}<Plus size={12}/></span></button>
            <button className="scene-action mail-action" onClick={()=>void openMailbox()} aria-label={tree?.isOwner&&state.unreadCount?t("打开私密信箱，{count} 封未读留言",{count:state.unreadCount}):t("打开私密信箱")}>{tree?.isOwner&&!!state.unreadCount&&<span className="mail-notice"><i className="unread-dot" aria-hidden="true"/>{t("有新留言")}</span>}<span>{t("冬日信箱")} <LockKeyhole size={11}/></span></button>
          </div>
          <p className="scene-footnote">{t("每一个装饰，都是一份祝福")}</p>
          <div className="tree-progress"><span className="progress-dots">{Array.from({length:30},(_,i)=><i className={i<count?"filled":""} key={i}/>)}</span><p>{t("已经收到")}<strong>{count}</strong> {t("份心意")}<span> / 30</span></p></div>
        </div>
        <aside className="invitation-panel">
          <div className="small-note"><div className="note-top"><span>{t("给这个冬天")}</span><Heart size={15}/></div><h2>{t("有什么想说的")}</h2><p>{t("可以写下来投进信箱哦")}</p><div className="ornament-peek"><Ornament kind={0}/><Ornament kind={15}/><Ornament kind={16}/><Ornament kind={5}/></div><div className="note-bottom"><span>{t("30 款装饰 · 每人一份心意")}</span><Sparkles size={14}/></div></div>
          <button className="button primary main-cta" disabled={loading||!!error} onClick={openGifts}><Gift size={18}/>{state.mine?t("换一件我的装饰"):tree?t("添个装饰"):t("拥有我的圣诞树")}<ArrowUpRight size={17}/></button>
          <div className="secondary-actions"><button onClick={()=>tree?.isOwner?setModal("invite"):void ownTree()} disabled={busy||loading||!!error}>{tree?.isOwner?<><Share2 size={17}/>{t("邀请朋友")}</>:<><TreePine size={17}/>{t("拥有我的圣诞树")}</>}</button><button onClick={()=>void makeCard()} disabled={loading||!!error}><Download size={17}/>{t("生成卡片")}</button></div>
          <p className="privacy-note"><LockKeyhole size={12}/>{t("信里的话，只留给树主人和写信的人。")}</p>
          <div className="handwritten">A little wish goes a long way.<svg viewBox="0 0 150 15" aria-hidden="true"><path d="M5 8q70-12 140 0M25 13q50-7 100-3" fill="none" stroke="#c3ac81" strokeWidth="1"/></svg></div>
        </aside>
      </section>
      {selecting&&<div className="selection-bar" role="status"><Ornament kind={draft.kind}/><div><strong>{t("为「{ornament}」挑个位置",{ornament:t(ORNAMENTS[draft.kind][0])})}</strong><p>{t("点一点树上亮起的圆圈")}</p></div><button className="text-button" onClick={()=>setModal("gift")}>{t("换一个")}</button><button className="icon-button" aria-label={t("取消挂装饰")} onClick={()=>{setSelecting(false);setDraft(blank);}}><X size={18}/></button></div>}
    </main>
    <footer className="site-footer"><span>MADE OF LITTLE THINGS & LOTS OF LOVE</span><div><button onClick={()=>{pendingAction.current=null;setAccountMode("view");setModal("account");}}>{t("登录与账号")}</button><button onClick={()=>setSnow(s=>!s)} aria-pressed={snow}>{t("飘雪")}{snow?t("开"):t("关")}</button><span>{t("愿每一份心意，都被温柔接住。")}</span><span className="footer-star">✧</span></div><MusicCredit/></footer>
    {toast&&<div className="toast" role="status"><Check size={16}/>{t(toast)}</div>}
    {modal&&<dialog ref={dialog} className={`modal ${["gift","compose","mailbox"].includes(modal)?"drawer":""} ${modal==="card"?"card-modal":""} ${modal==="customize"?"customizer-modal":""}`} aria-labelledby="modal-title" onCancel={e=>{e.preventDefault();close();}} onClick={e=>{if(e.target===dialog.current)close();}}>
      <div className="modal-content"><div className="modal-language"><LanguageSwitch/></div><button className="close-button icon-button" aria-label={t("关闭")} disabled={busy} onClick={close}><X size={21}/></button>{modal!=="detail"&&<><p className="eyebrow modal-eyebrow">A LITTLE CHRISTMAS</p><h2 id="modal-title">{t(titles[modal])}</h2></>}
        {modal==="customize"&&<TreeCustomizer value={designDraft} onChange={setDesignDraft} onSave={()=>void saveDesign()} busy={busy} editing={!!designTarget} name={auth.name||tree?.name||t("你")} gifts={designTarget?state.gifts:[]} error={designError}/>}
        {modal==="gift"&&<><p className="modal-lead">{t("打开礼盒，找到最像你的那一件。")}</p><div className="category-tabs" role="tablist" aria-label={t("装饰品分类")}>{["全部","经典","自然","小伙伴","甜甜的"].map(c=><button role="tab" aria-selected={category===c} key={c} onClick={()=>setCategory(c)}>{t(c)}</button>)}</div><div className="ornament-grid">{ORNAMENTS.map(([label,cat],kind)=>(category==="全部"||category===cat)&&<button key={kind} onClick={()=>pickKind(kind)} title={t(label)}><Ornament kind={kind}/><span>{t(label)}</span></button>)}</div><p className="drawer-tip"><Heart size={14}/>{t("每个人只能留下一件装饰，之后也可以回来更换。")}</p></>}
        {modal==="compose"&&<form onSubmit={e=>{e.preventDefault();void sendGift();}}><div className="chosen-ornament"><Ornament kind={draft.kind}/><div><strong>{t(ORNAMENTS[draft.kind][0])}</strong><p>{t("已经选好第 {slot} 个位置",{slot:draft.slot+1})}</p></div><button type="button" className="text-button" onClick={()=>{setSelecting(true);setModal(null);}}>{t("换位置")}</button></div><label className="field-label" htmlFor="signature">{t("你想留下的名字")}<span>{t("选填")}</span></label><input id="signature" maxLength={20} placeholder={t("例如：小林")} value={draft.signature} onChange={e=>setDraft(d=>({...d,signature:e.target.value}))}/><label className="field-label" htmlFor="message">{t("写封小信")}<span>{t("选填，只给树主人看")}</span></label><textarea id="message" maxLength={500} rows={6} placeholder={t("圣诞快乐。想对你说的话，都可以写在这里……")} value={draft.body} onChange={e=>setDraft(d=>({...d,body:e.target.value}))}/><div className="word-count">{draft.body.length} / 500</div><label className="anonymous-option"><input type="checkbox" checked={draft.anonymous} onChange={e=>setDraft(d=>({...d,anonymous:e.target.checked}))}/><span><strong>{t("悄悄寄出，不留下名字")}</strong><small>{t("装饰和信件都会隐藏署名。")}</small></span><LockKeyhole size={16}/></label><button className="button primary full" disabled={busy}>{busy?t("正在送出心意…"):draft.id?t("保存修改"):draft.body.trim()?t("挂上装饰，寄出小信"):t("挂上这份心意")}<ArrowUpRight size={17}/></button><p className="privacy-note"><LockKeyhole size={12}/>{t("信件只有树主人和你能读到。")}</p></form>}
        {modal==="mailbox"&&tree&&<LetterMailbox key={tree.id} tree={tree} captureTree={captureTreeSticker} onUnreadChange={updateUnread} onInvite={()=>setModal("invite")} onDecorate={openGifts}/>}
        {modal==="invite"&&<><p className="modal-lead">{t("把链接发给朋友，给这棵树添一份温暖。")}</p><div className="invite-preview"><span>YOU’RE INVITED</span><h3>{t("来装饰我的圣诞树吧")}</h3><p>{t("留一件装饰，寄一句想念。")}<br/>{t("这个圣诞，想和你一起过。")}</p><div><Ornament kind={13}/><Ornament kind={7}/><Ornament kind={6}/></div></div><label className="field-label" htmlFor="invite-link">{t("你的邀请链接")}</label><input id="invite-link" readOnly value={inviteUrl} onFocus={e=>e.target.select()}/><button className="button primary full" onClick={()=>void copyLink()}><Copy size={17}/>{t("复制邀请链接")}</button><p className="privacy-note">{t("朋友打开后，登录即可送出一份心意。")}</p></>}
        {modal==="card"&&<><p className="modal-lead">{t("记住小树此刻的样子，留住温暖祝愿")}</p>{cardBusy?<div className="empty-state"><span className="loader"/><p>{t("正在把心意装进卡片…")}</p></div>:card?<>{cardBlob&&<CardImage blob={cardBlob} url={card} imageClassName="share-card" alt={t("当前圣诞树的分享卡片，包含所有最新装饰")} filename={t("圣诞树-{name}-{year}.png",{name:tree?.name||"",year:new Date().getFullYear()})} downloadLabel={t("保存圣诞卡片")}/>}<p className="privacy-note">{t("卡片不包含私信。")}</p></>:<button className="button primary full" onClick={()=>void makeCard()}>{t("重新生成")}</button>}</>}
        {modal==="create"&&<form onSubmit={e=>{e.preventDefault();void createTree();}}><p className="modal-lead">{t("从一棵小树开始，等待朋友的心意慢慢到来。")}</p><div className="create-motif"><Ornament kind={13}/><span>✧</span><Ornament kind={20}/></div><label className="field-label" htmlFor="tree-name">{t("树主人的昵称")}</label><input id="tree-name" required maxLength={20} placeholder={t("怎么称呼你？")} value={name} onChange={e=>setName(e.target.value)}/><p className="input-hint">{t("会显示为「{tree}」",{tree:t("{name}的圣诞树",{name:name||t("你的名字")})})}</p><button className="button primary full" disabled={busy||!name.trim()}>{busy?t("正在准备…"):tree?.isOwner?t("保存名字"):t("种下我的圣诞树")}<ArrowUpRight size={17}/></button></form>}
        {modal==="help"&&<><p className="modal-lead">{t("不用准备很多，一点心意就够了。")}</p><ol className="how-to"><li><Gift/><div><h3>{t("打开礼盒，挑一件装饰")}</h3><p>{t("30 款小装饰，选一个最喜欢的。")}</p></div></li><li><Sparkles/><div><h3>{t("在树上，留一个你的位置")}</h3><p>{t("点击空点位就能挂上，每人一件，可随时更换。")}</p></div></li><li><Mail/><div><h3>{t("有些话，悄悄寄到信箱")}</h3><p>{t("可以署名，也可以匿名。只有树主人和写信人能查看。")}</p></div></li><li><Share2/><div><h3>{t("邀请朋友，收藏这个圣诞")}</h3><p>{t("分享邀请链接，也能把最新的小树保存成卡片。")}</p></div></li></ol><button className="button primary full" onClick={close}>{t("知道啦，去看看小树")}</button></>}
        {modal==="detail"&&detail&&<>
          <div className="detail-ornament"><Ornament kind={detail.kind}/></div>
          <h2 id="modal-title" className="detail-title">{t(ORNAMENTS[detail.kind][0])}</h2>
          <p className="detail-subtitle">{tree?.isOwner&&canEditDetail?t("来自自己的祝愿，要好好爱自己呀！"):t("来自{name}的祝福",{name:detail.nameHidden?t("一位朋友"):detail.name||t("一位朋友")})}</p>
          {canEditDetail&&<>
            <div className="detail-actions"><button className="button subtle" onClick={openGifts}><Gift size={16}/>{t("更换装饰")}</button><button className="button subtle" onClick={editLetter}><Pencil size={16}/>{t("信件留言")}</button></div>
            <button className="button remove full" disabled={busy} onClick={()=>confirmRemove?void removeGift():setConfirmRemove(true)}><Trash2 size={15}/>{busy?t("正在收回…"):confirmRemove?t("确认收回装饰和随附信件"):t("收回这件装饰")}</button>
            {confirmRemove&&<p className="privacy-note">{t("这件装饰和随附信件会一起删除。")}</p>}
          </>}
        </>}
        {modal==="login"&&<EmailLogin status={auth} onComplete={loginComplete}/>}
        {modal==="account"&&<>{!auth.signedIn?<EmailLogin status={auth} onComplete={loginComplete}/>:accountMode!=="view"?<EmailLogin key={accountMode} status={auth} linkCurrent={accountMode==="bind"} editName={accountMode==="name"} onComplete={loginComplete}/>:<>
          <p className="modal-lead">{auth.name?t("{name}，欢迎回到树下。",{name:auth.name}):t("为你的心意留一个名字吧。")}</p>
          {!auth.emailLinked&&<><p className="auth-notice">{t("你在这台设备上已经登录。绑定邮箱后，原来的树、装饰和信件都会保留，也可以在其他设备上用邮箱验证码登录。")}</p><button className="button primary full" disabled={!auth.available} onClick={()=>setAccountMode("bind")}>{t("绑定邮箱，留住我的小树")}</button></>}
          {auth.emailLinked&&<p className="auth-notice">{t("已绑定邮箱。下次用同一个邮箱验证，就能回到这个账号。")}</p>}
          <button className="button subtle full" onClick={()=>setAccountMode("name")}>{auth.name?t("修改姓名或昵称"):t("填写姓名或昵称")}</button>
          {auth.restoreAvailable&&<>{restoreTicket?<><p className="auth-notice">{t("已收到原账号的找回凭证。确认后，当前账号将能查看原来的树和私信。")}</p><button className="button subtle full" disabled={busy} onClick={()=>void restoreAccount()}>{t("确认找回原来的树和信件")}</button></>:<details className="account-recovery"><summary>{t("以前用 ChatGPT 种过树？")}</summary><p className="input-hint">{t("请先验证原账号，再创建新树或挂装饰。两边已有内容时不会自动合并。")}</p><a className="text-button" href={restoreUrl}>{t("验证原账号，找回小树")}</a></details>}</>}
          <button className="button subtle full" disabled={busy} onClick={()=>void logoutAccount()}>{t("退出当前登录")}</button>
        </>}</>}


      </div>
    </dialog>}
  </div>;
}
