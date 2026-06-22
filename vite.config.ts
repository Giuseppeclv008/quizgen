/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// On GitHub Pages the app is served from https://<user>.github.io/quizgen/,
// so production assets need the "/quizgen/" base. Dev/test stay at "/".
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/quizgen/" : "/",
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
}));
