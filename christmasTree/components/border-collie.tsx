import { useLanguage } from "@/components/language-provider";
import { useEffect, useRef, useState } from "react";
import "./border-collie.css";

type CollieMood = "sleep" | "walk" | "sit";
const moods: CollieMood[] = ["sleep", "walk", "sit"];
const descriptions: Record<CollieMood, string> = {
  sleep: "一只在树下打盹的小边牧",
  walk: "一只在树下慢慢走动、低头嗅闻的小边牧",
  sit: "一只坐在树下吐舌头、轻轻摇尾巴的小边牧",
};
const ink = "#34413d", shade = "#263530", fur = "#fff8e9", edge = "#dbd1bc";

function Face({ asleep = false, greeting = false }: { asleep?: boolean; greeting?: boolean }) {
  return <g>
    <g className={asleep ? "collie-ear" : "collie-alert-ears"}>
      <path d="M-27-11q-10-8-14-22-6-7 6-10 17-7 29 8l1 17Z" fill={ink}/>
      <path d="M-39-34q16-10 27-2l-4 16-10-6Z" fill={shade}/>
      <path d="M17-23q10-10 15-22 8-8 10 3l3 20-7 13Z" fill={ink}/>
      <path d="m34-36 2 17-12-5Z" fill="#9c8f84"/>
    </g>
    <path d="M-30-14q-2-19 28-20 26-2 34 19l6 10-5 1 7 9-8-1 7 10-9-1 5 9-16-4Q0 29-21 18l-15 5 5-10-9 2 7-10-7 1 8-12-6 1Z" fill={ink}/>
    <path d="M-6-33q6-1 12 0L3-17q-1 9 10 17l-12 15L-14 1q12-8 10-18Z" fill={fur}/>
    <path d="M-23 7q6-12 22-6 16-9 26 6l4 10-6-1 1 6-9-1Q0 32-16 22l-9 2 2-7-6 1Z" fill={fur}/>
    {asleep ? <g fill="none" stroke="#f3eddd" strokeWidth="2.2" strokeLinecap="round">
      <path d="M-22-3q6 5 12 0M11-3q6 5 12-1"/>
    </g> : <g className="collie-eyes">
      <ellipse cx="-16" cy="-4" rx="6.3" ry="7" fill="#f9f5e9"/>
      <ellipse cx="17" cy="-4" rx="6.3" ry="7" fill="#f9f5e9"/>
      <ellipse cx="-15.3" cy="-3.5" rx="4.9" ry="5.9" fill="#202b27"/>
      <ellipse cx="16.3" cy="-3.5" rx="4.9" ry="5.9" fill="#202b27"/>
      <circle cx="-16.8" cy="-6" r="2" fill="#fffefa"/><circle cx="14.8" cy="-6" r="2" fill="#fffefa"/>
      <circle cx="-13" cy="-.5" r=".8" fill="#fffefa"/><circle cx="18.5" cy="-.5" r=".8" fill="#fffefa"/>
    </g>}
    <path d="M-8 8q1-7 9-6 8 0 7 7-2 6-8 6-7-1-8-7Z" fill={shade}/>
    <ellipse cx="-2" cy="6" rx="2.2" ry="1.2" fill="#78817a"/>
    {asleep ? <path d="M0 15q-5 5-10 0m10 0q5 5 10 0" stroke="#8b8374" strokeWidth="1.3" fill="none" strokeLinecap="round"/> : <g className={greeting ? "collie-bark-mouth" : undefined}>
      <path d="M-12 16q12 10 24 0-3 16-12 16-8 0-12-16Z" fill={shade}/>
      <g className="collie-tongue"><path d="M-7 22q7-3 14 0l-2 6q-5 6-10 0Z" fill="#d98786"/><path d="M0 22v6" stroke="#b56768" strokeWidth="1.1" strokeLinecap="round"/></g>
      <path d="M-15 13q1 8 7 7m23-7q-1 8-7 7" stroke={shade} strokeWidth="2" fill="none" strokeLinecap="round"/>
    </g>}
    <path d="m-25-19 3 4m2-8 3 5m36-5-3 5m7-1-3 3" stroke={shade} strokeWidth="2" strokeLinecap="round"/>
  </g>;
}

