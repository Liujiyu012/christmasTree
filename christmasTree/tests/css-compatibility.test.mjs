import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { build } from "vite";

test("production CSS preserves phone breakpoints for WebKit before Safari 16.4", async () => {
  // This regression only appears after minification; source CSS alone passes.
  const result = await build({
    root: fileURLToPath(new URL("..", import.meta.url)),
    logLevel: "silent",
    build: { write: false },
  });
  const css = (Array.isArray(result) ? result : [result])
    .flatMap(bundle => bundle.output)
    .filter(asset => asset.type === "asset" && asset.fileName.endsWith(".css"))
    .map(asset => String(asset.source)).join("\n");
  assert.ok(css.length > 0, "Check the emitted production stylesheet");
  const queries = css.match(/@media[^{}]+/g) ?? [];
  assert.ok(queries.some(query => /max-width\s*:\s*760px/.test(query)), "Keep the mobile layout breakpoint");
  assert.ok(queries.some(query => /min-width\s*:\s*1450px/.test(query)), "Keep the desktop layout breakpoint");
  assert.ok(queries.every(query => !/[<>]/.test(query)), "Older WebKit ignores range-syntax media queries");
});
