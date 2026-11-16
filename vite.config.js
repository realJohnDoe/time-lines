import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";

// Relative base so the build works under any GitHub Pages path.
export default defineConfig({
  base: "./",
  plugins: [tailwindcss()],
});
