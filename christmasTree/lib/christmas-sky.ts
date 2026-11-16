export type SkyPhase = "day" | "sunset" | "dusk" | "night";
export type SkyMode = "auto" | SkyPhase;
export const SKY_LABELS: Record<SkyPhase, string> = {
  day: "冬日晴空", sunset: "落日余温", dusk: "蓝紫暮色", night: "星光晚安",
};
const phases: SkyPhase[] = ["day", "sunset", "dusk", "night"];
// A storybook day follows device-local time, without location or weather access.
const stops: [number, SkyPhase][] = [
  [0, "night"], [5, "night"], [7, "day"], [15, "day"],
  [17, "sunset"], [18.5, "dusk"], [20, "night"], [24, "night"],
];
const palettes = {
  day: { ink: "#304e49", muted: "#546e70", accent: "#805c3d", emphasis: "#894b49", line: "#aebfba" },
  sunset: { ink: "#5a413d", muted: "#74544b", accent: "#85532f", emphasis: "#853d43", line: "#c99e89" },
  dusk: { ink: "#fff5e6", muted: "#eee1d8", accent: "#f0d1a4", emphasis: "#f8d5bf", line: "#9b91a7" },
  night: { ink: "#f7eedf", muted: "#dedbda", accent: "#dfc699", emphasis: "#efc4ae", line: "#788298" },
};
function mixHex(a: string, b: string, amount: number) {
  return `#${[1, 3, 5].map(i => Math.round(parseInt(a.slice(i, i + 2), 16) * (1 - amount) + parseInt(b.slice(i, i + 2), 16) * amount).toString(16).padStart(2, "0")).join("")}`;
}
export function getSky(date: Date, mode: SkyMode = "auto") {
  const hour = date.getHours() + date.getMinutes() / 60;
  const next = stops.findIndex(([time]) => time > hour);
  const [fromTime, from] = stops[Math.max(0, next - 1)];
  const [toTime, to] = stops[next < 0 ? stops.length - 1 : next];
  const fraction = Math.min(1, Math.max(0, (hour - fromTime) / (toTime - fromTime || 1)));
  const blend = fraction * fraction * (3 - 2 * fraction);
  const weights = Object.fromEntries(phases.map(phase => [phase, mode === "auto"
    ? (phase === from ? 1 - blend : 0) + (phase === to ? blend : 0)
    : Number(mode === phase)])) as Record<SkyPhase, number>;
  const phase = mode === "auto" ? (blend < .5 ? from : to) : mode;
  const dark = weights.dusk + weights.night;
  // Dark and light text must not fade through a low-contrast middle gray.
  const inkPhase = dark > .65 ? (weights.night >= weights.dusk ? "night" : "dusk")
    : (weights.sunset >= weights.day ? "sunset" : "day");
  const colors = Object.fromEntries(Object.keys(palettes.day).map(key => {
    const token = key as keyof typeof palettes.day;
    return [token, token === "line" && mode === "auto"
      ? mixHex(palettes[from][token], palettes[to][token], blend) : palettes[inkPhase][token]];
  })) as typeof palettes.day;
  if (dark > .15 && dark < .85) {
    colors.ink = colors.muted = dark > .65 ? "#fff9ef" : "#26332f";
  }
  return { phase, weights, colors, dark, stars: weights.dusk * .35 + weights.night };
}
