import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Frontend dev na 5173, com proxy pro backend na 4600.
// /api e /pecas sao HTTP. /ws e WebSocket.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": { target: "http://localhost:4600", changeOrigin: true },
      "/pecas": { target: "http://localhost:4600", changeOrigin: true },
      "/pecas-edicao": { target: "http://localhost:4600", changeOrigin: true },
      "/modelos-html": { target: "http://localhost:4600", changeOrigin: true },
      "/ws": { target: "http://localhost:4600", ws: true, changeOrigin: true },
    },
  },
  build: {
    outDir: "dist",
    rollupOptions: {
      output: {
        // Bibliotecas grandes em chunks proprios: o codigo do app muda toda
        // rodada, as libs quase nunca. Separar melhora o cache entre builds.
        manualChunks: {
          react: ["react", "react-dom", "react/jsx-runtime", "react-dom/client"],
          reactflow: ["@xyflow/react"],
        },
      },
    },
  },
});
