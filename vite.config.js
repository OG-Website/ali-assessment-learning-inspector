import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/ali-assessment-learning-inspector/" : "/",
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5177,
  },
});
