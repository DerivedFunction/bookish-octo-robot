import { getSearchEngineList } from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js"; // <- Import from appendSvg.js
import { resetBtn, toggleClass } from "../app.js";
const SEARCH_ENGINE_STORAGE_KEY = "search-everywhere";
const searchEverywhereList = document.getElementById("search-everywhere-list");

export function getSearchEverywhere() {
  const storedEngines = localStorage.getItem(SEARCH_ENGINE_STORAGE_KEY);
  return storedEngines ? JSON.parse(storedEngines) : {};
}

function saveSearchEverywhere(engines) {
  localStorage.setItem(SEARCH_ENGINE_STORAGE_KEY, JSON.stringify(engines));
}

function createToggleButton(engine, isActive, onClick) {
  const button = document.createElement("button");
  toggleClass(button, isActive);
  appendSvg(
    {
      image: engine.image || `/assets/images/ai/${engine.name}.svg`,
      description: engine.name,
    },
    button,
    null,
    true,
    true
  );

  button.addEventListener("click", () => onClick(button));
  return button;
}

async function appendList() {
  const searchEngines = await getSearchEngineList();
  const selectedEngines = getSearchEverywhere();

  const fragment = document.createDocumentFragment();

  searchEngines.forEach((engine) => {
    const isActive = selectedEngines[engine.name] ?? false;

    const button = createToggleButton(engine, isActive, (btn) => {
      const currentState = btn.classList.contains("active");
      const updatedState = !currentState;
      toggleClass(btn, updatedState);
      selectedEngines[engine.name] = updatedState;
      saveSearchEverywhere(selectedEngines);
    });

    fragment.appendChild(button);
  });

  searchEverywhereList.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", async () => {
  await appendList();
  resetBtn.addEventListener("click", async () => {
    localStorage.removeItem(SEARCH_ENGINE_STORAGE_KEY);
    await appendList();
  });
});
