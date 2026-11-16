export type TreeDesign = { topper: number; shape: number; base: number };
export const DEFAULT_DESIGN: TreeDesign = { topper: 0, shape: 0, base: 0 };
export const TOPPERS = ["许愿金星", "报喜天使", "丝绒蝴蝶结", "冰晶雪花", "星月晚安"];
export const SHAPES = ["经典冷杉", "圆圆云杉", "修长雪松", "层层青松", "俏皮歪松"];
export const BASES = ["暖金灯串", "莓红彩带", "枝头初雪", "缤纷彩灯", "珍珠垂链"];
export function isTreeDesign(value: unknown): value is TreeDesign {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const design = value as Record<string, unknown>;
  return ["topper", "shape", "base"].every(key => Number.isInteger(design[key]) && (design[key] as number) >= 0 && (design[key] as number) < 5);
}
export function treeDesign(value: unknown): TreeDesign {
  return isTreeDesign(value) ? { topper: value.topper, shape: value.shape, base: value.base } : { ...DEFAULT_DESIGN };
}
export const BASE_SLOTS = [
  [300,120], [278,169],[326,173], [254,222],[300,214],[347,223],
  [229,274],[275,266],[326,269],[373,278],
  [207,327],[252,320],[300,325],[349,322],[397,330],
  [179,380],[221,376],[262,381],[303,374],[343,381],[383,377],[424,384],
  [150,436],[193,433],[235,438],[277,430],[322,437],[365,432],[408,438],[452,433],
];
// IDs stay fixed when the silhouette changes, preserving each friend's ornament and letter.
export function shapePoint(shape: number, x: number, y: number): [number, number] {
  const width = [1, 1.06, .83, 1.02, .96][shape] ?? 1;
  const bend = shape === 4 ? 42 * Math.pow(Math.max(0, (480 - y) / 418), 2) : 0;
  return [300 + (x - 300) * width + bend, y];
}
export function treeSlots(shape: number) { return BASE_SLOTS.map(([x,y]) => shapePoint(shape,300+(x-300)*.92,y)); }
