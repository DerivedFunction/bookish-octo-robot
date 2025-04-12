import { loadJsonData } from "../app.js";
import { appendSvg } from "./appendSvg.js";
import { setupTooltip } from "./tooltip.js";
import { showToast } from "./toaster.js";
export const curSearchBtn = document.getElementById("currentEngine");
const dropdown = document.getElementById("search-engine-dropdown");

export const searchEnginePickerBtn = document.getElementById(
  "search-engine-picker"
);
export let selectedSearchEngine = null;

searchEnginePickerBtn.addEventListener("click", () => {
  toggleDropdown();
});
curSearchBtn.addEventListener("click", async () => {
  if (!selectedSearchEngine) {
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
      listItem.addEventListener("click", async () => {
        await chrome.permissions.request(PERMISSIONS, async (granted) => {
          if (granted) {
            try {
              await chrome.scripting.registerContentScripts([
                {
                  id: "gemini",
                  matches: ["*://gemini.google.com/*"],
                  js: ["/scripts/gemini.js"],
                  runAt: "document_end",
                  allFrames: true,
                },
              ]);
            } catch (error) {}
          } else {
            showToast("Enable permissions to use Gemini", "warning");
          }
          await getPermissionStatus();
        });
      });
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
      await chrome.runtime.sendMessage({
        // Send a message to the background script to update the contextMenu
        message: "selectedSearchEngine",
        engine: engine,
      });

      await getSearchEngine(); // Update the button icon immediately
      dropdown.classList.remove("active");
      appendSvg(
        { image: "assets/images/buttons/down.svg" },
        searchEnginePickerBtn
      );
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
  if (selectedSearchEngine) return selectedSearchEngine.url;
  else return null;
}
export function getSearchEngineUrlHostName() {
  if (selectedSearchEngine) {
    function hostnameToURL(hostname) {
      // the inital value of the URL object can be anything
      const url = new URL("https://example.com");
      url.hostname = hostname;
      return url.href;
    }
    let url = hostnameToURL(new URL(selectedSearchEngine.url).hostname);
    if (url.includes("huggingface")) url += "chat";
    return url;
  } else return null;
}
export function getSearchEngineName() {
  if (selectedSearchEngine) return selectedSearchEngine.name;
  else return null;
}
// true (needs content scripts), false (doesn't need it), or null (no content scripts at all)
export function isSearchEngineExp() {
  if (selectedSearchEngine) return selectedSearchEngine.experimental;
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
    let selectedEngine;
    let x = await chrome.storage.local.get("engine");
    if (!x) {
      const engines = await getSearchEngineList();
      if (engines.length === 0) throw new Error("No search engines available");

      selectedEngine = engines[0];
      await chrome.storage.local.set({ engine: selectedEngine });
      x = await chrome.storage.local.get("engine");
      selectedEngine = x["engine"];
    } else {
      selectedEngine = x["engine"];
    }
    const engineData = selectedEngine;
    appendSvg(
      {
        image: engineData ? engineData.image : "/assets/images/ai/default.svg",
        description: engineData
          ? `Search with ${engineData.name}`
          : "Set an AI Chatbot",
      },
      curSearchBtn
    );

    if (engineData) {
      const iconUrl = engineData.image;
      await chrome.action.setIcon({ path: iconUrl });
      try {
        browser.sidebarAction.setIcon({ path: iconUrl });
      } catch (error) {}

      selectedSearchEngine = engineData;
    }
  } catch (error) {
    console.error("Error setting up search engine:", error);
    selectedSearchEngine = null;
  }
}

const PERMISSIONS = {
  permissions: ["scripting"],
  origins: ["*://gemini.google.com/"],
};

let hasPermissions = false;
let hasScripts = false;
const gemSection = document.getElementById("Gemini-script");
async function getPermissionStatus() {
  hasPermissions = await chrome.permissions.contains(PERMISSIONS);
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    hasScripts = scripts.some((script) => script.id === "gemini");
  } catch {
    // Since we don't have scripting permissions
    hasScripts = false;
  }
  console.log(
    `Gemini permission status: ${hasPermissions}, script: ${hasScripts}`
  );
  if (hasPermissions || hasScripts) gemSection.style.display = "";
  else gemSection.style.display = "none";
  chrome.storage.local.set({ Experimental: hasPermissions && hasScripts });
  return hasPermissions;
}

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await getPermissionStatus();

    try {
      appendSvg(
        { image: "assets/images/buttons/down.svg" },
        searchEnginePickerBtn
      );
      appendSvg(
        { image: "assets/images/buttons/clear.svg" },
        document.getElementById("remove-script")
      );
    } catch (error) {
      console.error("Error appending SVG:", error);
    }

    try {
      await addSearchEngines();
    } catch (error) {
      console.error("Error adding search engines:", error);
    }

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
    document
      .getElementById("remove-script")
      .addEventListener("click", async () => {
        await removePermissions();
        await getPermissionStatus();
      });
    document.getElementById("reset").addEventListener("click", async () => {
      try {
        await chrome.storage.local.remove("engine");
        selectedSearchEngine = null;

        await removePermissions();

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

async function removePermissions() {
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    if (scripts.some((script) => script.id === "gemini")) {
      await chrome.scripting.unregisterContentScripts({ ids: ["gemini"] });
      console.log("Removing scripts");
    }
  } catch {}
  try {
    await chrome.permissions.remove(PERMISSIONS);
  } catch {}
}

async function goToLink() {
  let x = getSearchEngineUrl();
  let { query: q } = await chrome.storage.local.get("query");
  if (q && q.trim().length > 0) {
    // We enabled content scripts
    let enabled = await checkEnabled();
    if (enabled) {
      // Content scripts supports this experimental feature
      if (isSearchEngineExp()) {
        window.location.href = x;
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
    let url = `${x}${encodeURIComponent(q.trim())}`;
    console.log(`Query found. Going to ${url}`);
    window.location.href = url;
  }
}
