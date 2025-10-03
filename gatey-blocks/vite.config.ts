import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

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
