import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: false,
    sourcemap: true,
    lib: {
      entry: fileURLToPath(new URL("src/content/index.ts", import.meta.url)),
      name: "GhostwriterContent",
      formats: ["iife"],
      fileName: () => "content.js",
    },
  },
});
