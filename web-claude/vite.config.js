import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Runs on 5174 so it can sit alongside the other frontend (5173).
export default defineConfig({
  plugins: [react()],
  server: { port: 5174 },
});
