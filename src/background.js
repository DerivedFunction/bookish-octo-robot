let sidebarStatus = false;
let selectedEngine = null;
let tabResponses = new Map(); // Map to store response timestamps
let currentLocale = null;
let localeKeys = null;
let prompts = [];
let aiList = [];
let unstable = false;
let menusCreated = false;
let hasScripts = false;

// Initialize core functionality
async function initialize() {
  await getLocale();
  selectedEngine = await getSearchEngine();
  await getPrompts();

  // Set up event listeners after initialization
  setupEventListeners();
}

function setupEventListeners() {
  chrome.contextMenus.onClicked.addListener(async (info, tab) => {
    let prompt = info.menuItemId;
    let query = prompt == "paste" ? "" : prompt;
    if (info.selectionText) {
      query = `${query} ${info.selectionText}`;
    } else if (info.linkUrl) {
      query = `${query} ${info.linkUrl}`;
    } else if (tab.url) {
      query = `${query} ${tab.url}`;
    } else {
      query = "";
    }
    query =
      info.parentMenuItemId === "switch" || info.menuItemId == "switch"
        ? null
        : query.trim();
    if (!query) return;

    try {
      console.log("unstable status", unstable, sidebarStatus);
      if (!unstable || !sidebarStatus) {
        browser.sidebarAction.open();
      }
      await chrome.storage.local.set({
        query,
        [selectedEngine.name]: true,
        lastQuery: query,
        time: Date.now(),
      });
    } catch (error) {
      console.log("In chrome. Creating tab", error);
      createTab(query, null, false);
    }
  });
  chrome.contextMenus.onClicked.addListener(async (info) => {
    try {
      await browser.sidebarAction.isOpen({}).then((e) => (sidebarStatus = e));
    } catch {
      sidebarStatus = false;
    }
    if (info.menuItemId == "switch" || info.parentMenuItemId == "switch") {
      await switchEngine(info.menuItemId);
      return;
    }
  });

  chrome.omnibox.onInputEntered.addListener(async (text) => {
    if (text.startsWith("@")) {
      const startFlags = text.match(/^(?:@\w+\s*)+/)?.[0] || "";
      const flags = startFlags.match(/@\w+/g) || [];
      const query = text.slice(startFlags.length).trim();

      let matchFound = false;
      let newChat = true;
      if (flags.some((flag) => flag === "@s")) {
        newChat = false;
        if (flags.length === 1) {
          await createTab(query, null, newChat);
          return;
        }
      }
      for (const flag of flags) {
        const engineName = flag.slice(1).toLowerCase();
        const ai = aiList.find(
          (ai) =>
            ai.name.toLowerCase() === engineName ||
            ai.omnibox.includes(engineName)
        );
        if (ai) {
          matchFound = true;
          await createTab(query, ai, newChat);
        }
      }
      if (matchFound) return;
    }
    await createTab(text.trim());
  });

  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    if (text.includes("@")) {
      const startFlags = text.match(/^(?:@\w+\s*)+/)?.[0] || "";
      const flags = startFlags.match(/@\w+/g) || [];
      const matchedAIs = [];

      for (const flag of flags) {
        const engineName = flag.slice(1).toLowerCase();
        const ai = aiList.find(
          (ai) =>
            ai.name.toLowerCase() === engineName ||
            ai.omnibox.includes(engineName)
        );
        if (ai) matchedAIs.push(ai);
      }

      if (matchedAIs.length > 0) {
        const aiNames = matchedAIs.map((ai) => ai.name).join(", ");
        chrome.omnibox.setDefaultSuggestion({
          description: `${t("ask")} ${aiNames}`,
        });
        return;
      }
      setDefaultSuggestion();
    } else {
      setDefaultSuggestion();
      for (const ai of aiList) {
        if (ai.name !== selectedEngine?.name)
          suggest([
            {
              content: `@${ai.name} ${text}`,
              description: `${t("ask")} ${ai.name} (@${ai.omnibox[0]}, @${
                ai.omnibox[1]
              })`,
            },
          ]);
      }
    }
  });

  chrome.omnibox.onInputStarted.addListener(() => {
    setDefaultSuggestion();
  });

  chrome.runtime.onMessage.addListener(async (e) => {
    if (e.message === "selectedSearchEngine") {
      console.log("AI chatbot changed", e.engine?.name);
      selectedEngine = e.engine;
      await getScriptStatus();
      updateMenu(e.engine);
    } else if (e.message === "reset") {
      console.log("Removing context menus");
      await deleteMenu();
    } else if (e.message === "Experimental") {
      console.log("Scripting Permissions changed for ", selectedEngine?.name);
      await getScriptStatus();
      updateMenu(e.engine);
    } else if (e.message === "localechange") {
      await getLocale();
      await loadMenu();
    }
  });

  chrome.action.onClicked.addListener(async () => {
    if (selectedEngine) {
      let url = hostnameToURL();
      chrome.tabs.create({ url: url });
    }
  });

  chrome.runtime.onMessage.addListener(
    async (request, sender, sendResponse) => {
      if (request.buttonClicked) {
        const keys = await chrome.storage.local.get();

        let noneEnabled = true;

        for (const ai of aiList) {
          const aiName = ai.name;
          const run = `${aiName}Run`;
          if (
            (keys.hasOwnProperty(run) && keys[run] === true) ||
            (keys.hasOwnProperty(aiName) && keys[aiName] === true)
          ) {
            noneEnabled = false;
            break;
          }
        }

        if (noneEnabled) {
          const allKeys = await chrome.storage.local.get(null);
          const files = Object.keys(allKeys).filter((key) =>
            key.startsWith("pasted-file-")
          );
          if (files.length > 0) {
            await chrome.storage.local.remove(files);
            chrome.runtime.sendMessage({ message: "clearImage" });
          }
          await new Promise((resolve) => setTimeout(resolve, 5000));
          await chrome.storage.local.remove(["query", "time"]);
        }
      }
    }
  );
  chrome.runtime.onMessage.addListener((e) => {
    console.log(e);
    if (e.ping) {
      const timestamp = Date.now();
      const responseKey = e.name;
      tabResponses.set(responseKey, timestamp);
      // Clean up old responses after 1 second
      setTimeout(() => tabResponses.delete(responseKey), 1000);
    }
  });

  chrome.runtime.onMessage.addListener((e) => {
    if (e.unstable) {
      unstable = e.value;
      console.log("unstable status", unstable);
    }
  });

  chrome.runtime.onMessage.addListener((e) => {
    if (e.lastResponse) {
      chrome.runtime.sendMessage({
        content: e.lastResponse, // stripAttributes(e.lastResponse),
        engine: e.engine,
        color: e.color,
      });
    }
  });
}

