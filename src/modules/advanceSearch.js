import { toggleButton } from "../app.js";
import { appendSvg } from "./appendSvg.js";

const webBtn = document.getElementById("web-search");
const deepBtn = document.getElementById("deep-search");
const codeBtn = document.getElementById("code-canvas");
function toggleSetting(key, btn) {
  chrome.storage.local.get([key], (result) => {
    const oldValue = result[key] === true;
    if (oldValue) {
      chrome.storage.local.remove(key);
      btn.classList.remove("use");
    } else {
      chrome.storage.local.set({ [key]: true });
      btn.classList.add("use");
    }
  });
}

webBtn.addEventListener("click", async () => {
  toggleSetting("web", webBtn);
});
deepBtn.addEventListener("click", async () => {
  toggleSetting("deep", deepBtn);
});
codeBtn.addEventListener("click", async () => {
  toggleSetting("code", codeBtn);
});
async function initialize() {
  const keys = ["web", "deep", "code"];
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(keys, resolve)
  );

  if (result.web) webBtn.classList.add("use");
  if (result.deep) deepBtn.classList.add("use");
  if (result.code) codeBtn.classList.add("use");
}
document.addEventListener("DOMContentLoaded", async () => {
  await initialize();
  appendSvg(
    { image: "/assets/images/buttons/web.svg", description: "Web Search" },
    webBtn
  );
  appendSvg(
    {
      image: "/assets/images/prompts/generate.svg",
      description: "Deep Reasoning",
    },
    deepBtn
  );
  appendSvg(
    { image: "/assets/images/buttons/canvas.svg", description: "Canvas" },
    codeBtn
  );
});
