import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": fileURLToPath(new URL(".", import.meta.url)) } },
  build: {
    sourcemap: false,
    // Older iPhone/WeChat browsers ignore media-query ranges such as width<=760px.
    // Keep min/max-width breakpoints intact when production CSS is minified.
    cssTarget: ["safari15.4", "chrome90", "firefox90"],
  },
});
