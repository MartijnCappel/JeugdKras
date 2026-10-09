import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base "./" zorgt dat de app overal werkt, ook op GitHub Pages onder /<repo-naam>/
export default defineConfig({
  plugins: [react()],
  base: "./",
});
