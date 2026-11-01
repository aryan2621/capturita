import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Absolute base: nested routes (/pricing etc.) need absolute asset paths.

export default defineConfig({ base: "/", plugins: [react(), tailwindcss()] });
