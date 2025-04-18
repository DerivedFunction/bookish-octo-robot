import {
  curSearchBtn,
  getSearchEngineList,
  searchEnginePickerBtn,
} from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js"; // <- Import from appendSvg.js
import { resetBtn, toggleClass, hostnameToURL } from "../app.js";
import { query, queryEvents } from "./query.js";
import { showToast } from "./toaster.js";
import { greetingContainer } from "./greetings.js";
import { ellipse, goBtn } from "./actionButtons.js";
import { suggestionContainer } from "./suggestions.js";
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
  let { unstable } = await chrome.storage.local.get("unstable");
  if (!unstable) return;
  if (newClick) {
    alert(
      "Active Search Everywhere session started. Click the same button again will not open new tabs. Opening a new Tab will invalidate this session"
    );
    [
      greetingContainer,
      curSearchBtn,
      ellipse,
      suggestionContainer,
      searchEnginePickerBtn,
      goBtn,
    ].forEach((e) => {
      e.style.display = "none";
    });
    newClick = false;
    responseContainer.style.display = "block";
    responseBtn.style.display = "";

    const searchEngines = await getSearchEngineList();
    const selectedEngines = getSearchEverywhere();

    const fragment = document.createDocumentFragment();

    searchEngines.forEach((engine) => {
      const isActive = selectedEngines[engine.name] ?? false;
      if (!isActive) return;
      const button = createToggleButton(engine, isActive, (btn) => {
        const currentState = btn.classList.contains("active");
        const updatedState = !currentState;
        toggleClass(btn, updatedState);
        selectedEngines[engine.name] = updatedState;
        saveSearchEverywhere(selectedEngines);
      });
      fragment.appendChild(button);
    });

    multiTools.appendChild(fragment);
  }
  query.style.maxHeight = "50px";
  const children = Array.from(responseContainer.children);
  children.forEach((child) => {
    if (!child.classList.contains("KEEP")) {
      child.classList.add("KEEP");
    }
  });
  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("chat-response");
  messageWrapper.classList.add("input");
  messageWrapper.textContent = queryText;
  responseContainer.appendChild(messageWrapper);
});
const responseContainer = document.getElementById("response-container");
const responseBtn = document.getElementById("response");
const multiTools = document.getElementById("multi-tools");
responseBtn.addEventListener("click", async () => {
  deleteLastMessage();
  getResponse();
  responseContainer.scrollTo(0, responseContainer.scrollHeight);
});

// Function to delete the last chatbot-messages container without KEEP class
function deleteLastMessage() {
  const children = Array.from(responseContainer.children);
  // Find the last chatbot-messages container without KEEP class
  const lastChatbotMessages = children
    .slice()
    .reverse()
    .find(
      (child) =>
        child.classList.contains("chatbot-messages") &&
        !child.classList.contains("KEEP")
    );

  if (lastChatbotMessages) {
    // Remove the last unprotected chatbot-messages container
    lastChatbotMessages.remove();
  }
}
const curMultID = Date.now().toString();
document.addEventListener("DOMContentLoaded", async () => {
  multiBtn.style.display = "none";
  responseBtn.style.display = "none";
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
  const engines = await getSearchEngineList();
  let { unstable } = await chrome.storage.local.get("unstable");
  // only use this feature if needed
  if (unstable)
    chrome.runtime.onMessage.addListener((e) => {
      if (e.content) {
        const messageWrapper = document.createElement("div");
        messageWrapper.classList.add("chat-response", "chatbot");
        const icon = document.createElement("div");
        const engine = engines.find((ai) => ai.name === e.engine);
        appendSvg(
          {
            image: engine.image,
            description: e.engine,
          },
          icon,
          "5px",
          false,
          true
        );
        messageWrapper.appendChild(icon);
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

        // Only append to the chatbot-messages container if there is a valid element
        if (messageWrapper.hasChildNodes()) {
          // Check if the last child is an unprotected chatbot-messages container
          let chatbotMessages = responseContainer.lastElementChild;
          if (
            !chatbotMessages ||
            !chatbotMessages.classList.contains("chatbot-messages") ||
            chatbotMessages.classList.contains("KEEP")
          ) {
            // Create a new chatbot-messages container (no KEEP class)
            chatbotMessages = document.createElement("div");
            chatbotMessages.classList.add("chatbot-messages");
            responseContainer.appendChild(chatbotMessages);
          }
          chatbotMessages.appendChild(messageWrapper);
          responseContainer.scrollTo(0, responseContainer.scrollHeight); // Scroll to bottom
        }
      }
    });
});
function getResponse() {
  const activeEngines = getSearchEverywhere();
  Object.keys(activeEngines).forEach(async (engine) => {
    const engineLast = engine + "Last";
    await chrome.storage.local.set({ [engineLast]: true });
  });
}
