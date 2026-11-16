import type { getSky, SkyPhase } from "./christmas-sky";
import { SKY_PATHS, SKY_WASHES } from "./christmas-sky-art";

export function drawCardSky(ctx: CanvasRenderingContext2D, sky: ReturnType<typeof getSky>) {
  const { width, height } = ctx.canvas;
  const layer = document.createElement("canvas");
  layer.width = width; layer.height = height;
  const paint = layer.getContext("2d");
  if (!paint) throw new Error("当前浏览器暂不支持生成图片。");
  ctx.save();
  let coverage = 0;
  for (const phase of Object.keys(SKY_WASHES) as SkyPhase[]) {
    const weight = sky.weights[phase];
    coverage += weight;
    if (!weight) continue;
    const { stops, glow } = SKY_WASHES[phase];
    const wash = paint.createLinearGradient(0, 0, 0, height);
    stops.forEach(([position, color]) => wash.addColorStop(position, color));
    paint.fillStyle = wash; paint.fillRect(0, 0, width, height);
    paint.save();
    // CSS's default ellipse reaches the farthest corner; use the same geometry.
    paint.translate(glow.x * width, glow.y * height);
    paint.scale(Math.max(glow.x, 1 - glow.x) * width * Math.SQRT2, Math.max(glow.y, 1 - glow.y) * height * Math.SQRT2);
    const halo = paint.createRadialGradient(0, 0, 0, 0, 0, 1);
    halo.addColorStop(0, glow.color); halo.addColorStop(glow.radius, `${glow.color.slice(0, 7)}00`);
    paint.fillStyle = halo; paint.fillRect(-2, -2, 4, 4);
    paint.restore();
    ctx.globalAlpha = weight / coverage;
    ctx.drawImage(layer, 0, 0);
  }
  ctx.globalAlpha = 1;
  // Keep the small cut-paper accents around the illustration, clear of the title.
  ctx.save(); ctx.translate(100, 335); ctx.globalAlpha = sky.weights.day * .88 + sky.weights.sunset * .75;
  ctx.strokeStyle = "#f7e7b8"; ctx.lineWidth = 2; ctx.lineCap = "round";
  for (let i = 0; i < 12; i++) {
    ctx.save(); ctx.translate(60, 60); ctx.rotate(i * Math.PI / 6);
    ctx.beginPath(); ctx.moveTo(0, -53); ctx.lineTo(0, -46); ctx.stroke(); ctx.restore();
  }
  ctx.fillStyle = "#f3dc9e"; ctx.strokeStyle = "#e2c88e"; ctx.lineWidth = 1;
  ctx.fill(new Path2D(SKY_PATHS.sun)); ctx.stroke(new Path2D(SKY_PATHS.sun));
  ctx.strokeStyle = "#fff1ca"; ctx.lineWidth = 3; ctx.stroke(new Path2D(SKY_PATHS.sunShine));
  ctx.restore();

  ctx.save(); ctx.translate(width - 200, 345); ctx.rotate(-Math.PI / 15); ctx.globalAlpha = sky.stars;
  ctx.fillStyle = "#f3e5bc"; ctx.strokeStyle = "#d9c997"; ctx.lineWidth = 1.5;
  ctx.fill(new Path2D(SKY_PATHS.moon)); ctx.stroke(new Path2D(SKY_PATHS.moon));
  ctx.strokeStyle = "#fff6da"; ctx.lineWidth = 2; ctx.lineCap = "round"; ctx.stroke(new Path2D(SKY_PATHS.moonShine));
  ctx.restore();

  for (const [x, y, angle] of [[-18, 650, -.1], [width - 245, 930, .12]]) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.globalAlpha = sky.weights.day * .52 + sky.weights.sunset * .32 + sky.weights.dusk * .1;
    ctx.fillStyle = "#fbf5e7"; ctx.fill(new Path2D(SKY_PATHS.cloud)); ctx.restore();
  }
  for (let i = 0; i < 34; i++) {
    ctx.save(); ctx.translate(65 + ((i * 47 + 9) % 100) / 100 * (width - 130), 330 + ((i * 31 + 4) % 91) / 91 * 945);
    const size = i % 4 === 0 ? 19 : 7 + i % 3 * 3;
    ctx.scale(size / 24, size / 24); ctx.globalAlpha = sky.stars * (.4 + (i % 5) * .1); ctx.fillStyle = "#f1dfb5";
    if (i % 3 === 0) ctx.fill(new Path2D(SKY_PATHS.star));
    else { ctx.beginPath(); ctx.arc(12, 12, i % 2 ? 3 : 4.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  for (let i = 0; i < 14000; i++) {
    ctx.fillStyle = i % 2 ? "rgba(113,97,59,.035)" : "rgba(255,255,255,.12)";
    ctx.fillRect(i * 79 % width, i * 139 % height, 1.3, 1.3);
  }
  ctx.restore();
}
