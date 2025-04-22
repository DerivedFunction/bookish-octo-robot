import { toggleButton } from "../app.js";
import { query, getLimit } from "./query.js";
import { setupTooltip } from "./tooltip.js";
import {
  getSearchEngineUrlHostName,
  toggleDropdown,
  selectedEngine,
  getScriptStatus,
} from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js";
import { showToast } from "./toaster.js";
import { resetBtn } from "../app.js";

export const goBtn = document.getElementById("go");
goBtn.addEventListener("click", async () => {
  let hasPerm = await getScriptStatus();
  let hostname = getSearchEngineUrlHostName();
  if (!selectedEngine) {
    toggleDropdown();
    return;
  }
  if (query.value.length < 1) {
    toggleButton(goBtn, false);
    return;
  }
  if (query.value.length > getLimit()) {
    toggleButton(goBtn, false);
    return;
  }

  let url = `${selectedEngine.url}${encodeURIComponent(query.value)}`;
  if (hasPerm) {
    // Not an experimental one
    if (!selectedEngine.experimental) {
      window.location.href = url;
      return;
    } else {
      await chrome.storage.local.set({ [selectedEngine.name]: true });
      // Run experimental content scripts
      await chrome.storage.local.set({ query: query.value });
      await chrome.storage.local.set({ time: Date.now() });
      window.location.href = hostname;
      return;
    }
  } else {
    if (selectedEngine.experimental) {
      // the current engine requires content scripts, but we have not enabled it
      if (selectedEngine.needsPerm) {
        showToast(`${selectedEngine.name} may not work without permissions`);
        toggleButton(goBtn, false);
      } else {
        // we don't need content scripts because needPerm says it doesn't need it
        window.location.href = url;
      }
      return;
    } else {
      // We don't need content scripts
      window.location.href = url;
    }
  }
});
export const ellipse = document.getElementById("ellipse");
export const extras = document.getElementById("extra-stuff");
ellipse.addEventListener("click", () => {
  if (
    extras.style.display === "none" ||
    getComputedStyle(extras).display === "none"
  ) {
    extras.style.display = ""; // or whatever display value you want
  } else {
    extras.style.display = "none";
  }
});
document.addEventListener("DOMContentLoaded", () => {
  appendSvg({ image: "assets/images/buttons/go.svg" }, goBtn);
  appendSvg({ image: "assets/images/buttons/ellipse.svg" }, ellipse);
  extras.style.display = "none";
  [ellipse].forEach((btn) => {
    setupTooltip(btn);
  });
  setupTooltip(goBtn, () => query.value.length === 0);
  resetBtn.addEventListener("click", async () => {
    extras.style.display = "none";
  });
});
