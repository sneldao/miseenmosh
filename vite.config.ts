import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    target: "es2022",
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        // the vendor splits land as parallel requests and cache across game
        // updates: judges refresh into a warm cache, and a gameplay patch no
        // longer re-downloads three.js
        manualChunks: {
          // three.js is the payload — one cacheable chunk, requested in
          // parallel with the game code, unchanged across gameplay patches
          three: ["three", "@react-three/fiber", "@react-three/drei", "react", "react-dom", "zustand"],
        },
      },
    },
  },
});
