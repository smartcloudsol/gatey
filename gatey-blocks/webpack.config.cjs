const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const webpack = require("webpack");
const path = require("path");

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

module.exports = function (env = {}) {
  const config = {
    ...defaultConfig,
    entry: {
      index: [
        path.resolve(process.cwd(), "src", "index.tsx"),
        path.resolve(process.cwd(), "src/account-attribute", "index.tsx"),
        path.resolve(process.cwd(), "src/account-attribute", "view.tsx"),
        path.resolve(process.cwd(), "src/authenticator", "index.tsx"),
        path.resolve(process.cwd(), "src/authenticator", "view.tsx"),
        path.resolve(process.cwd(), "src/custom-block", "index.tsx"),
        path.resolve(process.cwd(), "src/form-field", "index.tsx"),
      ],
    },
    externals: {
      ...defaultConfig.externals,
      "aws-amplify": "WpSuiteAmplify",
      "aws-amplify/auth": "WpSuiteAmplify",
      "aws-amplify/api": "WpSuiteAmplify",
      "aws-amplify/utils": "WpSuiteAmplify",
      "@aws-amplify/ui": "WpSuiteAmplify",
      "@aws-amplify/ui-react": "WpSuiteAmplify",
      "@aws-amplify/ui-react-core": "WpSuiteAmplify",
      "country-data-list": "WpSuiteAmplify",
      "crypto": "WpSuiteWebcrypto",
    },
    optimization: {
      ...defaultConfig.optimization,
      splitChunks: {
        name: (module, chunks, cacheGroupKey) => {
          const allChunksNames = chunks.map((chunk) => chunk.name).join('-');
          return allChunksNames;
        },
      },
    },
    plugins: [
      ...defaultConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== "RtlCssPlugin"
      ),
      new webpack.EnvironmentPlugin({
        WPSUITE_PREMIUM: false,
      }),
    ],
  };

  return config;
};
