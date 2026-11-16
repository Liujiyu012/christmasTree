import { useLanguage } from "@/components/language-provider";
import { useState } from "react";
import { ArrowUpRight, Check, Shuffle } from "lucide-react";
import { BASES, SHAPES, TOPPERS, type TreeDesign } from "@/lib/tree-design";
import { TreeArt, TreeTopper } from "./tree-design-art";
import { Ornament } from "./christmas-art";
import { treeSlots } from "@/lib/tree-design";
import "./tree-customizer.css";

const groups = [{key:"shape",label:"树形",choices:SHAPES},{key:"topper",label:"树顶",choices:TOPPERS},{key:"base",label:"底饰",choices:BASES}] as const;
type PreviewGift = {id:string;kind:number;slot:number};
export function TreeCustomizer({ value, onChange, onSave, busy, editing, name, gifts=[], error }: {
  value:TreeDesign; onChange:(value:TreeDesign)=>void; onSave:()=>void; busy:boolean; editing:boolean; name:string; gifts?:PreviewGift[]; error:string;
}) {
  const { t } = useLanguage();
  const [group,setGroup]=useState<0|1|2>(0);
  const current=groups[group], slots=treeSlots(value.shape);
  return <div className="tree-customizer">
    <p className="modal-lead">{t("先挑一棵喜欢的小树，再等朋友来添装饰。")}</p>
    <div className="customizer-layout">
      <div className="customizer-preview">
        <span className="customizer-preview-label">{t("{name}的圣诞树",{name})}</span>
        <svg className="customizer-tree" viewBox="70 -12 460 550" role="img" aria-label={[SHAPES[value.shape],TOPPERS[value.topper],BASES[value.base]].map(label=>t(label)).join(", ")}>
          <ellipse cx="300" cy="510" rx="169" ry="17" fill="#d8d3bf" opacity=".4"/>
          <TreeArt design={value} mini/>
          {gifts.map(g=>{const [x,y]=slots[g.slot];return <svg key={g.id} x={x-30} y={y-23} width="60" height="48" viewBox="0 0 100 80"><Ornament kind={g.kind}/></svg>;})}
        </svg>
        <p aria-live="polite">{t(SHAPES[value.shape])} · {t(TOPPERS[value.topper])}<span className="preview-base">{t(BASES[value.base])}</span></p>
        <button type="button" className="customizer-random" disabled={busy} onClick={()=>onChange({topper:Math.floor(Math.random()*5),shape:Math.floor(Math.random()*5),base:Math.floor(Math.random()*5)})}><Shuffle size={14}/>{t("试试随机搭配")}</button>
      </div>
      <div className="customizer-options">
        <div className="customizer-tabs" role="tablist" aria-label={t("定制小树")}>
          {groups.map((g,i)=><button key={g.key} type="button" id={`design-tab-${g.key}`} role="tab" aria-selected={group===i} aria-controls="design-options" tabIndex={group===i?0:-1} disabled={busy} onClick={()=>setGroup(i as 0|1|2)} onKeyDown={e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key)){e.preventDefault();const next=e.key==="Home"?0:e.key==="End"?2:(group+(e.key==="ArrowRight"?1:2))%3;setGroup(next as 0|1|2);document.getElementById(`design-tab-${groups[next].key}`)?.focus();}}}><span>0{i+1}</span>{t(g.label)}</button>)}
        </div>
        <div id="design-options" role="tabpanel" aria-labelledby={`design-tab-${current.key}`}>
          <p className="customizer-prompt">{t(["选一个喜欢的轮廓", "给树尖添一点特别", "为朋友的装饰铺好底色"][group])}</p>
          <div className="design-choices" role="group" aria-label={t("选择{group}",{group:t(current.label)})}>
            {current.choices.map((label,i)=>{
              const chosen=value[current.key]===i;
              const sample={...value,[current.key]:i};
              return <button type="button" className={`design-choice ${chosen?"chosen":""}`} key={label} aria-pressed={chosen} aria-label={t(label)} disabled={busy} onClick={()=>onChange(sample)}>
                <span className="design-swatch">{current.key==="topper"?<TreeTopper kind={i}/>:<svg viewBox="70 -12 460 550" aria-hidden="true"><TreeArt design={sample} mini/></svg>}</span>
                <span>{t(label)}</span><span className="design-check" aria-hidden="true">{chosen&&<Check size={12}/>}</span>
              </button>;
            })}
          </div>
          <p className="customizer-hint">{current.key==="base"?t("底饰不占挂点，30 个位置都留给朋友。"):t("每类选一款，可以随时切换看看。")}</p>
        </div>
      </div>
    </div>
    {error&&<p className="customizer-error" role="alert">{t(error)}</p>}
    <div className="customizer-footer"><p>{editing?t("换个样子，朋友的装饰和信都还在。"):t("选好就种下，以后也能再调整。")}</p><button type="button" className="button primary" disabled={busy} onClick={onSave}>{busy?t("正在保存…"):editing?t("保存小树的样子"):t("种下我的圣诞树")}<ArrowUpRight size={17}/></button></div>
  </div>;
}
