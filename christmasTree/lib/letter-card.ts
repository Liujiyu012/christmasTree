import { translate, type Locale } from "./i18n.ts";
export type Letter = {id:string;body:string;signature:string;anonymous:boolean;createdAt:number;mine:boolean;version:number;unread:boolean};
const serif = '"Songti SC", "Noto Serif CJK SC", serif';

// Split by grapheme where supported so emoji and joined characters stay together.
export function wrapLetter(text:string, measure:(text:string)=>number, width:number):string[] {
  const Segmenter = (Intl as unknown as {Segmenter?:new(locales:string,options:{granularity:string})=>{segment:(text:string)=>Iterable<{segment:string}>}}).Segmenter;
  const segmenter = Segmenter ? new Segmenter("zh-CN",{granularity:"grapheme"}) : null;
  const lines:string[]=[];
  for (const paragraph of text.replace(/\r\n?/g,"\n").split("\n")) {
    let line="";
    const chars = segmenter ? Array.from(segmenter.segment(paragraph),part=>part.segment) : Array.from(paragraph);
    for (const char of chars) {
      if (line && measure(line+char)>width) { lines.push(line);line=char; }
      else line+=char;
    }
    lines.push(line);
  }
  return lines;
}

function star(ctx:CanvasRenderingContext2D,x:number,y:number,r:number,color="#b29457") {
  ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(x,y-r);ctx.quadraticCurveTo(x+4,y-4,x+r,y);
  ctx.quadraticCurveTo(x+4,y+4,x,y+r);ctx.quadraticCurveTo(x-4,y+4,x-r,y);
  ctx.quadraticCurveTo(x-4,y-4,x,y-r);ctx.fill();
}
function holly(ctx:CanvasRenderingContext2D,x:number,y:number,scale=1) {
  ctx.save();ctx.translate(x,y);ctx.scale(scale,scale);
  for(const angle of [-.7,.65]){ctx.save();ctx.rotate(angle);ctx.fillStyle="#526b4e";ctx.beginPath();ctx.moveTo(0,0);ctx.quadraticCurveTo(-42,-20,-20,-65);ctx.quadraticCurveTo(10,-51,0,0);ctx.fill();ctx.restore();}
  ctx.fillStyle="#934b4e";for(const [bx,by] of [[-10,0],[10,1],[0,16]]){ctx.beginPath();ctx.arc(bx,by,9,0,Math.PI*2);ctx.fill();}ctx.restore();
}
function gingerbread(ctx:CanvasRenderingContext2D,x:number,y:number) {
  ctx.save();ctx.translate(x,y);ctx.rotate(.13);ctx.lineCap="round";ctx.lineJoin="round";
  ctx.strokeStyle="#ba8353";ctx.lineWidth=45;
  ctx.beginPath();ctx.moveTo(-54,13);ctx.lineTo(0,35);ctx.lineTo(54,9);ctx.moveTo(0,25);ctx.lineTo(0,85);ctx.moveTo(-28,117);ctx.lineTo(0,74);ctx.lineTo(31,118);ctx.stroke();
  ctx.fillStyle="#ba8353";ctx.beginPath();ctx.arc(0,-20,39,0,Math.PI*2);ctx.fill();
  ctx.strokeStyle="#f9ebd4";ctx.lineWidth=5;
  for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(side*44,9);ctx.lineTo(side*39,22);ctx.moveTo(side*27,101);ctx.lineTo(side*15,108);ctx.stroke();}
  ctx.fillStyle="#604a37";for(const xx of [-12,12]){ctx.beginPath();ctx.arc(xx,-24,3.4,0,Math.PI*2);ctx.fill();}
  ctx.beginPath();ctx.arc(0,-15,11,.2,Math.PI-.2);ctx.stroke();
  ctx.fillStyle="#98494b";for(const yy of [47,70]){ctx.beginPath();ctx.arc(0,yy,5,0,Math.PI*2);ctx.fill();}
  ctx.fillStyle="#637951";ctx.beginPath();ctx.moveTo(0,19);ctx.lineTo(-17,9);ctx.lineTo(-17,28);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(0,19);ctx.lineTo(17,9);ctx.lineTo(17,28);ctx.closePath();ctx.fill();ctx.restore();
}
function paper(ctx:CanvasRenderingContext2D,h:number) {
  ctx.fillStyle="#eee1cb";ctx.fillRect(0,0,1200,h);
  ctx.fillStyle="#f9f1e0";ctx.fillRect(21,21,1158,h-42);
  // A muted red-and-green postal edge, kept away from the handwritten content.
  ctx.save();ctx.beginPath();ctx.rect(24,24,1152,h-48);ctx.rect(40,40,1120,h-80);ctx.clip("evenodd");
  for(let i=-h;i<1250;i+=64){ctx.fillStyle=(Math.round((i+h)/64)%2)?"#8d484c":"#4e6b59";ctx.beginPath();ctx.moveTo(i,0);ctx.lineTo(i+26,0);ctx.lineTo(i+h+26,h);ctx.lineTo(i+h,h);ctx.fill();}ctx.restore();
  ctx.fillStyle="#faf4e7";ctx.fillRect(44,44,1112,h-88);
  ctx.strokeStyle="#d5c6a6";ctx.lineWidth=1.2;ctx.strokeRect(56,56,1088,h-112);
  ctx.fillStyle="rgba(125,93,54,.045)";for(let i=0;i<4200;i++)ctx.fillRect((i*73.37)%1200,(i*137.51)%h,1,2);
  holly(ctx,112,101,.55);holly(ctx,1093,h-95,.55);
}
function postage(ctx:CanvasRenderingContext2D) {
  ctx.save();ctx.translate(1007,172);ctx.rotate(.105);
  ctx.fillStyle="#efe2c7";ctx.fillRect(-67,-80,134,158);
  ctx.fillStyle="#faf4e7";for(let x=-61;x<68;x+=16){for(const y of [-80,78]){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}}
  for(let y=-70;y<80;y+=16){for(const x of [-67,67]){ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}}
  ctx.strokeStyle="#b9a27b";ctx.strokeRect(-53,-66,106,130);
  star(ctx,0,-9,32,"#a64f4e");ctx.font="16px Georgia, serif";ctx.fillStyle="#7c6a4b";ctx.textAlign="center";ctx.fillText("25 · DEC",0,44);ctx.restore();
  ctx.save();ctx.strokeStyle="#9e907064";ctx.lineWidth=2;
  for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(849,140+i*13);ctx.bezierCurveTo(875,123+i*13,898,153+i*13,926,138+i*13);ctx.stroke();}ctx.restore();
}

