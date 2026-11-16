import { useLanguage } from "@/components/language-provider";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { Music2, Pause } from "lucide-react";
import { ChristmasMusic } from "@/lib/christmas-music";
import "./christmas-atmosphere.css";

function PaperSnowflake({ variant }: { variant: number }) {
  if (variant === 1) return <svg viewBox="0 0 32 32" className="snow-cutout"><path d="m16 2 3 8 8-3-3 8 6 4-9 2-1 9-5-7-8 5 2-9-7-5 9-2Z"/><circle cx="16" cy="16" r="2.3" className="snow-hole"/></svg>;
  if (variant === 2) return <svg viewBox="0 0 32 32" className="snow-cutout">{[0,60,120,180,240,300].map(a=><path key={a} transform={`rotate(${a} 16 16)`} d="m16 2 3.5 6-3.5 7-3.5-7Z"/>)}<circle cx="16" cy="16" r="2.5"/></svg>;
  const branches = variant === 0 ? "M16 2v28M10 6l6 6 6-6M10 26l6-6 6 6" : "M16 3v26M12 7l4 4 4-4M12 25l4-4 4 4";
  return <svg viewBox="0 0 32 32" className="snow-lace">{[0,60,120].map(a=><g key={a} transform={`rotate(${a} 16 16)`}><path className="snow-outline" d={branches}/><path className="snow-thread" d={branches}/></g>)}{variant===3&&<circle cx="16" cy="16" r="5" className="snow-thread"/>}</svg>;
}

export function FallingSnow({ enabled }: { enabled: boolean }) {
  return enabled ? <div className="falling-snow" aria-hidden="true">
    {Array.from({ length: 54 }, (_, i) => <span key={i} style={{
      "--snow-x": `${(i * 61.8 + 3) % 100}%`,
      "--snow-size": `${12 + i % 5 * 4}px`,
      "--snow-drift": `${(i % 2 ? -1 : 1) * (24 + i % 4 * 16)}px`,
      "--snow-duration": `${19 + i % 7 * 2}s`,
      "--snow-delay": `${-((i * 11.7) % 31)}s`,
      "--snow-turn": `${i * 47 % 180}deg`,
      "--snow-opacity": .48 + i % 4 * .1,
    } as CSSProperties} className="paper-snowflake"><PaperSnowflake variant={i%4}/></span>)}
  </div> : null;
}

export function SwayingTree({ children, artwork, disabled }: { children: ReactNode; artwork: ReactNode; disabled: boolean }) {
  const { t } = useLanguage();
  const tree = useRef<SVGGElement>(null);
  const animation = useRef<Animation | null>(null);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const reduce = () => { if (preference.matches) animation.current?.cancel(); };
    preference.addEventListener("change", reduce);
    return () => { animation.current?.cancel(); preference.removeEventListener("change", reduce); };
  }, []);
  useEffect(() => { if (disabled) animation.current?.cancel(); }, [disabled]);
  function sway() {
    if (disabled || !tree.current || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    animation.current?.cancel();
    animation.current = tree.current.animate([
      { transform: "rotate(0deg)" }, { transform: "rotate(-1.2deg)" },
      { transform: "rotate(1deg)" }, { transform: "rotate(-.65deg)" },
      { transform: "rotate(.3deg)" }, { transform: "rotate(0deg)" },
    ], { duration: 1900, easing: "ease-in-out" });
  }
  return <g ref={tree} className="swaying-tree" onClick={sway}>
    <g className="tree-touch-area" role="button" tabIndex={disabled ? -1 : 0}
      aria-label={t("轻轻摇一摇圣诞树")} aria-disabled={disabled}
      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); sway(); } }}>
      {artwork}
    </g>
    {children}
  </g>;
}

export function HangingOrnament({ x, y, celebration, children }: { x: number; y: number; celebration: number; children: ReactNode }) {
  return <g transform={`translate(${x} ${y - 23})`} pointerEvents="none">
    <g key={celebration} className={celebration ? "ornament-pendulum ornament-celebrate" : "ornament-pendulum"}>
      {celebration > 0 && <ellipse className="ornament-welcome-glow" cx="0" cy="23" rx="34" ry="31" opacity="0" fill="url(#ornament-warm-glow)" />}
      <svg x="-30" y="0" width="60" height="48" viewBox="0 0 100 80">{children}</svg>
    </g>
  </g>;
}

