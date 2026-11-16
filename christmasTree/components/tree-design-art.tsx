import { useId } from "react";
import { DEFAULT_DESIGN, shapePoint, type TreeDesign } from "@/lib/tree-design";

const gold = "#c9a460", paper = "#fbefd2", red = "#a14750";
function star(x: number, y: number, r: number) {
  return Array.from({length:10},(_,i)=>{const a=i*Math.PI/5-Math.PI/2,s=i%2?r*.44:r;return `${x+Math.cos(a)*s},${y+Math.sin(a)*s}`;}).join(" ");
}
export function TreeTopper({ kind }: { kind: number }) {
  return <svg viewBox="0 0 100 90" fill="none" aria-hidden="true" data-topper={kind}>
    {kind===0&&<><polygon points={star(50,43,35)} fill={gold} stroke="#b08b49" strokeWidth="1.3"/><path d="m50 8 1 35 32-11-29 16-4 30-4-30-29-16 31 11Z" fill="#ebd28d"/><path d="m14 14 3 4m67-4-3 4M7 46h5m76 0h5" stroke={gold} strokeWidth="2" strokeLinecap="round"/></>}
    {kind===1&&<><path d="M43 38Q5 16 13 50q6 18 30 3M57 38q38-22 30 12-6 18-30 3" fill="#e5dfc6" stroke="#d0c3a3"/><path d="M21 33q3 14 15 15m43-15q-3 14-15 15" stroke={paper} strokeWidth="3" strokeLinecap="round"/><path d="m50 31-23 45q23 7 46 0Z" fill={paper} stroke="#d1b988"/><path d="M44 51q6 5 12 0m-11 14h10" stroke={gold} strokeWidth="2"/><circle cx="50" cy="27" r="12" fill="#e4b798"/><path d="M38 27q-2-21 19-13 9 4 5 16-5-14-10-11-3 8-14 8" fill="#b68a55"/><path d="M44 29h1m10 0h1m-9 5q3 2 6 0" stroke="#765743" strokeWidth="1.8" strokeLinecap="round"/><ellipse cx="50" cy="7" rx="15" ry="4" stroke={gold} strokeWidth="2.5"/></>}
    {kind===2&&<><path d="M47 39Q4 4 11 48q15 12 36-9M53 39Q96 4 89 48q-15 12-36-9M41 43 25 82l14-6 8 8 5-39 8 39 7-8 14 6-20-39" fill={red} stroke="#8d3d48"/><path d="m19 25 25 13m37-13L56 38" stroke="#cc8586" strokeWidth="3" strokeLinecap="round"/><rect x="42" y="29" width="16" height="23" rx="6" fill="#b6656a"/><path d="m47 33-1 14" stroke="#d79491" strokeWidth="2"/></>}
    {kind===3&&<g strokeLinecap="round">{[0,60,120].map(a=><g key={a} transform={`rotate(${a} 50 44)`}><path d="M50 8v72M41 18l9 9 9-9M39 68l11-11 11 11" stroke="#bdccc7" strokeWidth="7"/><path d="M50 8v72M41 18l9 9 9-9M39 68l11-11 11 11" stroke="#f3f5e8" strokeWidth="4"/></g>)}<circle cx="50" cy="44" r="8" fill="#d4e3df" stroke={paper} strokeWidth="2"/><circle cx="50" cy="44" r="3" fill={gold}/></g>}
    {kind===4&&<><path d="M58 8C15 2 10 63 48 77q12 5 26-2C39 72 29 27 58 8Z" fill={gold} stroke="#b49152"/><path d="M42 17Q16 49 46 68" stroke="#e8cd8d" strokeWidth="3" strokeLinecap="round"/><path d="M71 16v19M61 64v16" stroke={gold} strokeWidth="1.4"/><polygon points={star(71,45,18)} fill={paper} stroke={gold}/><circle cx="61" cy="80" r="3" fill={gold}/></>}
  </svg>;
}

