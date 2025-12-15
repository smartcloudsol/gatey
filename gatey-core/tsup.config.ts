import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  minify: true,
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  external: [
    /^aws-amplify(\/.*)?$/,
    /^@aws-amplify\/ui(\/.*)?$/,
    /^@aws-amplify\/ui-react(\/.*)?$/,
  ],
});