function CollieHitArea() {
  return <rect className="collie-hit-area" x="4" y="1" width="144" height="112" rx="16" fill="transparent" aria-hidden="true"/>;
}

function SleepingCollie() {
  return <g>
    <ellipse cx="74" cy="104" rx="60" ry="6" fill="#c3b795" opacity=".23"/>
    <g className="collie-breath">
      <path d="M28 94Q16 63 52 55q43-17 65 13 18 27-10 35H38Z" fill={ink}/>
      <path d="M83 58q24 1 29 22l-12 3 7 7-17 1 2 7H69q17-15 14-40Z" fill={fur}/>
      <path d="M27 91q-20 0-17-19 0-10 7-13-3 13 8 16 29 4 51 17 21 12 43-2-9 20-42 15Z" fill={shade}/>
      <path d="M94 98q12 1 25-8-4 13-23 16l-10-3 10-2-5-2Z" fill={fur}/>
    </g>
    <path d="M26 96q15-9 30 0l1 7H25Z" fill={fur} stroke={edge} strokeWidth="1"/>
    <g transform="translate(47 78) rotate(-14) scale(.86)"><Face asleep/></g>
    <path d="M33 101v3m6-3v3" stroke={edge} strokeWidth="1.2" strokeLinecap="round"/>
    <CollieHitArea/>
  </g>;
}

function SittingCollie({ greeting = false }: { greeting?: boolean }) {
  return <g className={greeting ? "collie-hello-body" : undefined}>
    <ellipse cx="77" cy="105" rx="48" ry="6" fill="#c3b795" opacity=".23"/>
    <g className="collie-sit-tail">
      <path d="M95 91q20 5 33-14l6-13 3 8 5-4q5 25-20 32-16 5-27-1Z" fill={ink}/>
      <path d="m128 77 6-13 3 8 5-4q4 15-8 24l-3-6-6 1 5-5Z" fill={fur}/>
    </g>
    <path d="M55 47q19-12 37 0l11 35q11 6 5 20H42q-7-13 5-22Z" fill={ink}/>
    <path d="M49 78q-17 5-12 23 7 7 22 3l2-21M95 78q16 5 13 23-4 7-22 3l-3-21" fill={shade}/>
    <path d="m54 51 20-5 23 7 4 9-4-1 9 11-7-2 5 12-8-4 3 10-9-2-5 9-9 5-11-5-7-9-9 3 2-10-8 3 4-12-6 2 9-12-4 1Z" fill={fur}/>
    <g fill="none" stroke="#e8e2d5" strokeWidth="1.4" strokeLinecap="round"><path d="m57 67 5 8m-4 2 6 8m4-17 1 12m20-11-4 9m8 0-6 7m-16 3 4 7m7-12-3 7"/></g>
    <path d="m59 77 10 1 1 22q1 6-15 5-7-3 0-8Zm23 1 10-1 4 20q7 9-10 9-8-1-5-7Z" fill={fur} stroke={edge} strokeWidth="1"/>
    <path d="M58 102v3m5-3v3m23-3v3m6-3v3" stroke={edge} strokeWidth="1.2" strokeLinecap="round"/>
    <path d="M56 49q17 8 36 0" fill="none" stroke="#93494b" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="76" cy="56" r="3.3" fill="#c5a363"/>
    <g transform="translate(74 45) scale(.93)"><g className="collie-sit-head"><Face greeting={greeting}/></g></g>
    <CollieHitArea/>
  </g>;
}

