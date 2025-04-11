import { readText, toggleButton } from "../app.js";
import { query, queryEvents, MAX_LIMIT } from "./query.js";
import { setupTooltip } from "./tooltip.js";
import {
  checkEnabled,
  getSearchEngineUrl,
  isSearchEngineExp,
  toggleDropdown,
} from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js";
import { showToast } from "./toaster.js";

export const clearBtn = document.getElementById("clear");
clearBtn.addEventListener("click", async () => {
  if (query.value.length > 0) {
    query.value = "";
    await queryEvents();
  }
  query.focus();
});
export const pasteBtn = document.getElementById("paste");
pasteBtn.addEventListener("click", async () => {
  try {
    const permissionStatus = await chrome.permissions.request({
      permissions: ["clipboardRead"],
    });
    if (!permissionStatus) {
      showToast(
        "Permission to access clipboard is denied. Please enable it in your browser settings.",
        "danger"
      );
      return;
    }
    query.focus();
    const text = await navigator.clipboard.readText();
    query.value += text;
    await queryEvents();
  } catch (err) {
    showToast("Unable to access clipboard.", "warning");
  }
});
export const goBtn = document.getElementById("go");
goBtn.addEventListener("click", async () => {
  let x = getSearchEngineUrl();
  let y = checkEnabled();
  let z = isSearchEngineExp();
  if (!x) {
    toggleDropdown();
    return;
  }
  if (query.value.length < 1) {
    showToast("No input", "warning");
    toggleButton(goBtn, false);
    return;
  }
  if (query.value.length > MAX_LIMIT) {
    showToast(
      "Query exceeds character count. Please go to actual URL",
      "warning"
    );
    toggleButton(goBtn, false);
    return;
  }

  let url = `${x}${encodeURIComponent(query.value)}`;
  if (y) {
    // Not an experimental one
    if (!z) {
      window.location.href = url;
      return;
    } else {
      // Run experimental content scripts
      console.log("Experimental features enabled. Going to experimental AI");
      await chrome.storage.local.set({ query: query.value });
      const [tab] = await chrome.tabs.query({
        active: true,
        lastFocusedWindow: true,
      });
      await chrome.tabs.create({ url: x });
      await chrome.tabs.remove(tab.id);
      return;
    }
  } else {
    if (z) {
      // the current engine requires content scripts, but we have not enabled it
      showToast("Enable Experimental Features", "warning");
      toggleButton(goBtn, false);
      return;
    } else {
      // We don't need content scripts
      window.location.href = url;
    }
  }
});
export const fakeFileBtn = document.getElementById("fake-file-upload");
export const fileUploadInput = document.getElementById("fake-file");
fileUploadInput.addEventListener("change", () => {
  const file = fileUploadInput.files[0];
  if (file) {
    readText(file).then((text) => {
      query.value += `${file.name}:\n${text}`;
      query.focus();
    });
  }
});

document.addEventListener("DOMContentLoaded", () => {
  appendSvg({ image: "assets/images/buttons/go.svg" }, goBtn);
  appendSvg({ image: "assets/images/buttons/clear.svg" }, clearBtn);
  appendSvg({ image: "assets/images/buttons/paste.svg" }, pasteBtn);
  appendSvg({ image: "assets/images/buttons/file.svg" }, fakeFileBtn);
  [clearBtn, pasteBtn, goBtn, fakeFileBtn].forEach((btn) => {
    setupTooltip(btn, () => query.value.length === 0);
  });
  document.getElementById("reset").addEventListener("click", async () => {
    await chrome.permissions.remove({ permissions: ["clipboardRead"] });
  });
});
