import { loadJsonData } from "../app.js";
import { appendSvg } from "./appendSvg.js";
import { setupTooltip } from "./tooltip.js";
import { showToast } from "./toaster.js";
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
      dropdown.classList.remove("active");
      break;
    case "open":
      dropdown.classList.add("active");
      break;
    default:
      dropdown.classList.toggle("active");
  }
  if (dropdown.classList.contains("active")) {
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
    appendSvg(engine, container, "4px", false);

    // Add text
    const text = document.createElement("span");
    text.textContent = engine.name;

    container.appendChild(text);
    listItem.appendChild(container);

    listItem.addEventListener("click", async () => {
      await chrome.storage.local.set({ engine: engine });
      await getSearchEngine(); // Update the button icon immediately
      dropdown.classList.remove("active");
      appendSvg(
        { image: "assets/images/buttons/down.svg" },
        searchEnginePickerBtn
      );
      await chrome.runtime.sendMessage({
        // Send a message to the background script to update the contextMenu
        message: "selectedSearchEngine",
        engine: engine,
      });
    });

    fragment.appendChild(listItem);
  });
  list.replaceChildren(fragment);
  await getSearchEngine();
}
setupTooltip(
  searchEnginePickerBtn,
  () => !dropdown.classList.contains("active")
);

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
      curSearchBtn
    );
    gemSection.style.display = "none";
    if (selectedEngine) {
      const iconUrl = selectedEngine.image;
      await chrome.action.setIcon({ path: iconUrl });
      try {
        browser.sidebarAction.setIcon({ path: iconUrl });
      } catch (error) {}
      if (selectedEngine.experimental) gemSection.style.display = "";
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
let hasScripts = false;
const gemSection = document.getElementById("remove-script");
setupTooltip(gemSection, () => true, "Toggle Permissions");
const scriptConfigs = {
  Gemini: {
    matches: ["*://gemini.google.com/*"],
    js: ["/scripts/gemini.js"],
  },
  DeepSeek: {
    matches: ["*://chat.deepseek.com/*"],
    js: ["/scripts/deepseek.js"],
  },
  ChatGPT: {
    matches: ["*://*.chatgpt.com/*"],
    js: ["/scripts/chatgpt.js"],
  },
  Grok: {
    matches: ["*://*.grok.com/*"],
    js: ["/scripts/grok.js"],
  },
  Copilot: {
    matches: ["*://copilot.microsoft.com/*"],
    js: ["/scripts/copilot.js"],
  },
  Claude: {
    matches: ["*://*.claude.ai/*"],
    js: ["/scripts/claude.js"],
  },
  Perplexity: {
    matches: ["*://*.perplexity.ai/*"],
    js: ["/scripts/perplexity.js"],
  },
  Mistral: {
    matches: ["*://chat.mistral.ai/*"],
    js: ["/scripts/mistral.js"],
  },
  Meta: { matches: ["*://*.meta.ai/*"], js: ["/scripts/meta.js"] },
  HuggingFace: {
    matches: ["*://huggingface.co/chat/*"],
    js: ["/scripts/hug.js"],
  },
};
const permissionsConfig = {
  Gemini: {
    permissions: ["scripting"],
    origins: ["*://gemini.google.com/*"],
  },
  DeepSeek: {
    permissions: ["scripting"],
    origins: ["*://chat.deepseek.com/*"],
  },
  ChatGPT: {
    permissions: ["scripting"],
    origins: ["*://*.chatgpt.com/*"],
  },
  Grok: {
    permissions: ["scripting"],
    origins: ["*://*.grok.com/*"],
  },
  Copilot: {
    permissions: ["scripting"],
    origins: ["*://copilot.microsoft.com/*"],
  },
  Claude: {
    permissions: ["scripting"],
    origins: ["*://*.claude.ai/*"],
  },
  Perplexity: {
    permissions: ["scripting"],
    origins: ["*://*.perplexity.ai/*"],
  },
  Mistral: {
    permissions: ["scripting"],
    origins: ["*://chat.mistral.ai/*"],
  },
  Meta: {
    permissions: ["scripting"],
    origins: ["*://*.meta.ai/*"],
  },
  HuggingFace: {
    permissions: ["scripting"],
    origins: ["*://*.huggingface.co/chat/*"],
  },
};
async function registerScriptForEngine(name) {
  if (!scriptConfigs[name]) return;
  await chrome.scripting.registerContentScripts([
    {
      id: name,
      ...scriptConfigs[name],
      runAt: "document_end",
      allFrames: true,
    },
  ]);
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
    showToast(`Enable Permissions to search with ${name}`, "warning");
  }
  await getPermissionStatus();
}
async function getPermissionStatus() {
  hasPermissions = await chrome.permissions.contains(PERMISSIONS);
  await getSearchEngine();
  let name = getSearchEngineName();
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    hasScripts = name
      ? scripts.some((script) => script.id === name)
      : scripts.length > 0;
  } catch {
    // Since we don't have scripting permissions
    hasScripts = false;
  }
  console.log(
    `${name} permission status: ${hasPermissions}, script: ${hasScripts}`
  );
  let img = `assets/images/buttons/${
    hasScripts ? "unlocked.svg" : "locked.svg"
  }`;
  appendSvg(
    {
      image: img,
    },
    gemSection
  );
  // Add animation class based on state
  if (hasScripts) {
    gemSection.classList.add("unlocked");
    gemSection.classList.remove("locked");
  } else {
    gemSection.classList.add("locked");
    gemSection.classList.remove("unlocked");
  }
  chrome.storage.local.set({ Experimental: hasPermissions && hasScripts });
  return hasPermissions;
}

async function removePermissions(all = false) {
  const name = getSearchEngineName();
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
    console.error("Error in removePermissions:", error);
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
  await getPermissionStatus();
}

document.addEventListener("DOMContentLoaded", async () => {
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
    await getPermissionStatus();
    const path = window.location.href.split("/").pop();
    if (path === "sidebar.html") {
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
    });
    gemSection.addEventListener("click", async () => {
      if (!hasScripts || !hasPermissions) await getPermissions(selectedEngine);
      else await removePermissions();
    });
    document.getElementById("reset").addEventListener("click", async () => {
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
  if (q && q.trim().length > 0) {
    // We enabled content scripts
    let enabled = await checkEnabled();
    if (enabled) {
      // Content scripts supports this experimental feature
      if (isSearchEngineExp()) {
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
        showToast("Enable Experimental Features", "danger");
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
