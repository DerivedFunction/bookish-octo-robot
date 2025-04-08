import { loadJsonData } from "../app.js";
import { appendSvg } from "./appendSvg.js";
import { setupTooltip } from "./tooltip.js";
export const curSearchBtn = document.getElementById("currentEngine");
const dropdown = document.getElementById("search-engine-dropdown");
export const searchEnginePickerBtn = document.getElementById(
  "search-engine-picker"
);

searchEnginePickerBtn.addEventListener("click", () => {
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
});
curSearchBtn.addEventListener("click", async () => {
  window.location.href = await getSearchEngineUrl();
});
document.addEventListener("click", (e) => {
  if (
    !searchEnginePickerBtn.contains(e.target) &&
    !dropdown.contains(e.target)
  ) {
    dropdown.classList.remove("active");
  }
});
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
      localStorage.setItem("selectedSearchEngine", JSON.stringify(engine));
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
}
setupTooltip(
  searchEnginePickerBtn,
  () => !dropdown.classList.contains("active")
);
export async function getSearchEngineUrl() {
  let engine = JSON.parse(localStorage.getItem("selectedSearchEngine"));
  if (!engine) {
    engine = await getSearchEngine();
  }
  return engine.url;
}
export async function getSearchEngineName() {
  let engine = JSON.parse(localStorage.getItem("selectedSearchEngine"));
  if (!engine) {
    engine = await getSearchEngine();
  }
  console.log(engine.name);
  return engine.name;
}
export async function getSearchEngineList() {
  const { aiList: loadedList } = await loadJsonData("ai");
  return loadedList;
}
export async function getSearchEngine() {
  try {
    let selectedEngine = localStorage.getItem("selectedSearchEngine");

    if (!selectedEngine) {
      const engines = await getSearchEngineList();
      if (engines.length === 0) throw new Error("No search engines available");

      selectedEngine = JSON.stringify(engines[0]);
      localStorage.setItem("selectedSearchEngine", selectedEngine);
    }

    const engineData = JSON.parse(selectedEngine);
    appendSvg(
      {
        image: engineData.image,
        description: `Search with ${engineData.name}`,
      },
      curSearchBtn
    );
    if (engineData.image) {
      const iconUrl = engineData.image;
      chrome.action.setIcon({ path: iconUrl });
      try {
        if (browser && browser.sidebarAction)
          browser.sidebarAction.setIcon({ path: iconUrl });
      } catch (error) {}
    }
    return engineData;
  } catch (error) {
    console.error("Error setting up search engine:", error);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/down.svg" }, searchEnginePickerBtn);
  await addSearchEngines();
  await getSearchEngine();
  let x = await getSearchEngineUrl();
  let y = window.location.href.split("/").pop();
  console.log(y);
  if (y === "sidebar.html") {
    console.log("Sidebar opened, listening for queries");
    goToLink(x);
    window.addEventListener("storage", async (e) => {
      if (e.key === "query") {
        goToLink(x);
      }
    });
  }
  document.getElementById("reset").addEventListener("click", async () => {
    localStorage.removeItem("currentEngine");
    await addSearchEngines();
    await getSearchEngine();
  });
});

function goToLink(x) {
  let q = localStorage.getItem("query");
  if (q) {
    localStorage.removeItem("query");
    let url = `${x}${encodeURIComponent(q)}`;
    console.log(`Query found. Going to ${url}`);
    window.location.href = url;
  }
}
