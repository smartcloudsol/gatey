const defaultConfig = require("@wordpress/scripts/config/webpack.config");

module.exports = function () {
  const config = {
    ...defaultConfig,
    resolve: {
      ...defaultConfig.resolve,
      fallback: {
        crypto: false,
        buffer: false,
        stream: false,
      }
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
      "crypto": "WpSuiteCrypto",
      "jose": "WpSuiteJose",
    },
    optimization: {
      ...defaultConfig.optimization,
      splitChunks: false,
      runtimeChunk: false,
    },
    output: {
      ...defaultConfig.output,
      chunkFilename: "[name].js",
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
