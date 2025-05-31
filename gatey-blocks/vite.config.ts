import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

console.log("VITE PREMIUM BUILD:", process.env.GATEY_PREMIUM === "true");

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
      external: ["@wordpress/upload-media"],
    },
  },
});
