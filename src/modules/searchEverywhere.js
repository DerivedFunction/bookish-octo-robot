import {
  curSearchBtn,
  getSearchEngineList,
  searchEnginePickerBtn,
} from "./searchEngine.js";
import { appendSvg } from "./appendSvg.js";
import { resetBtn, toggleClass, hostnameToURL } from "../app.js";
import { query, queryEvents } from "./query.js";
import { showToast } from "./toaster.js";
import { greetingContainer } from "./greetings.js";
import { ellipse, goBtn } from "./actionButtons.js";
import { suggestionContainer } from "./suggestions.js";
import { chatBotResponse, responseBox } from "./response.js";
import { hide } from "./advanceSearch.js";
import { fileUploadBtn } from "./files.js";

// Constants
const SEARCH_ENGINE_STORAGE_KEY = "search-everywhere";

// DOM Elements
const searchEverywhereList = document.getElementById("search-everywhere-list");
export const multiBtn = document.getElementById("multi-go");
const sendAgain = document.getElementById("send-again");
const responseContainer = document.getElementById("response-container");
const responseBtn = document.getElementById("response");
const multiTools = document.getElementById("multi-tools");

// State Variables
export let newClick = true;
const curMultID = Date.now().toString();

// --- Helper Functions ---

function getSearchEverywhere() {
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

function deleteLastMessage() {
  const children = Array.from(responseContainer.children);
  const lastChatbotMessages = children
    .slice()
    .reverse()
    .find(
      (child) =>
        child.classList.contains("chatbot-messages") &&
        !child.classList.contains("KEEP")
    );

  if (lastChatbotMessages) {
    lastChatbotMessages.remove();
  }
}

async function handleChatMessage(e, engines) {
  if (e.content) {
    const messageButton = document.createElement("button");
    const engine = engines.find((ai) => ai.name === e.engine);
    appendSvg(
      {
        image: engine.image,
        description: e.engine,
      },
      messageButton,
      "5px",
      false,
      true
    );
    const parser = new DOMParser();
    const doc = parser.parseFromString(e.content, "text/html");
    const parsedElement = document.createElement("div");
    const body = doc.body;
    body.style.whiteSpace = "pre-wrap";
    parsedElement.appendChild(body);
    parsedElement.style.background = "var(--item-bg)";

    messageButton.addEventListener("click", () => {
      responseBox.replaceChildren(parsedElement);
      chatBotResponse.style.display = "block";
    });

    let chatbotMessages = responseContainer.lastElementChild;
    if (
      !chatbotMessages ||
      !chatbotMessages.classList.contains("chatbot-messages") ||
      chatbotMessages.classList.contains("KEEP")
    ) {
      chatbotMessages = document.createElement("div");
      chatbotMessages.classList.add("chatbot-messages");
      chatbotMessages.classList.add("horizontal-container");
      responseContainer.appendChild(chatbotMessages);
    }
    chatbotMessages.appendChild(messageButton);
    responseContainer.scrollTo(0, responseContainer.scrollHeight);
  }
}

// --- Main Functions ---

export async function appendList() {
  const searchEngines = await getSearchEngineList();
  const selectedEngines = getSearchEverywhere();
  const fragment = document.createDocumentFragment();

  searchEngines.forEach((engine) => {
    const isActive = selectedEngines[engine.name] ?? false;
    const button = createToggleButton(engine, isActive, (btn) => {
      const updatedState = !btn.classList.contains("active");
      toggleClass(btn, updatedState);
      selectedEngines[engine.name] = updatedState;
      saveSearchEverywhere(selectedEngines);
    });
    fragment.appendChild(button);
  });

  searchEverywhereList.replaceChildren(fragment);
}

async function handleMultiSearch(textContent, resend = false) {
  const queryText = textContent ?? query.value;
  if (queryText.length < 1) return;
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

    if (engine.experimental && permissions.includes(engine.name)) {
      await chrome.storage.local.set({ [engine.name]: true });
    }
  }

  if (permissions.length > 0) {
    await chrome.storage.local.set({ query: queryText });
    await chrome.storage.local.set({ time: Date.now() });
  }

  let keep = false;
  const active = false;
  for (const engine of searchEngines) {
    if (queryText.length > engine.limit) continue;
    if (!searchEverywhere[engine.name]) continue;
    const url = `${engine.url}${encodeURIComponent(queryText)}`;
    const hasPermission = permissions.includes(engine.name);
    if (hasPermission) {
      if (!engine.experimental) {
        await chrome.tabs.create({ url, active });
      } else {
        if (newClick) {
          await chrome.tabs.create({
            url: hostnameToURL(new URL(engine.url).hostname),
            active,
          });
        }
      }
    } else {
      if (engine.experimental) {
        if (engine.needsPerm) {
          showToast(`${engine.name} may not work without permissions`);
          keep = true;
        } else {
          await chrome.tabs.create({ url, active });
        }
      } else {
        await chrome.tabs.create({ url, active });
      }
    }
  }

  if (!resend) {
    query.value = keep ? queryText : "";
    queryEvents();
  }

  let { unstable } = await chrome.storage.local.get("unstable");
  if (!unstable) return;
  if (resend) return;
  if (newClick) {
    showToast(
      "If permissions are enabled, clicking the same button again will not open new tabs." +
        "Please close all other tabs that are already listening, as it may intercept queries. " +
        "Opening a new tab will invalidate this session." +
        "This is an unstable feature that may/may not work as expected",
      "Active Search Everywhere session started"
    );
    [
      greetingContainer,
      curSearchBtn,
      ellipse,
      suggestionContainer,
      searchEnginePickerBtn,
      goBtn,
      fileUploadBtn,
    ].forEach((e) => {
      e.style.display = "none";
    });
    hide();
    newClick = false;
    responseContainer.style.display = "block";
    responseBtn.style.display = "";
    sendAgain.style.display = "";
    const selectedEngines = getSearchEverywhere();
    const fragment = document.createDocumentFragment();

    searchEngines.forEach((engine) => {
      const isActive = selectedEngines[engine.name] ?? false;
      if (!isActive) return;
      const button = createToggleButton(engine, isActive, (btn) => {
        const updatedState = !btn.classList.contains("active");
        toggleClass(btn, updatedState);
        selectedEngines[engine.name] = updatedState;
        saveSearchEverywhere(selectedEngines);
      });
      fragment.appendChild(button);
    });
    multiTools.appendChild(fragment);
  }
  query.style.maxHeight = "50px";
  Array.from(responseContainer.children).forEach((child) => {
    if (!child.classList.contains("KEEP")) {
      child.classList.add("KEEP");
    }
  });
  const messageWrapper = document.createElement("div");
  messageWrapper.classList.add("chat-response");
  messageWrapper.classList.add("input");
  messageWrapper.textContent = queryText;
  messageWrapper.classList.add("shrink");
  messageWrapper.addEventListener("click", () => {
    messageWrapper.classList.toggle("shrink");
  });
  responseContainer.appendChild(messageWrapper);
  responseContainer.scrollTo(0, responseContainer.scrollHeight);
}

