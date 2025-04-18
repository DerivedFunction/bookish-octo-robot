import { appendSvg } from "./appendSvg.js";
import { setupTooltip } from "./tooltip.js";
import { showToast } from "./toaster.js";
import { resetBtn, loadJsonData, toggleClass } from "../app.js";
import { query, queryEvents } from "./query.js";
export const curSearchBtn = document.getElementById("currentEngine");
const dropdown = document.getElementById("search-engine-dropdown");

export const searchEnginePickerBtn = document.getElementById(
  "search-engine-picker"
);
export let selectedEngine = null;

searchEnginePickerBtn.addEventListener("click", () => {
  toggleDropdown();
});
curSearchBtn.addEventListener("click", async () => {
  if (!selectedEngine) {
    toggleDropdown();
  } else window.location.href = getSearchEngineUrlHostName();
});

document.addEventListener("click", (e) => {
  if (
    !dropdown.contains(e.target) &&
    !searchEnginePickerBtn.contains(e.target)
  ) {
    toggleDropdown("remove");
  }
});

export function toggleDropdown(remove = "none") {
  switch (remove) {
    case "remove":
      dropdown.classList.remove("open");
      break;
    case "open":
      dropdown.classList.add("open");
      break;
    default:
      dropdown.classList.toggle("open");
  }
  if (dropdown.classList.contains("open")) {
    appendSvg(
      { image: "/assets/images/buttons/up.svg" },
      searchEnginePickerBtn
    );
  } else {
    appendSvg(
      { image: "/assets/images/buttons/down.svg" },
      searchEnginePickerBtn
    );
  }
}

export async function addSearchEngines() {
  let searchEngines = await getSearchEngineList();
  const list = document.getElementById("search-engine-dropdown");
  const fragment = document.createDocumentFragment();
  searchEngines.forEach((engine) => {
    const listItem = document.createElement("li");
    listItem.className = "search-engine-option";
    listItem.setAttribute("data-link", engine.url);
    if (engine.experimental !== undefined) {
      listItem.setAttribute("data-exp", engine.experimental);
    }
    // Create container for icon and text
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "8px";

    // Add inline SVG
    appendSvg(engine, container, "4px", false, true);

    // Add text
    const text = document.createElement("span");
    text.textContent = engine.name;

    container.appendChild(text);
    listItem.appendChild(container);

    listItem.addEventListener("click", async () => {
      await chrome.storage.local.set({ engine: engine });
      await getSearchEngine(); // Update the button icon immediately
      dropdown.classList.remove("open");
      appendSvg(
        { image: "assets/images/buttons/down.svg" },
        searchEnginePickerBtn
      );
      await chrome.runtime.sendMessage({
        // Send a message to the background script to update the contextMenu
        message: "selectedSearchEngine",
        engine: engine,
      });
      await getPermissionStatus();
    });

    fragment.appendChild(listItem);
  });
  list.replaceChildren(fragment);
  await getSearchEngine();
}
setupTooltip(searchEnginePickerBtn, () => !dropdown.classList.contains("open"));

