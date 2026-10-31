import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Absolute base: nested routes (/pricing etc.) need absolute asset paths.
// In dev, /api goes to `pnpm dev:worker` (wrangler dev on :8787).
export default defineConfig({ base: "/", plugins: [react(), tailwindcss()], server: { proxy: { "/api": "http://localhost:8787" } } });
