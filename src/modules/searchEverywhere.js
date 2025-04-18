import { getSearchEngineList } from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js"; // <- Import from appendSvg.js
import { resetBtn, toggleClass, hostnameToURL } from "../app.js";
import { query, queryEvents } from "./query.js";
import { showToast } from "./toaster.js";
import { greetingContainer } from "./greetings.js";
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
      image: engine.image,
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

export async function appendList() {
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

export const multiBtn = document.getElementById("multi-go");
let newClick = true;
multiBtn.addEventListener("click", async () => {
  const queryText = query.value;

  if (queryText.length < 1) {
    return;
  }
  const storedID = localStorage.getItem("multi-mode");
  if (storedID !== curMultID) {
    showToast("New Tab opened. This session expired");
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
  let keep = false;
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
        if (newClick) {
          // First time clicking the button
          await chrome.tabs.create({
            url: hostnameToURL(new URL(engine.url).hostname),
          });
        }
      }
    } else {
      if (engine.experimental) {
        if (engine.needsPerm) {
          showToast(`${engine.name} may not work without permissions`);
          keep = true;
        } else {
          await chrome.tabs.create({ url });
        }
      } else {
        await chrome.tabs.create({ url });
      }
    }
  }

  query.value = keep ? queryText : "";
  queryEvents();
  if (newClick) {
    alert(
      "Active Search Everywhere session started. Click the same button again will not open new tabs. Opening a new Tab will invalidate this session"
    );
    responseContainer.style.display = "block";
    greetingContainer.style.display = "none";
    newClick = false;
    responseBtn.style.display = "";
  }
  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("chat-response");
  messageWrapper.classList.add("input");
  messageWrapper.textContent = queryText;
  responseContainer.appendChild(messageWrapper);
});
const responseContainer = document.getElementById("response-container");
const responseBtn = document.getElementById("response");
responseBtn.addEventListener("click", async () => {
  const activeEngines = getSearchEverywhere();
  Object.keys(activeEngines).forEach(async (engine) => {
    const engineLast = engine + "Last";
    await chrome.storage.local.set({ [engineLast]: true });
  });
});
const curMultID = Date.now().toString();
document.addEventListener("DOMContentLoaded", async () => {
  multiBtn.style.display = "none";
  responseBtn.style.display = "";
  localStorage.setItem("multi-mode", curMultID);
  appendSvg(
    {
      image: "assets/images/buttons/response.svg",
      description: "Get response data",
    },
    responseBtn
  );
  appendSvg(
    {
      image: "assets/images/buttons/multi.svg",
      description: "Search Everywhere",
    },
    multiBtn
  );
  await appendList();
  resetBtn.addEventListener("click", async () => {
    localStorage.removeItem(SEARCH_ENGINE_STORAGE_KEY);
    await appendList();
  });
  chrome.runtime.onMessage.addListener((e) => {
    if (e.content) {
      const messageWrapper = document.createElement("div");
      messageWrapper.classList.add("chat-response");

      // Create a DOMParser to parse the content string
      const parser = new DOMParser();
      const doc = parser.parseFromString(e.content, "text/html");

      // Extract the parsed HTML (e.g., <p>...</p>)
      const parsedElement = doc.body.firstChild;

      // Check if the parsed element has text content
      if (parsedElement && parsedElement.textContent.trim()) {
        // If it has text, append it
        messageWrapper.appendChild(parsedElement);
      }

      // Only append to the response container if there is a valid element
      if (messageWrapper.hasChildNodes()) {
        responseContainer.appendChild(messageWrapper);
      }
    }
  });
});