export function getSearchEngineUrl() {
  if (selectedEngine) return selectedEngine.url;
  else return null;
}
export function getSearchEngineUrlHostName() {
  if (selectedEngine) {
    function hostnameToURL(hostname) {
      // the inital value of the URL object can be anything
      const url = new URL("https://example.com");
      url.hostname = hostname;
      return url.href;
    }
    let url = hostnameToURL(new URL(selectedEngine.url).hostname);
    if (url.includes("huggingface")) url += "chat";
    if (url.includes("gemini")) url += "app";
    return url;
  } else return null;
}
export function getSearchEngineName() {
  if (selectedEngine) return selectedEngine.name;
  else return null;
}
// true (needs content scripts), false (doesn't need it), or null (no content scripts at all)
export function isSearchEngineExp() {
  if (selectedEngine) return selectedEngine.experimental;
  else return null;
}
export async function checkEnabled() {
  let { Experimental: x } = await chrome.storage.local.get("Experimental");
  return x;
}
export async function getSearchEngineList() {
  const { aiList: loadedList } = await loadJsonData("ai");
  return loadedList;
}
export async function getSearchEngine() {
  try {
    const { engine } = await chrome.storage.local.get("engine");
    selectedEngine = engine;
    appendSvg(
      {
        image: selectedEngine
          ? selectedEngine.image
          : "/assets/images/ai/default.svg",
        description: selectedEngine
          ? `Search with ${selectedEngine.name}`
          : "Set an AI Chatbot",
      },
      curSearchBtn,
      null,
      true,
      true
    );

    if (selectedEngine) {
      const iconUrl = selectedEngine.image;
      await chrome.action.setIcon({ path: iconUrl });
      try {
        browser.sidebarAction.setIcon({ path: iconUrl });
      } catch (error) {}
    }
  } catch (error) {
    console.error("Error setting up search engine:", error);
    selectedEngine = null;
  }
  return selectedEngine;
}

const PERMISSIONS = {
  permissions: ["scripting"],
};

let hasPermissions = false;
export let hasScripts = false;

let permissionsConfig = null;
let scriptConfigs = null;
async function registerScriptForEngine(name) {
  if (!scriptConfigs[name]) return;
  try {
    await chrome.scripting.registerContentScripts([
      {
        id: name,
        ...scriptConfigs[name],
        runAt: "document_end",
        allFrames: true,
      },
    ]);
  } catch (err) {
    console.log("Scripts already enabled", err);
  }
}
export async function getPermissions(engine) {
  const name = engine.name;
  const perm = permissionsConfig[name];
  if (!perm) return;
  const granted = await chrome.permissions.request(perm);
  if (granted) {
    try {
      await registerScriptForEngine(name);
    } catch (error) {
      console.log("Script registration failed:", error);
    }
  } else {
    if (engine.needsPerm) showToast(`${name} may not work without permissions`);
  }
  await getScriptStatus(engine.name);
}
export async function getPermissionStatus() {
  hasPermissions = await chrome.permissions.contains(PERMISSIONS);
  return hasPermissions;
}
export async function getScriptStatus(name = null) {
  let currentHasScripts = false;
  try {
    // check if we have a matching name. If there is no name, we are using our selected one
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    currentHasScripts = name
      ? scripts.some((script) => script.id === name)
      : scripts.some((script) => script.id === selectedEngine?.name);
    // If the selected one is the name, then update the global variable
    if (selectedEngine?.name === name || !name) hasScripts = currentHasScripts;
  } catch {
    currentHasScripts = false;
    if (selectedEngine?.name === name || !name) hasScripts = currentHasScripts;
  }
  // If there is no name (default to selected), or the name matches our current selected one, then change the look
  if (!name || (selectedEngine && name === selectedEngine.name)) {
    toggleClass(curSearchBtn, hasScripts);
    chrome.runtime.sendMessage({
      message: "Experimental",
      engine: selectedEngine,
      status: hasScripts,
    });
    chrome.storage.local.set({ Experimental: hasScripts });
    queryEvents();
    return hasScripts;
  }
  return currentHasScripts;
}

export async function removePermissions(all = false, engine = null) {
  const name = engine ? engine : getSearchEngineName();
  // Remove the scripts
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    if (all) {
      // Unregister all scripts sequentially to ensure completion
      for (const script of scripts) {
        await chrome.scripting.unregisterContentScripts({ ids: [script.id] });
        console.log(`Unregistered script: ${script.id}`);
      }
    } else if (scripts.some((script) => script.id === name)) {
      await chrome.scripting.unregisterContentScripts({ ids: [name] });
      console.log(`Unregistered script: ${name}`);
    }

    // Check if any scripts remain
    const remainingScripts =
      await chrome.scripting.getRegisteredContentScripts();
    if (remainingScripts.length === 0) {
      await chrome.permissions.remove(PERMISSIONS);
      console.log("Removed permissions:", PERMISSIONS);
    }
  } catch (error) {
    // most likely scripting is undefined
    console.log("Error in removePermissions:", error);
  }
  // We clicked reset button
  try {
    if (all) {
      await chrome.permissions.remove(PERMISSIONS);
      console.log("Removed ALL permissions:", PERMISSIONS);
    }
  } catch (error) {
    console.error("Error in removePermissions:", error);
  }
  await getScriptStatus();
}

