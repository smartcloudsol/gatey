const defaultConfig = require("@wordpress/scripts/config/webpack.config");

module.exports = function () {
  const config = {
    ...defaultConfig,
    externals: {
      "aws-amplify": "WpSuiteAmplify",
      "aws-amplify/auth": "WpSuiteAmplify",
      "aws-amplify/api": "WpSuiteAmplify",
      "aws-amplify/utils": "WpSuiteAmplify",
      "@aws-amplify/ui": "WpSuiteAmplify",
      "@aws-amplify/ui-react": "WpSuiteAmplify",
      "@aws-amplify/ui-react-core": "WpSuiteAmplify",
      "country-data-list": "WpSuiteAmplify",
      crypto: "WpSuiteWebcrypto",
    },
    optimization: {
      ...defaultConfig.optimization,
      splitChunks: false,
      runtimeChunk: false,
    },
    plugins: [
      ...(defaultConfig.plugins
        ? defaultConfig.plugins.filter(
          (plugin) => plugin?.constructor.name !== "RtlCssPlugin"
        )
        : []),
    ],
  };

  return config;
}
