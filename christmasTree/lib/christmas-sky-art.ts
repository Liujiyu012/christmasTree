import type { SkyPhase } from "./christmas-sky";

type SkyWash = {
  stops: [number, string][];
  glow: { x: number; y: number; color: string; radius: number };
};

// The live sky and saved card share the same paint and paper-cut silhouettes.
export const SKY_WASHES: Record<SkyPhase, SkyWash> = {
  day: { stops: [[0, "#abcbd9"], [.42, "#d6e3e4"], [1, "#f3f0e4"]], glow: { x: .17, y: .22, color: "#f7ead44d", radius: .44 } },
  sunset: { stops: [[0, "#cb9493"], [.35, "#e6afa0"], [.7, "#f0ceac"], [1, "#f5e4c9"]], glow: { x: .18, y: .32, color: "#ffe3a980", radius: .45 } },
  dusk: { stops: [[0, "#414d6c"], [.5, "#666985"], [1, "#796d88"]], glow: { x: 1, y: .46, color: "#bba9c747", radius: .6 } },
  night: { stops: [[0, "#242f49"], [.53, "#364760"], [1, "#4e5b70"]], glow: { x: .32, y: .51, color: "#88949b20", radius: .54 } },
};

export function skyWashBackground(phase: SkyPhase) {
  const { stops, glow } = SKY_WASHES[phase];
  return `radial-gradient(ellipse at ${glow.x * 100}% ${glow.y * 100}%, ${glow.color}, transparent ${glow.radius * 100}%), linear-gradient(180deg, ${stops.map(([position, color]) => `${color} ${position * 100}%`).join(", ")})`;
}

export const SKY_PATHS = {
  sun: "M60 24C83 23 99 40 97 61S82 98 59 96 23 80 24 59 38 25 60 24Z",
  sunShine: "M42 35Q27 49 32 65",
  moon: "M65 12C34 3 13 27 17 55S47 92 72 78C46 79 32 55 41 33q7-15 24-21Z",
  moonShine: "M27 43q-5 21 13 32",
  cloud: "M8 67Q-2 42 28 42q-5-26 26-23 14-28 39-8 34-21 49 16 29-4 37 16 37-8 45 17 31-5 42 18Q138 96 8 67Z",
  star: "m12 1 2.5 8.5L23 12l-8.5 2.5L12 23l-2.5-8.5L1 12l8.5-2.5Z",
};