// Reuse the original paper-cut silhouette for existing trees.
const classicTiers = [
  "M300 62C287 103 270 125 250 146l23-4-12 13q38 5 79-1l-13-13 23 5C326 117 309 91 300 62Z",
  "M300 114C272 156 249 180 222 205l31-4-16 14q63 12 130-1l-20-16 32 6C349 178 322 144 300 114Z",
  "M300 166C267 209 226 245 193 266l33-2-20 16q94 14 189-2l-22-17 36 3C368 234 333 198 300 166Z",
  "M300 223C261 270 207 307 166 331l37-3-24 17q119 24 242-1l-23-18 37 4C389 301 342 261 300 223Z",
  "M300 277C254 325 192 366 137 395l42-4-26 18q145 30 296-1l-27-18 43 5C409 364 350 321 300 277Z",
  "M300 333C242 383 170 428 109 457l41-3-27 21q176 34 354-2l-26-20 42 3C429 428 361 384 300 333Z",
];
function silhouette(shape: number) {
  if (shape===0) return classicTiers;
  const tops=[62,114,169,225,279,335], bottoms=[155,216,280,345,410,480], widths=[51,79,108,136,165,194];
  return tops.map((top,i)=>{
    const y=bottoms[i], w=widths[i], p=(x:number,y:number)=>shapePoint(shape,x,y).join(" ");
    if(shape===1) return `M${p(300,top)}C${p(280,top+12)} ${p(300-w,top+30)} ${p(300-w,y-17)}Q${p(300-w-4,y+10)} ${p(300-w*.5,y)}Q${p(300,y+18)} ${p(300+w*.5,y)}Q${p(300+w+4,y+10)} ${p(300+w,y-17)}C${p(300+w,top+30)} ${p(320,top+12)} ${p(300,top)}Z`;
    if(shape===2) return `M${p(300,top)}Q${p(300+w*.9,y-70)} ${p(300+w,y-7)}L${p(300+w*.7,y-10)} ${p(300+w*.86,y+3)}Q${p(300,y+13)} ${p(300-w*.86,y+3)}L${p(300-w*.7,y-10)} ${p(300-w,y-7)}Q${p(300-w*.9,y-70)} ${p(300,top)}Z`;
    if(shape===3) return `M${p(300,top)}Q${p(300-w*.8,y-70)} ${p(300-w,y-4)}Q${p(300-w*.42,y+7)} ${p(300,y-1)}Q${p(300+w*.42,y+7)} ${p(300+w,y-4)}Q${p(300+w*.8,y-70)} ${p(300,top)}Z`;
    return `M${p(300,top)}C${p(300-w*.35,top+30)} ${p(300-w*.95,y-55)} ${p(300-w,y-8)}L${p(300-w*.75,y-6)} ${p(300-w*.84,y+7)}Q${p(300,y+19)} ${p(300+w*.96,y-1)}L${p(300+w*.76,y-11)} ${p(300+w,y-20)}Q${p(300+w*.9,y-90)} ${p(300,top)}Z`;
  });
}

