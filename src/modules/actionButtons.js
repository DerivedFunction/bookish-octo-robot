import { toggleButton } from "../app.js";
import { query, getLimit, queryEvents } from "./query.js";
import { setupTooltip } from "./tooltip.js";
import {
  getSearchEngineUrl,
  toggleDropdown,
  selectedEngine,
  getScriptStatus,
} from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js";
import { showToast } from "./toaster.js";
import { resetBtn } from "../app.js";
import { t } from "./locales.js";

export const goBtn = document.getElementById("go");
const historyBtn = document.getElementById("history-button");
historyBtn.addEventListener("click", async () => {
  const { lastQuery } = await chrome.storage.local.get("lastQuery");
  query.value = lastQuery || query.value || "";
  queryEvents();
});
goBtn.addEventListener("click", async () => {
  let hasPerm = await getScriptStatus();
  let hostname = getSearchEngineUrl();
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
  chrome.storage.local.set({ lastQuery: query.value });
  let url = `${selectedEngine.url}${encodeURIComponent(query.value)}`;
  if (hasPerm) {
    // Not an experimental one
    if (!selectedEngine.experimental) {
      window.location.href = url;
      return;
    } else {
      // Kill off any listening processes
      await chrome.storage.local.set({
        [`${selectedEngine.name}Kill`]: true,
      });
      // Run experimental content scripts
      await chrome.storage.local.set({
        query: query.value,
        time: Date.now(),
        [selectedEngine.name]: true,
      });
      window.location.href = hostname;
      return;
    }
  } else {
    if (selectedEngine.experimental) {
      // the current engine requires content scripts, but we have not enabled it
      if (selectedEngine.needsPerm) {
        showToast(`${selectedEngine.name} ${t("no_perm")}`);
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
  appendSvg(
    {
      image: "assets/images/buttons/history.svg",
    },
    historyBtn
  );
  extras.style.display = "none";
  [ellipse, historyBtn].forEach((btn) => {
    setupTooltip(btn);
  });
  setupTooltip(goBtn, () => query.value.length === 0);
  resetBtn.addEventListener("click", async () => {
    extras.style.display = "none";
  });
});
