import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  base: "/mcti-storm-dashboard/",
  plugins: [react()],
  build: {
    outDir: "docs",
  },
  server: {
    port: 5173,
  },
});