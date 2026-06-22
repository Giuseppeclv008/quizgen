/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Served from the custom domain sdaquizzes.io (see public/CNAME), i.e. at the
// site root, so the default "/" base is correct for both dev and production.
export default defineConfig(() => ({
  base: "/",
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