// Start initialization
initialize().catch(console.error);

// Remove the simple t() function and replace with proper i18n handling
function t(key, substitutions = {}) {
  key = key.toLowerCase().replace(" ", "_").replace("-", "_");
  let text = null;
  if (!currentLocale) {
    // get the values of each item in subs in array
    let subs = [];
    Object.values(substitutions).forEach((value) => {
      subs.push(value);
    });
    text = chrome.i18n.getMessage(key, subs) || key;
  } else {
    text = localeKeys?.[key]?.message || key;
    Object.entries(substitutions).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\$${key}\\$`, "g"), value);
    });
  }
  return text;
}

async function createTab(query, engine = null, newChat = true) {
  let curEngine;
  if (engine) curEngine = engine;
  else {
    curEngine = selectedEngine;
  }
  if (!query) {
    if (curEngine)
      chrome.tabs.create({
        url: hostnameToURL(curEngine),
      });
    return;
  }
  if (newChat)
    await chrome.storage.local.set({ [`${curEngine.name}Kill`]: true });
  await chrome.storage.local.set({
    query,
    lastQuery: query,
    time: Date.now(),
    [curEngine.name]: true,
  });
  if (curEngine) {
    let url;
    let curEngineScripts = await getScriptStatus(curEngine.name);
    if (curEngine.experimental) {
      if (curEngineScripts) {
        if (newChat) {
          url = hostnameToURL(curEngine);
          chrome.tabs.create({ url });
          return;
        }
        const waitForNoPing = () =>
          new Promise((resolve) => {
            let checkInterval = setInterval(() => {
              // Check if there are any active responses for this engine
              const hasActiveResponses = Array.from(tabResponses.keys()).some(
                (key) => key.startsWith(curEngine.name)
              );
              if (hasActiveResponses) {
                clearInterval(checkInterval);
                resolve(false);
              }
            }, 100);

            setTimeout(() => {
              clearInterval(checkInterval);
              resolve(true);
            }, 1000);
          });

        const shouldCreateTab = await waitForNoPing();
        console.log("create tab?", shouldCreateTab);
        if (shouldCreateTab) {
          url = hostnameToURL(curEngine);
          chrome.tabs.create({ url });
          return;
        }
      } else {
        if (curEngine.needsPerm) {
          chrome.tabs.create({ url: `index.html#failed-${curEngine.name}` });
        } else {
          url = `${curEngine.url}${encodeURIComponent(query)}`;
          chrome.tabs.create({ url: url });
        }
      }
    } else {
      url = `${curEngine.url}${encodeURIComponent(query)}`;
      chrome.tabs.create({ url: url });
    }
  } else {
    chrome.tabs.create({ url: "index.html#none" });
  }
}

async function getSearchEngine() {
  let { engine: x } = await chrome.storage.local.get("engine");
  return x || null;
}

async function deleteMenu() {
  await chrome.contextMenus.remove("search").catch(() => {});
  await chrome.contextMenus.remove("switch").catch(() => {});
  selectedEngine = null;
  menusCreated = false;
}
function hostnameToURL(engine = null) {
  if (!engine) engine = selectedEngine;
  if (engine.home) return engine.home;
  else return engine.url.split("?")[0];
}