function WalkingCollie() {
  return <g className="collie-roam">
    <ellipse cx="75" cy="105" rx="54" ry="5" fill="#c3b795" opacity=".2"/>
    <g className="collie-direction">
      <g className="collie-walk-tail">
        <path d="M35 62Q10 68 8 39l-3-8 8 4 4-4q-4 19 21 17Z" fill={ink}/>
        <path d="M8 47Q4 34 5 31l8 4 4-4q-3 10 1 16l-5-1-1 5Z" fill={fur}/>
      </g>
      <g className="collie-leg collie-leg-back-a"><path d="m47 75 10 1-5 22 3 5H40l2-6Z" fill={shade}/><path d="m42 95 9 1 4 7H40Z" fill="#e1dece"/></g>
      <g className="collie-leg collie-leg-back-b"><path d="m88 74 8 2 5 23-1 4H87l4-7Z" fill={shade}/><path d="m90 95 10 3v5H87Z" fill="#e1dece"/></g>
      <path d="M30 66q-3-22 24-22l43 1q23 8 10 35L83 87 43 82Z" fill={ink}/>
      <path d="M82 46q23-6 28 16l-5 17-5-2-5 10-9-3 3-6-8-1 4-6-5-3 5-6Z" fill={fur}/>
      <g className="collie-leg collie-leg-front-a"><path d="m35 73 14 4-6 22q8 8-10 6-5-1-1-7Z" fill={ink}/><path d="m32 96 12 1-1 2q8 8-10 6-5-1-1-7Z" fill={fur}/></g>
      <g className="collie-leg collie-leg-front-b"><path d="m92 77 9-1 6 22q9 8-10 7-4-1-2-7Z" fill={fur} stroke={edge} strokeWidth="1"/></g>
      <g className="collie-sniff-head">
        <path d="M94 48q12-3 17 5" fill="none" stroke="#93494b" strokeWidth="5" strokeLinecap="round"/>
        <path d="M96 51q-7-11 0-25l-1-15q13 1 18 13 17-1 19 14l11 8q6 10-8 15l-21-1-11 6-10-3Z" fill={ink}/>
        <path d="m99 18 9 10-9 8Z" fill="#a78f82"/>
        <path d="M115 25q7 1 11 6-9 9 4 14l14 1q5 9-9 15l-23-2-7 5-8-4 6-7 9-3Z" fill={fur}/>
        <g className="collie-profile-eye"><ellipse cx="120" cy="38" rx="4.8" ry="5.3" fill={fur}/><ellipse cx="120.5" cy="38" rx="3.7" ry="4.5" fill="#242f2b"/><circle cx="121" cy="36.5" r="1.4" fill={fur}/></g>
        <path d="M138 46q5-3 8 0 0 5-5 5Z" fill={shade}/>
        <path d="M130 56q8 1 10-4" fill="none" stroke="#8b8374" strokeWidth="1.2" strokeLinecap="round"/>
        <circle cx="106" cy="63" r="2.7" fill="#c5a363"/>
      </g>
    </g>
    <CollieHitArea/>
  </g>;
}