export async function makeLetterCards(letter:Letter, recipient:string, sticker:HTMLImageElement, locale:Locale="zh"):Promise<Blob[]> {
  const t=(source:string,values?:Record<string,string|number>)=>translate(locale,source,values);
  await document.fonts.ready;
  const canvas=document.createElement("canvas");canvas.width=1200;
  const ctx=canvas.getContext("2d");if(!ctx)throw new Error("当前浏览器暂不支持生成图片。");
  ctx.font=`40px ${serif}`;
  const lines=wrapLetter(letter.body,text=>ctx.measureText(text).width,976);
  // Keep complete text and a large tree on every page, within mobile canvas limits.
  const pages:string[][]=[];for(let i=0;i<lines.length;i+=18)pages.push(lines.slice(i,i+18));
  const blobs:Blob[]=[];
  for(let page=0;page<pages.length;page++) {
    const rows=pages[page],bodyBottom=365+(Math.max(3,rows.length)-1)*62;
    canvas.height=Math.max(1440,bodyBottom+920);const h=canvas.height;
    paper(ctx,h);postage(ctx);
    ctx.textAlign="left";ctx.fillStyle="#9e8053";ctx.font="18px Georgia, serif";ctx.fillText("A LITTLE CHRISTMAS POST · 2026",157,116);
    ctx.fillStyle="#315441";ctx.font=`64px ${serif}`;ctx.fillText(t("冬日来信"),108,213,710);
    ctx.strokeStyle="#b5625b";ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(112,235);ctx.bezierCurveTo(182,228,236,240,308,232);ctx.stroke();
    ctx.fillStyle="#435b46";ctx.font=`38px ${serif}`;ctx.fillText(t("亲爱的 {name}：",{name:recipient}),112,295,976);
    for(let i=0;i<Math.max(3,rows.length);i++) {
      const y=365+i*62;ctx.strokeStyle="#ddcfb6";ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(112,y+18);ctx.lineTo(1088,y+18);ctx.stroke();
      ctx.fillStyle="#38533f";ctx.font=`40px ${serif}`;if(rows[i])ctx.fillText(rows[i],112,y);
    }
    // A big, tilted paper sticker of the real tree; the text above sets its position.
    const cx=438,cy=bodyBottom+477;
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-.055);
    ctx.fillStyle="#fffdf6";ctx.shadowColor="#69543932";ctx.shadowBlur=26;ctx.shadowOffsetY=10;
    ctx.fillRect(-335,-326,670,674);ctx.shadowColor="transparent";
    ctx.fillStyle="#f1ead8";ctx.fillRect(-313,-305,626,594);
    ctx.drawImage(sticker,-308,-302,616,595.5);
    ctx.fillStyle="#d9bd80b5";ctx.fillRect(-88,-343,176,43);
    ctx.strokeStyle="#b3955770";ctx.lineWidth=1;for(let x=-80;x<88;x+=11){ctx.beginPath();ctx.moveTo(x,-342);ctx.lineTo(x+20,-301);ctx.stroke();}
    ctx.textAlign="center";ctx.fillStyle="#8e7852";ctx.font="italic 22px Georgia, serif";ctx.fillText("a little tree, a little memory",0,325);ctx.restore();
    // Signature sits above the small playful drawings, away from the tree sticker.
    ctx.textAlign="right";ctx.fillStyle="#435b46";ctx.font=`33px ${serif}`;
    const signature=wrapLetter(letter.anonymous?t("一位悄悄想念你的人"):letter.signature,text=>ctx.measureText(text).width,390);
    signature.forEach((line,index)=>ctx.fillText(line,1088,bodyBottom+83+index*42));
    ctx.fillStyle="#a08b6a";ctx.font="22px sans-serif";ctx.fillText(new Date(letter.createdAt).toLocaleDateString(locale==="zh"?"zh-CN":"en-US"),1088,bodyBottom+111+signature.length*42);
    gingerbread(ctx,960,bodyBottom+395);
    star(ctx,861,bodyBottom+305,19);star(ctx,1061,bodyBottom+490,14,"#8d484c");star(ctx,903,bodyBottom+560,11);
    ctx.save();ctx.translate(955,bodyBottom+674);ctx.rotate(.11);ctx.strokeStyle="#a65b546b";ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,65,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(0,0,57,0,Math.PI*2);ctx.stroke();ctx.textAlign="center";ctx.fillStyle="#a65b54";ctx.font="16px Georgia, serif";ctx.fillText("CHRISTMAS",0,-20);ctx.font="31px Georgia, serif";ctx.fillText("2026",0,15);ctx.font="14px Georgia, serif";ctx.fillText("WITH LOVE",0,38);ctx.restore();
    ctx.textAlign="center";ctx.font="17px Georgia, serif";ctx.fillStyle="#a58a55";
    ctx.fillText(pages.length>1?`CHRISTMAS LETTER · ${page+1} / ${pages.length}`:"A LITTLE CHRISTMAS MEMORY · 2026",600,h-81);
    blobs.push(await new Promise<Blob>((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error("图片生成失败，请重试。")),"image/png")));
  }
  canvas.width=canvas.height=0;
  return blobs;
}
