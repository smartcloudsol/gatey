const defaultConfig = require("@wordpress/scripts/config/webpack.config");
const webpack = require("webpack");
const path = require("path");

module.exports = function (env = {}) {
  const config = {
    ...defaultConfig,
    entry: {
      index: [
        path.resolve(
          process.cwd(),
          "src",
          "stubs",
          "polyfill-webcrypto-liner.cjs"
        ),
        path.resolve(process.cwd(), "src", "index.ts"),
      ],
    },
    resolve: {
      ...defaultConfig.resolve,
      fallback: {
        ...defaultConfig.resolve?.fallback,
        crypto: false,
        util: require.resolve("util/"),
        stream: require.resolve("stream-browserify"),
        vm: require.resolve("vm-browserify"),
        buffer: require.resolve("buffer-browserify"),
        "process/browser": require.resolve("process/browser"),
      },
      alias: {
        crypto: path.resolve(__dirname, "src/stubs/crypto-random.js"),
        "node:crypto": false,
        ...(defaultConfig.resolve?.alias || {}),
      },
    },
    optimization: {
      ...defaultConfig.optimization,
      splitChunks: false,
      runtimeChunk: false,
    },
    plugins: [
      ...defaultConfig.plugins.filter(
        (plugin) => plugin.constructor.name !== "RtlCssPlugin"
      ),
      new webpack.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
        process: "process/browser",
      }),
      new webpack.DefinePlugin({ "process.versions": "{}" }),
    ],
  };

  return config;
};