export function MusicBox() {
  const { t } = useLanguage();
  const player = useRef<ChristmasMusic | null>(null);
  const enabledRef = useRef(true);
  const playingRef = useRef(false);
  const starting = useRef(false);
  const attempt = useRef(0);
  const [enabled, setEnabled] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  function pause() {
    ++attempt.current;
    starting.current = false;
    playingRef.current = false;
    player.current?.pause();
    setPlaying(false);
    setBusy(false);
  }
  async function start() {
    if (!enabledRef.current || document.hidden || starting.current || playingRef.current) return;
    const request = ++attempt.current;
    starting.current = true;
    setError("");
    setBusy(true);
    try {
      player.current ??= new ChristmasMusic();
      const active = await player.current.play();
      if (request !== attempt.current) return;
      playingRef.current = active;
      setPlaying(active);
    } catch {
      if (request !== attempt.current) return;
      player.current?.dispose();
      player.current = null;
      enabledRef.current = false;
      playingRef.current = false;
      setEnabled(false);
      setPlaying(false);
      setError("音乐暂时没能响起，点一下再试试。");
    } finally {
      if (request === attempt.current) { starting.current = false; setBusy(false); }
    }
  }
  function toggle() {
    // An enabled preference is not evidence that sound is playing: on phones,
    // this button must start blocked audio on its first tap, rather than pause it.
    enabledRef.current = !(playingRef.current || starting.current);
    setEnabled(enabledRef.current);
    setError("");
    if (enabledRef.current) void start();
    else pause();
  }
  useEffect(() => {
    const gesture = (event: Event) => {
      if (!event.isTrusted || !enabledRef.current || document.hidden || playingRef.current) return;
      // The music button handles its own intent, including pause before playback starts.
      if (event.target instanceof Element && event.target.closest(".music-toggle")) return;
      if (event instanceof KeyboardEvent && (event.repeat || event.isComposing ||
        ["Tab", "Shift", "Control", "Alt", "Meta", "Escape"].includes(event.key))) return;
      if (starting.current) player.current?.unlock();
      else void start();
    };
    const visibility = () => { if (document.hidden) pause(); else void start(); };
    const restore = () => { void start(); };
    // Capture taps even when a child (for example the puppy) stops propagation.
    document.addEventListener("touchend", gesture, { capture: true, passive: true });
    document.addEventListener("click", gesture, true);
    document.addEventListener("keydown", gesture, true);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", pause);
    window.addEventListener("pageshow", restore);
    void start();
    return () => {
      ++attempt.current;
      starting.current = false;
      playingRef.current = false;
      document.removeEventListener("touchend", gesture, true);
      document.removeEventListener("click", gesture, true);
      document.removeEventListener("keydown", gesture, true);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", pause);
      window.removeEventListener("pageshow", restore);
      player.current?.dispose();
      player.current = null;
    };
  }, []);
  return <div className="music-box">
    <button className="music-toggle" type="button" aria-pressed={playing || busy} aria-busy={busy}
      aria-label={playing || busy ? t("暂停背景音乐《圣诞树》") : t("播放背景音乐《圣诞树》")}
      onClick={toggle}>
      {playing || busy ? <Pause size={13} /> : <Music2 size={14} />}
      <span>{busy ? t("音乐加载中…") : playing ? t("圣诞树，正在轻快奏响") : enabled ? t("点一下听音乐 · 圣诞树") : t("听一会儿 · 圣诞树")}</span>
      <span className={`music-bars ${playing ? "is-playing" : ""}`} aria-hidden="true"><i /><i /><i /></span>
    </button>
    {error && <p className="music-error" role="status">{t(error)}</p>}
  </div>;
}

export function MusicCredit() {
  const { t } = useLanguage();
  return <p className="music-credit">
    {t("音乐：")}<a href="https://incompetech.com/music/royalty-free/index.html?Search=Search&isrc=USUAN1100366" target="_blank" rel="noopener noreferrer">Oh, Christmas Tree — Kevin MacLeod</a>
    {" · "}<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>
  </p>;
}