export function BorderCollie({ paused = false }: { paused?: boolean }) {
  const { t } = useLanguage();
  const [mood, setMood] = useState<CollieMood>("sleep");
  const dog = useRef<SVGGElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const greetingLocked = useRef(false);
  const [greeting, setGreeting] = useState<{ offset: number } | null>(null);
  const countdown = useRef<{ mood: CollieMood; remaining: number } | null>(null);
  const [reduced, setReduced] = useState(() => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [visible, setVisible] = useState(() => typeof document === "undefined" || !document.hidden);
  useEffect(() => {
    const sound = new Audio("/audio/collie-happy-puppy.wav");
    sound.preload = "auto";
    audio.current = sound;
    return () => { sound.pause(); sound.removeAttribute("src"); sound.load(); audio.current = null; };
  }, []);
  useEffect(() => {
    if (!greeting) return;
    const timer = setTimeout(() => { greetingLocked.current = false; setGreeting(null); }, 1550);
    return () => clearTimeout(timer);
  }, [greeting]);
  useEffect(() => {
    if (visible && !paused) return;
    audio.current?.pause();
    greetingLocked.current = false;
    setGreeting(null);
  }, [visible, paused]);
  useEffect(() => {
    const preference = matchMedia("(prefers-reduced-motion: reduce)");
    const onPreference = () => setReduced(preference.matches);
    const onVisibility = () => setVisible(!document.hidden);
    preference.addEventListener("change", onPreference);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      preference.removeEventListener("change", onPreference);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);
  useEffect(() => {
    if (!countdown.current || countdown.current.mood !== mood) {
      // Walking is one complete out-and-back stroll; quiet poses linger a little differently each time.
      countdown.current = { mood, remaining: mood === "walk" ? 24000 : mood === "sleep" ? 12000 + Math.random() * 4000 : 14000 + Math.random() * 4000 };
    }
    if (reduced || paused || !visible || greeting) return;
    const stage = countdown.current;
    const started = performance.now();
    const timer = window.setTimeout(() => setMood(moods[(moods.indexOf(mood) + 1) % moods.length]), stage.remaining);
    return () => {
      clearTimeout(timer);
      stage.remaining = Math.max(0, stage.remaining - (performance.now() - started));
    };
  }, [mood, paused, reduced, visible, greeting]);
  const pose = reduced ? "sit" : mood;
  function sayHello() {
    if (paused || !visible || greetingLocked.current) return;
    greetingLocked.current = true;
    const roaming = dog.current?.querySelector(".collie-roam");
    const transform = roaming ? getComputedStyle(roaming).transform : "none";
    const offset = transform === "none" ? 0 : new DOMMatrixReadOnly(transform).m41;
    setGreeting({ offset });
    if (audio.current) {
      audio.current.currentTime = 0;
      // A click/tap directly starts the two-bark recording, including in mobile browsers.
      void audio.current.play().catch(() => {});
    }
  }
  return <g ref={dog} className={`border-collie ${paused || !visible ? "collie-paused" : ""} ${greeting ? "is-greeting" : ""}`} transform="translate(320 463) scale(.8)" role="button" tabIndex={paused ? -1 : 0} aria-disabled={paused} aria-label={t("{description}，点一下让它汪汪叫两声",{description:t(descriptions[pose])})} data-mood={greeting ? "hello" : pose}
    onClick={event => { event.stopPropagation(); sayHello(); }}
    onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); event.stopPropagation(); sayHello(); } }}>
    <title>{t("摸摸小边牧")}</title>
    <g key={pose} className="collie-pose" style={greeting ? { visibility: "hidden" } : undefined}>
      {pose === "sleep" ? <SleepingCollie/> : pose === "walk" ? <WalkingCollie/> : <SittingCollie/>}
    </g>
    {greeting && <g className="collie-greeting" transform={`translate(${greeting.offset} 0)`}>
      <SittingCollie greeting/>
      <g className="collie-woof" aria-hidden="true"><path d="M111 5h36q7 0 7 7v10q0 7-7 7h-25l-9 6 2-6h-4q-7 0-7-7V12q0-7 7-7Z" fill="#fff8e9" stroke="#d6c59c" strokeWidth="1"/><text x="129" y="22" textAnchor="middle" fill="#51634f" fontSize="12" fontFamily="sans-serif">{t("汪汪")}</text></g>
    </g>}
  </g>;
}

/** Bake the current little movements into the standalone SVG used by the share card. */
export function freezeCollieForCard(source: SVGSVGElement, clone: SVGSVGElement) {
  const original = source.querySelectorAll<SVGGElement>(".border-collie g");
  const copied = clone.querySelectorAll<SVGGElement>(".border-collie g");
  original.forEach((part, index) => {
    const target = copied[index];
    if (!target) return;
    const computed = getComputedStyle(part);
    if (computed.transform !== "none") {
      const [x = 0, y = 0] = computed.transformOrigin.split(" ").map(parseFloat);
      target.setAttribute("transform", `translate(${x} ${y}) ${computed.transform} translate(${-x} ${-y})`);
    }
    target.style.animation = "none";
    target.style.opacity = "1";
  });
  clone.querySelectorAll(".collie-hit-area").forEach(node => node.remove());
}
