const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const webpack = require("webpack");

console.log("WEBPACK PREMIUM BUILD:", process.env.GATEY_PREMIUM === "true");

module.exports = function (env = {}) {
  const config = {
    ...defaultConfig,
    resolve: {
      ...defaultConfig.resolve,
      fallback: {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        vm: require.resolve("vm-browserify"),
        buffer: require.resolve("buffer-browserify"),
        "process/browser": require.resolve("process/browser"),
      },
    },
    plugins: [
      ...defaultConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== "RtlCssPlugin"
      ),
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
      new webpack.ProvidePlugin({
        process: "process/browser",
      }),
      new webpack.EnvironmentPlugin({
        GATEY_PREMIUM: false,
      }),
    ],
  };

  return config;
};