document.addEventListener("DOMContentLoaded", async () => {
  const { scripts } = await loadJsonData("scripts");
  permissionsConfig = scripts["permissionsConfig"];
  scriptConfigs = scripts["scriptConfigs"];
  try {
    try {
      appendSvg(
        { image: "assets/images/buttons/down.svg" },
        searchEnginePickerBtn
      );
    } catch (error) {
      console.error("Error appending SVG:", error);
    }

    try {
      await addSearchEngines();
    } catch (error) {
      console.error("Error adding search engines:", error);
    }
    await getScriptStatus();
    const path = window.location.href;
    if (path.includes("sidebar")) {
      console.log("Sidebar opened, listening for queries");
      try {
        await goToLink();
      } catch (error) {
        console.error("Error in goToLink:", error);
      }
      chrome.runtime.onMessage.addListener(async (e) => {
        if (e?.message === "sendQuery") {
          try {
            await goToLink();
          } catch (error) {
            console.error("Error receiving query", error);
          }
        }
      });
    }

    chrome.runtime.onMessage.addListener(async (e) => {
      if (e?.message === "selectedSearchEngine") {
        try {
          await getSearchEngine();
        } catch (error) {
          console.error("Error getting search engine:", error);
        }
      }
      if (e?.message === "Experimental") {
        console.log("recevied");
        toggleClass(curSearchBtn, e.status);
      }
    });
    resetBtn.addEventListener("click", async () => {
      try {
        await chrome.storage.local.remove("engine");
        selectedEngine = null;

        await removePermissions(true);

        try {
          await addSearchEngines();
        } catch (error) {
          console.error("Error adding search engines in reset:", error);
        }

        try {
          await chrome.action.setIcon({ path: "/assets/images/icon.svg" });
        } catch (error) {
          console.error("Error setting action icon:", error);
        }

        try {
          await browser.sidebarAction.setIcon({
            path: "/assets/images/icon.svg",
          });
        } catch (error) {}
      } catch (error) {
        console.error("Reset error:", error);
      }
    });
  } catch (error) {
    console.error("Error during initialization:", error);
    chrome.storage.local.set({ Experimental: false });
  }
});

async function goToLink() {
  let { query: q } = await chrome.storage.local.get("query");
  let name = getSearchEngineName();
  if (q && q.trim().length > 0) {
    // We enabled content scripts
    let enabled = await checkEnabled();
    if (enabled) {
      // Content scripts supports this experimental feature
      if (isSearchEngineExp()) {
        await chrome.storage.local.set({ [selectedEngine.name]: true });
        window.location.href = getSearchEngineUrlHostName();
      } else {
        // Go regularly
        getQueryLink();
      }
    } else {
      //check is not enabled
      if (!isSearchEngineExp()) {
        // Not an experimental one
        getQueryLink();
      } else {
        if (selectedEngine.needsPerm) {
          showToast(`${name} may not work without permissions`);
          query.value = q;
          queryEvents();
        } else {
          getQueryLink();
        }
      }
    }
  }

  async function getQueryLink() {
    await chrome.storage.local.remove("query");
    let url = `${getSearchEngineUrl()}${encodeURIComponent(q.trim())}`;
    console.log(`Query found. Going to ${url}`);
    window.location.href = url;
  }
}