async function handleGetResponse() {
  deleteLastMessage();
  getResponse();
  responseContainer.scrollTo(0, responseContainer.scrollHeight);
}
async function handleSendAgain() {
  // get the text content of the last chat input
  const inputs = document.querySelectorAll(".chat-response.input");
  if (inputs.length === 0) return;
  const lastInput = inputs[inputs.length - 1];
  const queryText = lastInput.textContent;
  if (queryText.length === 0) return;
  await handleMultiSearch(queryText, true);
}

function getResponse() {
  const activeEngines = getSearchEverywhere();
  Object.keys(activeEngines).forEach(async (engine) => {
    const engineLast = engine + "Last";
    if (activeEngines[engine])
      await chrome.storage.local.set({ [engineLast]: true });
  });
}

// --- Event Listeners and Initialization ---

document.addEventListener("DOMContentLoaded", async () => {
  multiBtn.style.display = "none";
  responseBtn.style.display = "none";
  sendAgain.style.display = "none";
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
    },
    multiBtn
  );
  appendSvg(
    {
      image: "assets/images/buttons/resend.svg",
      description: "Send again",
    },
    sendAgain
  );

  await appendList();
  multiBtn.addEventListener("click", () => handleMultiSearch());
  responseBtn.addEventListener("click", () => handleGetResponse());
  sendAgain.addEventListener("click", () => handleSendAgain());

  resetBtn.addEventListener("click", async () => {
    localStorage.removeItem(SEARCH_ENGINE_STORAGE_KEY);
    await appendList();
  });

  const engines = await getSearchEngineList();
  let { unstable } = await chrome.storage.local.get("unstable");
  if (unstable) {
    chrome.runtime.onMessage.addListener((e) => handleChatMessage(e, engines));
  }
});
