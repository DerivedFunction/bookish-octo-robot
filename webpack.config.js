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
      meta: "./src/scripts/meta.js",
      react: "./src/scripts/react.js",
      textcontent: "./src/scripts/textContent.js",
    },
    output: {
      filename: "[name].js", // Output bundle for each script
      path: path.resolve(__dirname, "dist/scripts"), // Output directory for all scripts
    },
  },
];
