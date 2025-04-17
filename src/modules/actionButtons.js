import { toggleButton } from "../app.js";
import { query, queryEvents, getLimit } from "./query.js";
import { setupTooltip } from "./tooltip.js";
import {
  checkEnabled,
  getSearchEngineList,
  getSearchEngineUrlHostName,
  toggleDropdown,
  selectedEngine,
} from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js";
import { showToast } from "./toaster.js";
import { hostnameToURL, resetBtn } from "../app.js";
import { getSearchEverywhere } from "./searchEverywhere.js";
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
      return;
    }
    query.focus();
    const text = await navigator.clipboard.readText();
    query.value += text;
    await queryEvents();
  } catch (err) {
    showToast("Unable to access clipboard.");
  }
});
export const goBtn = document.getElementById("go");
goBtn.addEventListener("click", async () => {
  let hasPerm = await checkEnabled();
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
export const multiBtn = document.getElementById("multi-go");
multiBtn.addEventListener("click", async () => {
  const queryText = query.value;

  if (queryText.length < 1) {
    toggleButton(goBtn, false);
    return;
  }

  const searchEngines = await getSearchEngineList();
  const searchEverywhere = getSearchEverywhere();
  if (
    !searchEverywhere ||
    Object.keys(searchEverywhere).length === 0 ||
    Object.values(searchEverywhere).every((value) => !value)
  ) {
    showToast("Search Everywhere has none selected. See Options");
    return;
  }
  const permissions = [];

  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    scripts.forEach((script) => permissions.push(script.id));
  } catch {
    console.log("Scripting is not enabled.");
  }

  for (const engine of searchEngines) {
    if (!searchEverywhere[engine.name]) continue;
    if (queryText.length > engine.limit) {
      showToast(`Query exceeds character count for ${engine.name}`);
      continue;
    }

    // Only collect for experimental engines with scripts enabled
    if (engine.experimental && permissions.includes(engine.name)) {
      // set a unique key with a value
      await chrome.storage.local.set({ [engine.name]: true });
    }
  }

  // Only store if there’s something to store
  if (permissions.length > 0) {
    await chrome.storage.local.set({ query: queryText });
  }

  for (const engine of searchEngines) {
    if (queryText.length > engine.limit) continue;
    if (!searchEverywhere[engine.name]) continue;
    const url = `${engine.url}${encodeURIComponent(queryText)}`;
    const hasPermission = permissions.includes(engine.name);
    if (hasPermission) {
      if (!engine.experimental) {
        await chrome.tabs.create({ url });
      } else {
        // hostnameToURL should resolve to engine homepage (for content script injection)
        await chrome.tabs.create({
          url: hostnameToURL(new URL(engine.url).hostname),
        });
      }
    } else {
      if (engine.experimental) {
        if (engine.needsPerm) {
          showToast(`${engine.name} may not work without permissions`);
        } else {
          await chrome.tabs.create({ url });
        }
      } else {
        await chrome.tabs.create({ url });
      }
    }
  }
  query.value = "";
  await queryEvents();
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
  appendSvg({ image: "assets/images/buttons/clear.svg" }, clearBtn);
  appendSvg({ image: "assets/images/buttons/paste.svg" }, pasteBtn);
  appendSvg({ image: "assets/images/buttons/multi.svg" }, multiBtn);
  appendSvg({ image: "assets/images/buttons/ellipse.svg" }, ellipse);
  extras.style.display = "none";
  [clearBtn, pasteBtn, multiBtn, ellipse].forEach((btn) => {
    setupTooltip(btn);
  });
  setupTooltip(goBtn, () => query.value.length === 0);
  multiBtn.style.display = "none";
  resetBtn.addEventListener("click", async () => {
    await chrome.permissions.remove({ permissions: ["clipboardRead"] });
    extras.style.display = "none";
  });
});
