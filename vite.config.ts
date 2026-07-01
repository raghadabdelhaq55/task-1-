import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import type { PreRenderedChunk } from "rollup";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  plugins: [
    react(),
    ...viteStaticCopy({
      targets: [
        {
          src: "manifest.json",
          dest: ".",
        },
      ],
    }),
  ],
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        popup: fileURLToPath(new URL("popup.html", import.meta.url)),
        options: fileURLToPath(new URL("options.html", import.meta.url)),
        background: fileURLToPath(new URL("src/background/index.ts", import.meta.url)),
      },
      output: {
        entryFileNames: (chunkInfo: PreRenderedChunk) => {
          if (chunkInfo.name === "background") {
            return "background.js";
          }

          return "assets/[name].js";
        },
        chunkFileNames: "assets/chunks/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
});