export function TreeArt({ design=DEFAULT_DESIGN, mini=false }: { design?: TreeDesign; mini?: boolean }) {
  const id="pine"+useId().replace(/[^a-zA-Z0-9]/g,"");
  const paths=silhouette(design.shape), p=(x:number,y:number)=>shapePoint(design.shape,x,y);
  const palettes=[["#375d48","#244c3a","#42664e"],["#4f7256","#365e49","#648362"],["#3e6260","#294c4a","#587975"],["#4c6950","#2f503c","#6b8059"],["#426651","#2c503e","#658064"]];
  const palette=palettes[design.shape];
  const ribbons=[{y:172,w:52},{y:231,w:79},{y:292,w:108},{y:355,w:136},{y:419,w:164}];
  const [tx,ty]=p(300,62);
  return <g data-tree-design={`${design.topper}-${design.shape}-${design.base}`}>
    <defs>
      {!mini&&<radialGradient id="ornament-warm-glow"><stop stopColor="#ffedb1" stopOpacity=".7"/><stop offset=".5" stopColor="#edcd7c" stopOpacity=".25"/><stop offset="1" stopColor="#edcd7c" stopOpacity="0"/></radialGradient>}
      <clipPath id={`${id}-clip`}>{paths.map((d,i)=><path key={i} d={d}/>)}</clipPath>
      <linearGradient id={`${id}-color`} x1="0" x2="1">{palette.map((color,i)=><stop key={i} offset={i/2} stopColor={color}/>)}</linearGradient>
      {!mini&&<filter id={`${id}-edge`} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency=".08" numOctaves="3" result="noise"/><feDisplacementMap in="SourceGraphic" in2="noise" scale="1.7"/></filter>}
    </defs>
    <g className="tree-paper-outline" opacity="0" fill="none" stroke="#f5edda" strokeWidth="5" strokeLinejoin="round">{paths.map((d,i)=><path key={i} d={d}/>)}</g>
    <path d="M285 437h31l-3 72-24 1Z" fill="#866b4c"/><path d="m296 458 2 44m9-54-3 49" stroke="#aa8c64" strokeWidth="2"/>
    <g filter={mini?undefined:`url(#${id}-edge)`}>{[...paths].reverse().map((d,i)=><g key={i}><path className="pine-canopy" d={d} fill={`url(#${id}-color)`} stroke={palette[1]} strokeWidth="1"/><path d={d} fill="#b7bf8d" opacity={.02+i*.015}/></g>)}
      {!mini&&<g clipPath={`url(#${id}-clip)`}>{Array.from({length:130},(_,i)=>{const y=110+(i*37%350),[x,py]=p(300+Math.sin(i*13.7)*(y-65)*.44,y);return <path key={i} d={`M${x} ${py}l${x<300?-8:8} 9M${x} ${py}l${x<300?-4:4} 12`} stroke={i%3?"#a1b18e":"#183f32"} strokeWidth="1" opacity=".25" strokeLinecap="round"/>;})}</g>}
    </g>
    <g clipPath={`url(#${id}-clip)`} data-base={design.base}>
      {design.base===2 ? [145,206,270,335,400,470].map((y,i)=>{const w=[42,66,93,117,144,169][i];return <g key={i}><path d={`M${p(300-w,y-7)}Q${p(300,y+14)} ${p(300+w,y-7)}`} stroke="#cbd9d1" strokeWidth="15" fill="none" strokeLinecap="round"/><path d={`M${p(300-w,y-10)}Q${p(300,y+8)} ${p(300+w,y-10)}`} stroke="#f8f4e6" strokeWidth="11" fill="none" strokeLinecap="round"/>{[.2,.7].map((v,j)=>{const [x,yy]=p(300-w+w*2*v,y+2);return <path key={j} d={`M${x} ${yy}v${8+i%3*2}`} stroke="#f8f4e6" strokeWidth="6" strokeLinecap="round"/>;})}</g>;}) : ribbons.map(({y,w},i)=>{
        const wire=`M${p(300-w,y-15)}Q${p(300,y+23)} ${p(300+w,y-15)}`;
        return <g key={i}>
          <path d={wire} fill="none" stroke={design.base===1?red:design.base===4?"#cbb98a":"#a39358"} strokeWidth={design.base===1?9:1.5}/>
          {design.base===1?<path d={wire} fill="none" stroke="#d5a67f" strokeWidth="1.2" strokeDasharray="3 5"/>:Array.from({length:design.base===4?11:6+i},(_,j)=>{
            const t=(j+.5)/(design.base===4?11:6+i),x=300-w+2*w*t,yy=y-15+76*t*(1-t),[px,py]=p(x,yy);
            const color=design.base===3?["#dfab85","#b6d2b0","#e8ce84","#a9c8d9"][j%4]:design.base===4?"#f3e7c9":"#f3d992";
            return <g key={j} className={design.base===4?undefined:"tree-light"} style={{animationDelay:`${(i*7+j)*.37}s`}}>
              {design.base!==4&&<circle cx={px} cy={py+4} r="9" fill={color} opacity=".12"/>}
              <circle cx={px} cy={py+(design.base===4?0:4)} r={design.base===4?2.5:3.1} fill={color}/>
            </g>;
          })}
        </g>;
      })}
    </g>
    <svg x={tx-39} y={ty-65} width="78" height="76" viewBox="0 0 100 90"><TreeTopper kind={design.topper}/></svg>
  </g>;
}
