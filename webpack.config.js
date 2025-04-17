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
      chatgpt: "./src/scripts/chatgpt.js",
      gemini: "./src/scripts/gemini.js",
      deepseek: "./src/scripts/deepseek.js",
      grok: "./src/scripts/grok.js",
      copilot: "./src/scripts/copilot.js",
      claude: "./src/scripts/claude.js",
      perplexity: "./src/scripts/perplexity.js",
      mistral: "./src/scripts/mistral.js",
      huggingface: "./src/scripts/hug.js",
      meta: "./src/scripts/meta.js",
    },
    output: {
      filename: "[name].js", // Output bundle for each script
      path: path.resolve(__dirname, "dist/scripts"), // Output directory for all scripts
    },
  },
];
