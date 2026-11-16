import type { ReactNode } from "react";

export const ORNAMENTS = [
  ["金色铃铛","经典"], ["暖暖灯串","自然"], ["圣诞老人","小伙伴"], ["小驯鹿","小伙伴"], ["雪人先生","小伙伴"],
  ["姜饼朋友","小伙伴"], ["圣诞袜","经典"], ["迷你礼物","经典"], ["六角雪花","自然"], ["晶莹冰柱","自然"],
  ["森林松果","自然"], ["拐杖糖","甜甜的"], ["圣诞帽","经典"], ["金色星星","经典"], ["小天使","小伙伴"],
  ["丝绒蝴蝶结","经典"], ["莓红彩球","经典"], ["松绿彩球","经典"], ["香槟彩球","经典"], ["冬青叶","自然"],
  ["圣诞花环","自然"], ["白色小鸽","小伙伴"], ["冬日手套","经典"], ["热可可","甜甜的"], ["小木屋","经典"],
  ["旋转木马","小伙伴"], ["薄荷糖","甜甜的"], ["暖心蜡烛","经典"], ["一颗爱心","甜甜的"], ["星月挂饰","自然"],
];
const red = "#9b3e41", green = "#365e49", gold = "#c5a363", cream = "#f8edcf", dark = "#684e3a";
function star(cx: number, cy: number, radius: number) {
  return Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,r=i%2?radius*.45:radius;return `${cx+Math.cos(a)*r},${cy+Math.sin(a)*r}`}).join(" ");
}
export function Ornament({kind, className=""}: {kind:number;className?:string}) {
  let shape: ReactNode;
  switch(kind) {
    case 0: shape=<><path d="M30 44h40L64 34V28C64 12 36 12 36 28v6Z" fill={gold}/><path d="M32 43h36M43 24q5-8 10-5" stroke={cream} strokeWidth="3"/><circle cx="50" cy="48" r="5" fill={dark}/><path d="m47 17-8-6 1 10 10-3 10 4-1-11Z" fill={red}/></>;break;
    case 1: shape=<><path d="M17 20q34 32 66 0M18 44q32 22 63-2" fill="none" stroke={gold} strokeWidth="2"/>{[[25,27],[45,35],[65,31],[29,48],[51,54],[74,47]].map(([x,y],i)=><g key={i}><path d={`M${x} ${y}v7`} stroke={green}/><ellipse cx={x} cy={y+9} rx="4" ry="6" fill={i%2?gold:red}/></g>)}</>;break;
    case 2: shape=<><path d="M30 31q20-33 39 2Z" fill={red}/><circle cx="68" cy="30" r="6" fill={cream}/><ellipse cx="48" cy="44" rx="20" ry="22" fill={cream}/><ellipse cx="48" cy="40" rx="13" ry="11" fill="#e6b698"/><path d="M28 31h38" stroke={cream} strokeWidth="8" strokeLinecap="round"/><circle cx="44" cy="39" r="1.5"/><circle cx="54" cy="39" r="1.5"/><circle cx="49" cy="45" r="4" fill="#cd806c"/><path d="M38 50q10 10 20 0" fill={cream}/></>;break;
    case 3: shape=<><path d="M37 30 29 10m2 7-10-2m11 7 4-11M63 30l8-20m-2 7 10-2m-11 7-4-11" stroke={dark} strokeWidth="4" strokeLinecap="round"/><ellipse cx="50" cy="43" rx="18" ry="23" fill="#bc8d63"/><path d="M34 31q-21-12-14 3l17 8M66 31q21-12 14 3L63 42" fill="#bc8d63"/><circle cx="43" cy="40" r="2"/><circle cx="57" cy="40" r="2"/><ellipse cx="50" cy="54" rx="7" ry="6" fill={red}/></>;break;
    case 4: shape=<><circle cx="50" cy="48" r="19" fill={cream}/><circle cx="50" cy="26" r="13" fill={cream}/><path d="M35 18h30M40 16V5h20v11" stroke={green} strokeWidth="5"/><path d="M35 37h27l-4 19" fill="none" stroke={red} strokeWidth="6"/><circle cx="46" cy="24" r="1.5"/><circle cx="55" cy="24" r="1.5"/><path d="m50 27 11 3-11 3" fill="#c37b42"/><circle cx="49" cy="49" r="2" fill={dark}/><circle cx="49" cy="58" r="2" fill={dark}/></>;break;
    case 5: shape=<><path d="M39 30a13 13 0 1 1 22 0l16 8q5 9-4 10l-13-7 5 20q-2 10-10 4l-5-13-6 13q-9 6-10-4l6-20-13 7q-10-1-4-10Z" fill="#b48555" stroke="#986b40" strokeWidth="1.5"/><circle cx="45" cy="21" r="2" fill={cream}/><circle cx="55" cy="21" r="2" fill={cream}/><path d="M43 27q7 6 14 0M28 39l5 6m34-6-5 6M36 58l9 4m10 0 9-4" fill="none" stroke={cream} strokeWidth="2"/><circle cx="50" cy="38" r="3" fill={red}/><circle cx="50" cy="47" r="3" fill={red}/></>;break;
    case 6: shape=<><path d="M39 14h24v28l-7 20q-20 12-31-1-4-9 5-13l9-3Z" fill={red}/><path d="M35 13h32v12H35Z" fill={cream}/><path d="M29 49q7 6 2 16M57 49l8 2" stroke={cream} strokeWidth="5"/><path d="m48 31 2 4 4-1-3 4 2 4-5-2-3 3v-5l-4-2 5-1Z" fill={gold}/></>;break;
    case 7: shape=<><rect x="24" y="29" width="52" height="35" rx="2" fill={red}/><rect x="21" y="24" width="58" height="12" rx="2" fill="#ad5251"/><path d="M45 25h10v39H45Z" fill={gold}/><path d="M49 25Q18 21 31 12q10-7 19 13 7-23 18-13 11 10-18 13" fill="none" stroke={gold} strokeWidth="4"/></>;break;
    case 8: shape=<g stroke="#d8e4dc" strokeWidth="3" strokeLinecap="round">{[0,60,120].map(a=><g key={a} transform={`rotate(${a} 50 38)`}><path d="M50 10v56m-8-49 8 8 8-8m-16 42 8-8 8 8" fill="none"/></g>)}</g>;break;
    case 9: shape=<><path d="m35 15 14 51 17-51Z" fill="#c8d6ce"/><path d="m35 15 15 10 16-10M50 25l-1 41" fill="none" stroke={cream} strokeWidth="2"/><path d="m26 26 3 5 5 1-5 2-3 5-2-5-5-2 5-1Z" fill={gold}/></>;break;
    case 10: shape=<><path d="M50 10q-33 25-19 48 19 20 38-1 11-22-19-47" fill="#8d6746"/>{[26,36,46,56].map((y,i)=><path key={y} d={`M${36-i%2*4} ${y}q7 12 14 0 7 12 14 0`} fill="none" stroke="#c39b6c" strokeWidth="3"/>)}<path d="M50 10q6-10 13-8" stroke={green} strokeWidth="3"/></>;break;
    case 11: shape=<><path d="M38 63V24c0-23 29-23 29-2v9" fill="none" stroke={cream} strokeWidth="12" strokeLinecap="round"/><path d="m34 57 8-5m-8-9 8-5m-8-9 9-5m-5-13 9 6m7-10 3 11m6 0 8 5" stroke={red} strokeWidth="5"/></>;break;
    case 12: shape=<><path d="M26 54q13-26 17-40 16-15 31 21l-13-4-10-8 6 31Z" fill={red}/><path d="M25 53h37v13H25Z" fill={cream}/><circle cx="74" cy="38" r="9" fill={cream}/></>;break;
    case 13: shape=<><polygon points={star(50,38,29)} fill={gold}/><path d="m50 9 1 29 27-9-27 13-1 25-4-25-24-13 25 8Z" fill="#e4c782"/></>;break;
    case 14: shape=<><path d="M43 34Q11 13 18 44q5 13 23 3M57 34q32-21 25 10-5 13-23 3" fill="#dcd8ba"/><path d="m50 26-19 37h38Z" fill={cream}/><circle cx="50" cy="23" r="10" fill="#d8ac86"/><ellipse cx="50" cy="9" rx="12" ry="4" fill="none" stroke={gold} strokeWidth="2"/><path d="M40 21q9-14 20 1" fill={gold}/></>;break;
    case 15: shape=<><path d="M48 34Q9 2 18 43q11 8 30-9M52 34Q91 2 82 43q-11 8-30-9M44 37 29 65l12-3 5 7 6-31 8 31 5-8 11 3-19-27" fill={red}/><path d="m23 24 21 8m33-8-21 8" stroke="#bd7370" strokeWidth="3"/><rect x="43" y="26" width="14" height="17" rx="5" fill="#b75e59"/></>;break;
    case 16: case 17: case 18: shape=<><rect x="44" y="10" width="12" height="9" rx="2" fill={gold}/><circle cx="50" cy="42" r="25" fill={[red,green,gold][kind-16]}/><path d="M33 27q-8 10-4 17" fill="none" stroke={cream} strokeWidth="3" opacity=".55"/>{kind===16?<path d="M26 42q24 17 48 0M28 36q22 15 44 0" fill="none" stroke={gold} strokeWidth="2"/>:kind===17?<><polygon points={star(50,41,12)} fill={gold}/><circle cx="33" cy="47" r="2" fill={cream}/><circle cx="65" cy="35" r="2" fill={cream}/></>:<path d="M50 17q-19 25 0 50m0-50q19 25 0 50M37 21q-8 21 0 42m26-42q8 21 0 42" stroke="#e7d5a4" strokeWidth="2" fill="none"/>}</>;break;
    case 19: shape=<><path d="M48 45Q17 50 20 16l13 5 5-11 4 14 13 5Z M52 46Q82 48 83 16l-14 5-5-11-4 14-12 5Z" fill={green}/><path d="m25 23 27 29 26-29" stroke="#92a17b" strokeWidth="2" fill="none"/><circle cx="44" cy="49" r="7" fill={red}/><circle cx="57" cy="49" r="7" fill={red}/><circle cx="51" cy="60" r="7" fill={red}/></>;break;
    case 20: shape=<><circle cx="50" cy="37" r="23" fill="none" stroke={green} strokeWidth="14"/>{[0,60,120,180,240,300].map(a=><g key={a} transform={`rotate(${a} 50 37)`}><ellipse cx="47" cy="13" rx="6" ry="9" transform="rotate(-35 47 13)" fill="#608064"/><circle cx="55" cy="14" r="3" fill={red}/></g>)}<path d="m50 57-15-9v17l15-8 15-9v17Z" fill={red}/></>;break;
    case 21: shape=<><path d="M24 49Q32 41 41 43 23 16 39 12q5 17 15 19 9-19 22-14L62 36q23-5 17 10L62 60q-22 4-38-11" fill={cream}/><circle cx="67" cy="36" r="2" fill={dark}/><path d="m78 39 9 4-10 2" fill={gold}/><path d="m39 44 18 5M61 56l1 8" stroke={gold} strokeWidth="2"/></>;break;
    case 22: shape=<><path d="M31 38V21q0-16 12-10 8-6 13 1v23q16-21 21-9 2 5-8 18L57 60H34Z" fill={green}/><path d="M30 56h30v12H30Z" fill={cream}/><path d="M36 28h14m-7-7v14m-5-12 10 10m0-10L38 33" stroke={cream} strokeWidth="2"/></>;break;
    case 23: shape=<><path d="M67 30q26-7 16 16-5 7-17 3" fill="none" stroke={red} strokeWidth="7"/><path d="M24 25h45v28q-2 14-22 14T24 53Z" fill={red}/><ellipse cx="46" cy="25" rx="22" ry="6" fill={dark}/><circle cx="37" cy="24" r="5" fill={cream}/><circle cx="52" cy="24" r="5" fill={cream}/><path d="M36 17q-8-7 1-14M51 16q9-8 2-14" fill="none" stroke={gold} strokeWidth="2"/><path d="m45 39 6 9-6 8-6-8Z" fill={cream}/></>;break;
    case 24: shape=<><path d="M25 33h50v32H25Z" fill="#bd9169"/><path d="m17 35 33-27 33 27Z" fill={red}/><path d="m18 32 32-25 32 25" fill="none" stroke={cream} strokeWidth="5"/><path d="M43 46h14v19H43Z" fill={green}/><path d="M29 41h9v11h-9m33-11h9v11h-9" fill={gold}/><path d="M64 17V6h7v17" fill={red}/></>;break;
    case 25: shape=<><path d="M25 23 37 11l8 4 4 16h22l5 22-9 5-4-17H42l-8 15-9-5 8-19-9 1Z" fill="#c79a69"/><path d="M38 16v17M46 31v13h17V31" fill={red}/><path d="M15 59q35 18 70 0" fill="none" stroke={gold} strokeWidth="5" strokeLinecap="round"/><path d="M33 50v11m33-11v11" stroke={dark} strokeWidth="3"/><circle cx="33" cy="23" r="2" fill={dark}/></>;break;
    case 26: shape=<><path d="m28 28-15-7v28l15-8m44-13 15-7v28l-15-8" fill={red}/><circle cx="50" cy="35" r="24" fill={cream}/>{[0,72,144,216,288].map(a=><path key={a} d="M50 35q-1-22 14-20l-6 16Z" transform={`rotate(${a} 50 35)`} fill={red}/>)}<path d="M50 59v10" stroke={gold} strokeWidth="3"/></>;break;
    case 27: shape=<><path d="M37 30h26v34H37Z" fill={cream}/><path d="M37 32q5 15 10 0 4 11 8 0 4 10 8 0" fill="#e6d6a8"/><path d="M50 4q-18 22 0 24Q65 19 50 4" fill={gold}/><path d="M50 15q-6 10 0 12 6-3 0-12" fill={cream}/><path d="M28 65h44" stroke={gold} strokeWidth="5"/></>;break;
    case 28: shape=<><path d="M50 65Q11 41 22 22q14-19 28 1 14-20 28-1 11 19-28 43" fill={red}/><path d="M30 27q5-8 11-1" stroke="#d69d86" strokeWidth="3" fill="none" strokeLinecap="round"/></>;break;
    default: shape=<><path d="M60 12q-32-5-33 24-1 30 35 25-28-9-21-29 5-13 19-20" fill={gold}/><polygon points={star(66,37,13)} fill={cream}/><path d="M66 13v12M45 59v9" stroke={gold} strokeWidth="1.5"/></>;
  }
  return <svg className={className} viewBox="0 0 100 80" fill="none" aria-hidden="true"><path d="M50 2v7" stroke={gold} strokeWidth="1.3"/>{shape}</svg>;
}

