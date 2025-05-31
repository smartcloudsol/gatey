import { defineConfig } from "tsup";

import { loadConstants, type Constants } from "./tsup.loader";

const premium = process.env.GATEY_PREMIUM === "true";
console.log("PREMIUM BUILD:", premium);

let constants: Constants = {
  __OB_KEY_EXPR__: 0,
  __OB_PARTS__: {} as RegExpMatchArray,
  __FETCH_EXPR__: "",
  __T_PARAM_EXPR__: "",
  __H_PARAM_EXPR__: "",
  __SITE_ID_EXPR__: "",
  __SUBSCRIBER_EXPR__: "",
  __LAST_UPDATE_EXPR__: "",
};
if (premium) {
  constants = await loadConstants();
}

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  minify: true,
  dts: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  define: {
    __GATEY_PREMIUM__: String(premium),
    __OB_KEY_EXPR__: JSON.stringify(constants.__OB_KEY_EXPR__),
    __OB_PARTS__: JSON.stringify(constants.__OB_PARTS__),
    __FETCH_EXPR__: JSON.stringify(constants.__FETCH_EXPR__),
    __T_PARAM_EXPR__: JSON.stringify(constants.__T_PARAM_EXPR__),
    __H_PARAM_EXPR__: JSON.stringify(constants.__H_PARAM_EXPR__),
    __SITE_ID_EXPR__: JSON.stringify(constants.__SITE_ID_EXPR__),
    __SUBSCRIBER_EXPR__: JSON.stringify(constants.__SUBSCRIBER_EXPR__),
    __LAST_UPDATE_EXPR__: JSON.stringify(constants.__LAST_UPDATE_EXPR__),
  },
});
