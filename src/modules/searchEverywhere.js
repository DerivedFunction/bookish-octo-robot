import {
  curSearchBtn,
  getSearchEngineList,
  searchEnginePickerBtn,
} from "./searchEngine.js";
import { appendImg } from "./appendImage.js";
import { resetBtn, toggleClass } from "../app.js";
import { charCount, query, queryEvents } from "./query.js";
import { showToast } from "./toaster.js";
import { greetingContainer } from "./greetings.js";
import { goBtn } from "./actionButtons.js";
import { suggestionContainer } from "./suggestions.js";
import { chatBotResponse, responseBox } from "./response.js";
import { setupTooltip } from "./tooltip.js";
import { t } from "./locales.js";
import { fileUploadBtn } from "./files.js";

// Constants
const SEARCH_ENGINE_STORAGE_KEY = "search-everywhere";

// DOM Elements
const searchEverywhereList = document.getElementById("search-everywhere-list");
const searchEverywhereBtn = document.getElementById("search-everywhere-button");
export const multiBtn = document.getElementById("multi-go");
const sendAgain = document.getElementById("send-again");
const responseContainer = document.getElementById("response-container");
const responseBtn = document.getElementById("response");
const multiTools = document.getElementById("multi-tools");
const newTabBtn = document.getElementById("new-tab");
// State Variables
export let newClick = true;

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
  appendImg(
    {
      image: engine.image,
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
    appendImg(
      {
        image: engine.image,
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

    let chatbotMessages = responseContainer.lastElementChild;
    const chatbotMessageContainer = document.createElement("div");
    if (
      !chatbotMessages ||
      !chatbotMessages.classList.contains("chatbot-messages") ||
      chatbotMessages.classList.contains("KEEP")
    ) {
      chatbotMessages = document.createElement("div");
      chatbotMessages.classList.add("chatbot-messages");
      chatbotMessages.classList.add("horizontal-container");

      responseContainer.appendChild(chatbotMessages);
      responseContainer.appendChild(chatbotMessageContainer);
    }
    messageButton.addEventListener("click", () => {
      chatbotMessageContainer.replaceChildren(parsedElement);
      //responseBox.replaceChildren(e.content);
      // chatBotResponse.style.display = "block";
    });
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
  const searchEngines = await getSearchEngineList();
  const searchEverywhere = getSearchEverywhere();

  const permissions = [];
  try {
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    scripts.forEach((script) => permissions.push(script.id));
  } catch {
    console.log("Scripting is not enabled.");
  }
  let args = {};
  args.lastQuery = queryText;
  args.query = queryText;
  args.time = Date.now();
  for (const engine of searchEngines) {
    if (!searchEverywhere[engine.name]) continue;
    if (queryText.length > engine.limit) {
      showToast(
        `${engine.name} - ${t("too_long")}: ${queryText.length} > ${
          engine.limit
        }`
      );
      continue;
    }

    if (engine.experimental && permissions.includes(engine.name)) {
      args[engine.name] = true;
    }
  }
  await chrome.storage.local.set(args);
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
            url: engine.home ? engine.home : engine.url.split("?")[0],
            active,
          });
        }
      }
    } else {
      if (engine.experimental) {
        if (engine.needsPerm) {
          showToast(`${engine.name} ${t("no_perm")}`);
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
    [
      greetingContainer,
      curSearchBtn,
      suggestionContainer,
      searchEnginePickerBtn,
      goBtn,
      charCount,
    ].forEach((e) => {
      e.style.display = "none";
    });
    newClick = false;
    responseContainer.style.display = "block";
    [multiTools, searchEverywhereList, fileUploadBtn].forEach((e) => {
      e.style.display = "";
    });
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
async function openNewTab() {
  const searchEngines = getSearchEverywhere();
  const active = false;
  const aiList = await getSearchEngineList();
  for (const engine in searchEngines) {
    const e = aiList.filter((a) => a.name === engine)[0];
    const url = hostnameToURL(e);
    if (searchEngines[engine]) {
      await chrome.storage.local.set({
        [`${engine}Kill`]: true,
        [engine]: true,
      });
      chrome.tabs.create({ url, active });
    }
  }
  function hostnameToURL(engine) {
    if (engine.home) return engine.home;
    else return engine.url.split("?")[0];
  }
}
export let everyWhereMode = false;
// --- Event Listeners and Initialization ---
export let showFileBtn = false;
document.addEventListener("DOMContentLoaded", async () => {
  [multiBtn, multiTools, searchEverywhereList].forEach((e) => {
    e.style.display = "none";
  });
  [responseBtn, sendAgain, newTabBtn, searchEverywhereBtn].forEach((btn) => {
    setupTooltip(btn, () => true);
  });
  setupTooltip(multiBtn, () => query.value.length === 0);
  appendImg(
    {
      image: "assets/images/buttons/response.svg",
    },
    responseBtn
  );
  appendImg(
    {
      image: "assets/images/buttons/multi.svg",
    },
    multiBtn
  );
  appendImg(
    {
      image: "assets/images/buttons/resend.svg",
    },
    sendAgain
  );
  appendImg(
    {
      image: "assets/images/buttons/new.svg",
    },
    newTabBtn
  );
  appendImg(
    {
      image: "assets/images/buttons/multi.svg",
    },
    searchEverywhereBtn
  );

  multiBtn.addEventListener("click", () => handleMultiSearch());
  responseBtn.addEventListener("click", () => handleGetResponse());
  sendAgain.addEventListener("click", () => handleSendAgain());
  newTabBtn.addEventListener("click", () => openNewTab());
  searchEverywhereBtn.addEventListener("click", async () => {
    showFileBtn = true;
    everyWhereMode = true;
    [multiBtn, searchEverywhereList, fileUploadBtn].forEach((e) => {
      e.style.display = "";
    });
    [curSearchBtn, goBtn, searchEnginePickerBtn, charCount].forEach((e) => {
      e.style.display = "none";
    });
  });
  resetBtn.addEventListener("click", async () => {
    localStorage.removeItem(SEARCH_ENGINE_STORAGE_KEY);
  });
  await appendList();
  const engines = await getSearchEngineList();
  let { unstable } = await chrome.storage.local.get("unstable");
  const messageListener = (e) => handleChatMessage(e, engines);

  if (unstable) {
    chrome.runtime.onMessage.addListener(messageListener);
  }

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === "local" && changes.unstable) {
      if (changes.unstable.newValue) {
        chrome.runtime.onMessage.addListener(messageListener);
      } else {
        chrome.runtime.onMessage.removeListener(messageListener);
      }
    }
  });
});
