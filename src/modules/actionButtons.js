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
      alert(
        "Permission to access clipboard is denied. Please enable it in your browser settings."
      );
      return;
    }
    query.focus();
    const text = await navigator.clipboard.readText();
    query.value += text;
  } catch (err) {
    console.error("Failed to read clipboard contents: ", err);
    alert("Unable to access clipboard. Please grant permission and try again.");
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

  if (query.value.length > 0 && query.value.length < MAX_LIMIT) {
    let url = new URL(`${x}${encodeURIComponent(query.value)}`);
    if (y) {
      // Not an experimental one
      if (!z) {
        window.location.href = url;
        return;
      } else {
        // Run experimental content scripts
        console.log("Experimental features enabled. Going to experimental AI");
        await chrome.storage.local.set({ query: query.value });
        window.location.href = new URL(x);
        return;
      }
    } else {
      if (z) {
        // the current engine requires content scripts, but we have not enabled it
        alert("Enable experimental features to use this");
        toggleButton(goBtn, false);
        return;
      } else {
        // We don't need content scripts
        window.location.href = url;
      }
    }
  }
  toggleButton(goBtn, false);
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
});
