import { loadJsonData } from "../app.js";
import { appendSvg } from "./appendSvg.js";
import { setupTooltip } from "./tooltip.js";
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
  } else window.location.href = getSearchEngineUrl();
});

export function toggleDropdown() {
  dropdown.classList.toggle("active");
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
export function getSearchEngineName() {
  if (selectedSearchEngine) selectedSearchEngine.name;
  else return null;
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

document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/down.svg" }, searchEnginePickerBtn);
  await addSearchEngines();
  let y = window.location.href.split("/").pop();
  if (y === "sidebar.html") {
    console.log("Sidebar opened, listening for queries");
    goToLink();
    chrome.storage.onChanged.addListener(async function (changes) {
      for (var key in changes) {
        if (key === "query") {
          goToLink();
        }
      }
    });
  }
  chrome.runtime.onMessage.addListener(async (e) => {
    if (e.message && e.message === "selectedSearchEngine") {
      await getSearchEngine();
    }
  });
  document.getElementById("reset").addEventListener("click", async () => {
    await chrome.storage.local.remove("engine");
    selectedSearchEngine = null;
    await addSearchEngines();
    await chrome.action.setIcon({ path: "/assets/images/icon.svg" });
    try {
      browser.sidebarAction.setIcon({ path: "/assets/images/icon.svg" });
    } catch (error) {}
  });
});

async function goToLink() {
  let x = getSearchEngineUrl();
  let q = await chrome.storage.local.get("query");
  if (q["query"] && q["query"].trim().length > 0) {
    chrome.storage.local.remove("query");
    let url = `${x}${encodeURIComponent(q["query"].trim())}`;
    console.log(`Query found. Going to ${url}`);
    window.location.href = url;
  }
}
