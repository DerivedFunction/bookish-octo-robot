import { getSearchEngineList } from "./searchEngine.js";

const SEARCH_ENGINE_STORAGE_KEY = "search-everywhere";
const searchEverywhereList = document.getElementById("search-everywhere-list");

// Function to get selected search engines from local storage
export function getSearchEverywhere() {
  const storedEngines = localStorage.getItem(SEARCH_ENGINE_STORAGE_KEY);
  return storedEngines ? JSON.parse(storedEngines) : {};
}

// Function to save selected search engines to local storage
function saveSearchEverywhere(engines) {
  localStorage.setItem(SEARCH_ENGINE_STORAGE_KEY, JSON.stringify(engines));
}

async function appendList() {
  const searchEngines = await getSearchEngineList();
  const storedSelectedEngines = getSearchEverywhere(); // Get initial state from storage

  const fragment = document.createDocumentFragment();

  searchEngines.forEach((engine) => {
    // Create a new checkbox element
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.id = engine.name; // Use the engine name as the ID
    checkbox.value = engine.name; // Store the engine name as the value
    checkbox.checked = storedSelectedEngines.hasOwnProperty(engine.name)
      ? storedSelectedEngines[engine.name]
      : false;

    // Create a label for the checkbox
    const label = document.createElement("label");
    label.htmlFor = checkbox.id;
    label.textContent = engine.name;

    const br = document.createElement("br");

    fragment.appendChild(checkbox);
    fragment.appendChild(label);
    fragment.appendChild(br);

    // Add event listener to handle checkbox changes
    checkbox.addEventListener("change", (event) => {
      const engineName = event.target.value;
      const isChecked = event.target.checked;
      const selectedEngines = getSearchEverywhere();

      selectedEngines[engineName] = isChecked;
      saveSearchEverywhere(selectedEngines);
    });
  });

  // Append the new fragment to the list
  searchEverywhereList.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", async () => {
  await appendList();
  document.getElementById("reset").addEventListener("click", async () => {
    localStorage.removeItem(SEARCH_ENGINE_STORAGE_KEY);
    await appendList();
  });
});
chrome.runtime.onMessage.addListener();
