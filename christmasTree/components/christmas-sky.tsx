import { useLanguage } from "@/components/language-provider";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ChevronDown, Clock3, CloudMoon, MoonStar, Sun, Sunset } from "lucide-react";
import { getSky, SKY_LABELS, type SkyMode, type SkyPhase } from "@/lib/christmas-sky";
import { SKY_PATHS, skyWashBackground } from "@/lib/christmas-sky-art";
import "./christmas-sky.css";

export function useChristmasSky() {
  const [now, setNow] = useState(() => new Date());
  const [mode, setMode] = useState<SkyMode>("auto");
  useEffect(() => {
    const refresh = () => { if (!document.hidden) setNow(new Date()); };
    const timer = setInterval(refresh, 60_000);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("pageshow", refresh);
    return () => { clearInterval(timer); document.removeEventListener("visibilitychange", refresh); window.removeEventListener("pageshow", refresh); };
  }, []);
  const sky = getSky(now, mode);
  const style = {
    "--sky-day": sky.weights.day, "--sky-sunset": sky.weights.sunset,
    "--sky-dusk": sky.weights.dusk, "--sky-night": sky.weights.night,
    // Normalize the stacked layers so crossfades do not reveal the base color.
    "--wash-sunset": sky.weights.sunset / (sky.weights.day + sky.weights.sunset || 1),
    "--wash-dusk": sky.weights.dusk / (1 - sky.weights.night || 1),
    "--sky-dark": sky.dark, "--sky-stars": sky.stars,
    ...Object.fromEntries(Object.entries(sky.colors).map(([key, value]) => [`--sky-${key}`, value])),
  } as CSSProperties;
  return { ...sky, mode, setMode, style };
}

export function PaperSky() {
  return <div className="paper-sky" aria-hidden="true">
    {(["day", "sunset", "dusk", "night"] as SkyPhase[]).map(phase => <div key={phase} className={`sky-wash sky-${phase}`} style={{background:skyWashBackground(phase)}}/>)}
    <svg className="paper-sun" viewBox="0 0 120 120"><g stroke="#f7e7b8" strokeWidth="2" strokeLinecap="round">{Array.from({length:12},(_,i)=><path key={i} d="M60 7v7" transform={`rotate(${i*30} 60 60)`}/>)}</g><path d={SKY_PATHS.sun} fill="#f3dc9e" stroke="#e2c88e"/><path d={SKY_PATHS.sunShine} fill="none" stroke="#fff1ca" strokeWidth="3" strokeLinecap="round"/></svg>
    <svg className="paper-moon" viewBox="0 0 100 100"><path d={SKY_PATHS.moon} fill="#f3e5bc" stroke="#d9c997" strokeWidth="1.5"/><path d={SKY_PATHS.moonShine} fill="none" stroke="#fff6da" strokeWidth="2" strokeLinecap="round"/></svg>
    <svg className="paper-cloud cloud-left" viewBox="0 0 280 90"><path d={SKY_PATHS.cloud} fill="currentColor"/><path d="M28 61q47 7 76 2m44 5 50 1" fill="none" stroke="#b8c4be" strokeOpacity=".3" strokeWidth="1.5"/></svg>
    <svg className="paper-cloud cloud-right" viewBox="0 0 280 90"><path d={SKY_PATHS.cloud} fill="currentColor"/></svg>
    <div className="paper-stars">{Array.from({length:34},(_,i)=><svg key={i} viewBox="0 0 24 24" style={{left:`${(i*47+9)%100}%`,top:`${(i*31+4)%91}%`,width:i%4===0?19:7+i%3*3,"--star-delay":`${-i*.73}s`} as CSSProperties}>
      {i%3===0?<path d={SKY_PATHS.star}/>:<circle cx="12" cy="12" r={i%2?3:4.5}/>}
    </svg>)}</div>
  </div>;
}

const icons = {day:Sun,sunset:Sunset,dusk:CloudMoon,night:MoonStar};
export function SkyClock({mode, phase, onChange}: {mode:SkyMode; phase:SkyPhase; onChange:(mode:SkyMode)=>void}) {
  const { t } = useLanguage();
  const details = useRef<HTMLDetailsElement>(null);
  const Icon = icons[phase];
  useEffect(() => {
    const outside = (event: MouseEvent) => { if (event.target instanceof Node && !details.current?.contains(event.target) && details.current) details.current.open = false; };
    document.addEventListener("click", outside);
    return () => document.removeEventListener("click", outside);
  }, []);
  return <details className="sky-clock" ref={details} onKeyDown={event=>{if(event.key==="Escape"&&details.current){details.current.open=false;details.current.querySelector("summary")?.focus();}}}>
    <summary><Icon size={14}/><span>{mode==="auto"?t("此刻"):t("时光")} · {t(SKY_LABELS[phase])}</span><ChevronDown size={12}/></summary>
    <div className="sky-clock-menu">
      <p>{t("看看小树的其他时刻")}</p>
      <div role="group" aria-label={t("背景时光")}>{(["auto","day","sunset","dusk","night"] as SkyMode[]).map(value=>{
        const OptionIcon = value==="auto"?Clock3:icons[value];
        return <button key={value} type="button" aria-pressed={mode===value} onClick={()=>{onChange(value);if(details.current){details.current.open=false;details.current.querySelector("summary")?.focus();}}}><OptionIcon size={15}/>{value==="auto"?t("跟随当地时间"):t(SKY_LABELS[value])}</button>;
      })}</div>
      {mode!=="auto"&&<small>{t("正在预览。选「跟随当地时间」回到此刻。")}</small>}
    </div>
  </details>;
}
