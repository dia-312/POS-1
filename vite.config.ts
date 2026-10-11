import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    watch: {
      // cargo writes build artifacts here; watching them crashes Vite (EBUSY)
      ignored: ["**/src-tauri/**"],
    },
  },
});