export { TreeArt } from "./tree-design-art";
export { BASE_SLOTS as SLOTS } from "@/lib/tree-design";
export function TreeScenery({snow=true}: {snow?:boolean}) {
  return <g pointerEvents="none" aria-hidden="true">
    <defs><radialGradient id="ground"><stop stopColor="#dbd4bf" stopOpacity=".55"/><stop offset="1" stopColor="#eee8d8" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="300" cy="513" rx="225" ry="43" fill="url(#ground)"/>
    <g className="paper-snowdrift">
      <path d="M74 520Q100 493 157 497q49-22 110-4 55-13 106 1 57-15 91 9 45-5 62 22-49 29-129 27-78 18-153-2-117 6-170-30Z" fill="#d2dcd8" opacity=".7"/>
      <path d="M69 512q38-30 99-22 43-17 94-2 54-11 110 0 54-12 94 12 42-4 58 18-54 21-127 20-78 14-152-1-118 5-176-25Z" fill="#f6f3e9" stroke="#e1e3d9" strokeWidth="1.2"/>
      <path d="M105 511q36-10 74-3m201 8q47-9 84-1M221 528q35 5 57 1" fill="none" stroke="#c8d5d2" strokeWidth="1.5" strokeLinecap="round" opacity=".7"/>
      <path d="M83 537q18-7 35 1m350-1q16-5 29 2" fill="none" stroke="#f8f5eb" strokeWidth="6" strokeLinecap="round"/>
    </g>
    <path d="M260 512q43-9 81 2" stroke="#d9cfb8" strokeWidth="2" fill="none"/>
    {snow&&<g fill="#fffdf5" opacity=".9">{[[193,160],[392,123],[130,290],[469,242],[229,66],[431,338],[109,416],[363,74],[470,159],[173,215],[390,489],[219,503]].map(([x,y],i)=><circle key={i} cx={x} cy={y} r={i%3===0?2.5:1.5} className="scene-snowflake" style={{animationDelay:`${i*.6}s`}}/>)}</g>}
  </g>;
}
export function SceneProps() {
  return <g>
    <g transform="translate(111 460) rotate(-7 40 40)">
      <ellipse cx="46" cy="66" rx="45" ry="9" fill="#d6c9ad" opacity=".25"/>
      <path d="M8 25h72v44H8Z" fill="#863d42"/><path d="M8 25h72v9H8Z" fill="#71363c"/><path d="M3 17h82v15H3Z" fill="#a15555"/><path d="M35 18h14v51H35Z" fill="#c4a268"/><path d="M41 18Q1 12 17 0q12-8 24 18Q53-9 67 1q15 13-26 17" fill="none" stroke="#c4a268" strokeWidth="6"/>
      <path d="m58 42 11 1-1 13-11-1Z" fill="#ede2c6"/><path d="m59 42-4-8" stroke="#ede2c6"/>
    </g>
    <g transform="translate(492 433)">
      <path d="M36 39h10v72H36Z" fill="#8f785b"/><path d="M40 70h5v39" fill="#b29a73"/>
      <path d="M-2 17Q-2-7 24-7h37q17 1 17 24v38H-2Z" fill="#657d66"/><path d="M-2 17Q-2-7 19-7t21 24v38H-2Z" fill="#d9d3b8"/>
      <path d="M5 15h27v4H5Z" fill="#5a6854"/><path d="M4 48h29" stroke="#a69c7b" strokeWidth="1.5"/>
      <path d="M64 30V-19h21v14H66" fill="#9b3e41" stroke="#9b3e41" strokeWidth="3"/><circle cx="64" cy="30" r="4" fill="#b7a77a"/>
      <path d="M6 28h24v15H6Z" fill="#f4ecd7"/><path d="m6 28 12 9 12-9" fill="none" stroke="#ab9570"/>
      <path d="M-6-5q47-12 83 5" fill="none" stroke="#f7f2e5" strokeWidth="6" strokeLinecap="round"/>
    </g>
  </g>;
}