async function loadMenu() {
  await deleteMenu();
  selectedEngine = await getSearchEngine();
  await getScriptStatus();
  let response = selectedEngine
    ? `${t("ask")} ${selectedEngine?.name}`
    : t("ask_ai");

  chrome.contextMenus.create(
    {
      id: "search",
      title: response,
      contexts: ["selection", "link", "page"],
    },
    () => void chrome.runtime.lastError
  );

  chrome.contextMenus.create(
    {
      id: "paste",
      title: t("paste_selection"),
      parentId: "search",
      contexts: ["selection", "link"],
    },
    () => void chrome.runtime.lastError
  );

  chrome.contextMenus.create(
    {
      id: "switch",
      title: t("switch_ai"),
      parentId: "search",
      contexts: ["all"],
    },
    () => void chrome.runtime.lastError
  );

  aiList.forEach((type) => {
    chrome.contextMenus.create(
      {
        id: type.name,
        title: type.name,
        parentId: "switch",
        contexts: ["all"],
      },
      () => void chrome.runtime.lastError
    );
  });
  prompts.forEach((type) => {
    chrome.contextMenus.create(
      {
        id: t(type.prompt),
        title: t(`${type.id}`),
        parentId: "search",
        contexts: type.context,
      },
      () => void chrome.runtime.lastError
    );
  });

  menusCreated = true;
}

async function getLocale() {
  localeKeys = null;
  currentLocale = null;
  await chrome.storage.local.get("locale").then((e) => {
    if (e.locale) currentLocale = e.locale.split("-")[0];
  });
  if (currentLocale) {
    const response = await fetch(`/_locales/${currentLocale}/messages.json`);
    if (response.ok) {
      localeKeys = await response.json();
    }
  }
}

function updateMenu(engine) {
  if (menusCreated) {
    chrome.contextMenus.update(
      "search",
      {
        title: engine ? `${t("ask")} ${engine.name}` : t("ask_ai"),
      },
      () => void chrome.runtime.lastError
    );
  } else {
    loadMenu();
  }
}
async function getPrompts() {
  await chrome.storage.local.get("unstable").then((e) => {
    unstable = e.unstable;
  });
  console.log("unstable feature status", unstable);
  let response = await fetch("ai-list.json");
  if (!response.ok) {
    throw new Error("Failed to load AI list data");
  }
  let data = await response.json();
  prompts = data["prompts"];
  aiList = data["ai-list"];
  await loadMenu();
  await refresh();
}
async function refresh() {
  console.log("Checking for old queries in background.");
  const { time } = await chrome.storage.local.get("time");
  const curTime = Date.now();
  if (!time || curTime > time + 1000 * 5) {
    console.log("Clearing old queries");
    aiList.forEach((ai) => {
      const aiName = ai.name;
      chrome.storage.local.remove([
        aiName,
        aiName + "Last",
        aiName + "Kill",
        aiName + "Run",
      ]);
    });
  }
  chrome.storage.local.remove(["time", "query"]);
}
async function switchEngine(name) {
  selectedEngine = null;
  aiList.forEach((ai) => {
    if (ai.name === name) selectedEngine = ai;
  });

  await chrome.storage.local.set({ engine: selectedEngine });
  await loadMenu();
  try {
    await chrome.runtime.sendMessage({
      message: "selectedSearchEngine",
      engine: selectedEngine,
    });
  } catch {}
  if (!selectedEngine) return;
  const iconUrl = chrome.runtime.getURL(selectedEngine.image);
  if (!iconUrl) return;
  try {
    await chrome.action.setIcon({ path: iconUrl });
    browser.sidebarAction.setIcon({ path: iconUrl });
  } catch (error) {
    console.log("Using Chrome. Drawing an icon *.png via canvas", error);
    try {
      const imgblob = await fetch(iconUrl).then((r) => r.blob());
      const img = await createImageBitmap(imgblob);
      const canvas = new OffscreenCanvas(32, 32);
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      await chrome.action.setIcon({ imageData: imageData });
    } catch (error) {
      console.error("Error setting extension icon:", error);
    }
  }
}
async function getScriptStatus(name = null) {
  let curHasScripts = false;
  try {
    let curName = name || selectedEngine?.name;
    if (!curName) return;
    const scripts = await chrome.scripting.getRegisteredContentScripts();
    curHasScripts = scripts.some((script) => script.id === curName);
  } catch {
    curHasScripts = false;
  }
  if (name === selectedEngine?.name || name === null) {
    hasScripts = curHasScripts;
  }
  return curHasScripts;
}

function setDefaultSuggestion() {
  if (selectedEngine) {
    // Set the default suggestion to the current search engine
    chrome.omnibox.setDefaultSuggestion({
      description: `${t("ask")} ${selectedEngine.name} (@${
        selectedEngine.omnibox[0]
      }, @${selectedEngine.omnibox[1]})`,
    });
  } else {
    // If no engine is selected, set a generic suggestion
    chrome.omnibox.setDefaultSuggestion({
      description: t("ask_ai"),
    });
  }
}

chrome.runtime.onMessage.addListener(async (message) => {
  if (message.message === "newPrompt") {
    await chrome.storage.local.set({
      query: message.prompt,
      [message.ai.name]: true,
      lastQuery: message.prompt,
      time: Date.now(),
    });
    createTab(message.prompt, message.ai, false);
  }
});
