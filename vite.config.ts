import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const shim = (name: string) =>
  fileURLToPath(new URL(`./e2e/shims/${name}.ts`, import.meta.url));

export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // `vite --mode e2e` swaps the Tauri plugins for browser stand-ins so the
  // real app can be driven by Playwright without the desktop shell.
  resolve: {
    alias: (mode === "e2e"
      ? {
          "@tauri-apps/plugin-sql": shim("tauri-sql"),
          "@tauri-apps/plugin-fs": shim("tauri-fs"),
          "@tauri-apps/plugin-dialog": shim("tauri-dialog"),
        }
      : {}) as Record<string, string>,
  },
  server: {
    watch: {
      // cargo writes build artifacts here; watching them crashes Vite (EBUSY)
      ignored: ["**/src-tauri/**"],
    },
  },
}));
