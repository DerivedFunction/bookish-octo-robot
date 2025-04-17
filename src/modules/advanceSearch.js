import { toggleClass, resetBtn } from "../app.js";
import { ellipse } from "./actionButtons.js";
import { appendSvg } from "./appendSvg.js";

const webBtn = document.getElementById("web-search");
const deepBtn = document.getElementById("deep-search");
const codeBtn = document.getElementById("code-canvas");
async function toggleSetting(key) {
  await chrome.storage.local.get([key], async (result) => {
    const oldValue = result[key] === true;
    if (oldValue) {
      chrome.storage.local.remove(key);
    } else {
      chrome.storage.local.set({ [key]: true });
    }
    await checkStatus();
  });
}

webBtn.addEventListener("click", async () => {
  await toggleSetting("web", webBtn);
  chrome.runtime.sendMessage({ message: "updateAdvanced" });
});
deepBtn.addEventListener("click", async () => {
  await toggleSetting("deep", deepBtn);
  chrome.runtime.sendMessage({ message: "updateAdvanced" });
});
codeBtn.addEventListener("click", async () => {
  await toggleSetting("code", codeBtn);
  chrome.runtime.sendMessage({ message: "updateAdvanced" });
});
export async function checkStatus() {
  const keys = ["web", "deep", "code"];
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(keys, resolve)
  );
  toggleClass(webBtn, result.web);
  toggleClass(deepBtn, result.deep);
  toggleClass(codeBtn, result.code);
  toggleClass(ellipse, !Object.values(result).every((item) => item === false));
}

async function initialize() {
  await chrome.storage.local.remove(["web", "code", "deep"]);
  [(ellipse, webBtn, codeBtn, deepBtn)].forEach((btn) => {
    toggleClass(btn, false);
  });
  checkStatus();
  chrome.runtime.sendMessage({ message: "updateAdvanced" });
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
  chrome.runtime.onMessage.addListener((e) => {
    if (e?.message === "updateAdvanced") {
      checkStatus();
    }
  });
  resetBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["web", "code", "deep"]);
    [ellipse, webBtn, codeBtn, deepBtn].forEach((btn) => {
      toggleClass(btn, false);
    });
  });
});
