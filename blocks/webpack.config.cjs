const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const webpack = require("webpack");
const path = require("path");

console.log("PREMIUM BUILD:", process.env.WPSUITE_PREMIUM === "true");

module.exports = function (env = {}) {
  const config = {
    ...defaultConfig,
    entry: {
      editor: [path.resolve(process.cwd(), "src", "editor.tsx")],
      "authenticator-view": [
        path.resolve(process.cwd(), "src", "authenticator", "view.tsx"),
      ],
      "account-attribute-view": [
        path.resolve(process.cwd(), "src", "account-attribute", "view.tsx"),
      ],
    },
    externals: {
      ...defaultConfig.externals,
      "aws-amplify": "WpSuiteAmplify",
      "aws-amplify/auth": "WpSuiteAmplify",
      "aws-amplify/api": "WpSuiteAmplify",
      "aws-amplify/utils": "WpSuiteAmplify",
      "@smart-cloud/aws-amplify-ui": "WpSuiteAmplify",
      "@smart-cloud/aws-amplify-ui-react": "WpSuiteAmplify",
      "@smart-cloud/aws-amplify-ui-react-core": "WpSuiteAmplify",
      "country-data-list": "WpSuiteAmplify",
      "crypto": "WpSuiteCrypto",
      "jose": "WpSuiteJose",
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
