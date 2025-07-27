const path = require("path");
module.exports = [
  {
    entry: "./src/app.js",
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "app.js",
    },
  },
  {
    entry: "./src/background.js", // Service worker entry point
    output: {
      filename: "background.js", // Output bundle for service worker
      path: path.resolve(__dirname, "dist"), // Output directory for service worker
    },
  },
  {
    entry: {
      injector: "./src/scripts/injector.js", // Entry point for the injector script
    },
    output: {
      filename: "[name].js", // Output bundle for each script
      path: path.resolve(__dirname, "dist/scripts"), // Output directory for all scripts
    },
  },
];
