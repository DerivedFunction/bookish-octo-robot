import { toggleClass, resetBtn } from "../app.js";
import { ellipse } from "./actionButtons.js";
import { appendSvg } from "./appendSvg.js";

const webBtn = document.getElementById("web-search");
const deepBtn = document.getElementById("deep-search");
const codeBtn = document.getElementById("code-canvas");
let set = { web: false, deep: false, code: false };
function toggleSetting(key, btn) {
  chrome.storage.local.get([key], (result) => {
    const oldValue = result[key] === true;
    if (oldValue) {
      chrome.storage.local.remove(key);
      set[key] = false;
      btn.classList.remove("use");
    } else {
      chrome.storage.local.set({ [key]: true });
      set[key] = true;
      btn.classList.add("use");
    }
    toggleClass(btn, !oldValue, "use");
    checkStatus();
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
function checkStatus() {
  toggleClass(
    ellipse,
    !Object.values(set).every((item) => item === false),
    "use"
  );
}

async function initialize() {
  const keys = ["web", "deep", "code"];
  const result = await new Promise((resolve) =>
    chrome.storage.local.get(keys, resolve)
  );
  toggleClass(webBtn, result.web, "use");
  toggleClass(deepBtn, result.deep, "use");
  toggleClass(codeBtn, result.code, "use");
  set.web = result.web;
  set.deep = result.deep;
  set.code = result.code;
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
  resetBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove(["web", "code", "deep"]);
    [ellipse, webBtn, codeBtn, deepBtn].forEach((btn) => {
      toggleClass(btn, false, "use");
    });
  });
});
