import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import basicSsl from "@vitejs/plugin-basic-ssl";
//import tailwindcss from "@tailwindcss/vite";

console.log("VITE PREMIUM BUILD:", process.env.GATEY_PREMIUM === "true");

export default defineConfig({
  plugins: [react(), basicSsl() /*, tailwindcss()*/],
  define: {
    global: {},
    "process.env": {},
  },
});
