let sidebarStatus = false;
let selectedEngine = null;
let tabReceived = 0;
let locale = null;
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
    console.log(`Sending ${query} to sidebar...`);
    chrome.storage.local.set({ query });
    chrome.storage.local.set({ time: Date.now() });
    chrome.runtime
      .sendMessage({
        message: "sendQuery",
      })
      .catch(() => {});
    try {
      console.log("sidebar status", sidebarStatus, "unstable status", unstable);
      if (!unstable) {
        browser.sidebarAction.setPanel({ panel: "./index.html#sidebar" });
        browser.sidebarAction.open();
        chrome.storage.local.set({ lastQuery: query });
        return;
      }
      if (!sidebarStatus)
        browser.sidebarAction.open().catch((error) => {
          console.error("Failed to open sidebar:", error);
          createTab(query);
        });
      chrome.storage.local.set({ [selectedEngine.name]: true });
    } catch (error) {
      console.log("In chrome. Creating tab", error);
      createTab(query);
    }
  });

  chrome.contextMenus.onClicked.addListener(async (info) => {
    let firefox = false;
    try {
      await browser.sidebarAction.isOpen({}).then((e) => (firefox = e));
    } catch {
      firefox = false;
    }
    sidebarStatus = hasScripts && firefox;
    if (info.menuItemId == "switch" || info.parentMenuItemId == "switch") {
      await switchEngine(info.menuItemId);
      return;
    }
  });

  chrome.omnibox.onInputEntered.addListener(async (text) => {
    let query;
    await chrome.storage.local.set({ time: Date.now() });
    if (text.startsWith("@")) {
      let engineName = text.split(" ")[0].slice(1).toLowerCase();
      for (const ai of aiList) {
        if (
          ai.name.toLowerCase() === engineName ||
          ai.omnibox.includes(engineName)
        ) {
          query = text.slice(engineName.length + 1).trim();
          await chrome.storage.local.set({ query });
          await createTab(query, ai);
          return;
        }
      }
    }
    query = text.trim();
    await chrome.storage.local.set({ query });
    await createTab(query);
  });

  chrome.omnibox.onInputChanged.addListener((text, suggest) => {
    if (text.startsWith("@")) {
      let engineName = text.split(" ")[0].slice(1).toLowerCase();
      for (const ai of aiList) {
        if (
          ai.name.toLowerCase() === engineName ||
          ai.omnibox.includes(engineName)
        ) {
          chrome.omnibox.setDefaultSuggestion({
            description: `${t("ask")} ${ai.name} (@${ai.omnibox[0]}, @${
              ai.omnibox[1]
            })`,
          });
          return;
        }
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
          if (keys.hasOwnProperty(aiName) && keys[aiName] === true) {
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
          await chrome.storage.local.remove("query");
        }
      }
    }
  );

  chrome.runtime.onMessage.addListener((e) => {
    if (e.ping) {
      tabReceived++;
      setTimeout(() => tabReceived--, 1000);
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
      function stripAttributes(html) {
        html = html.replace(/<svg[^>]*?>.*?<\/svg>/gis, "");

        html = html.replace(/<([a-z]+)([^>]*)>/gi, (match, tagName, attrs) => {
          tagName = tagName.toLowerCase();

          if (tagName === "a") {
            const hrefMatch = attrs.match(/\s*href\s*=\s*(['"])(.*?)\1/i);
            return hrefMatch ? `<a href="${hrefMatch[2]}">` : `<a>`;
          }

          if (tagName === "img") {
            const srcMatch = attrs.match(/\s*src\s*=\s*(['"])(.*?)\1/i);
            if (srcMatch) {
              return `<img src="${srcMatch[2]}" style="max-width:150px; max-height:150px; height:auto; width:auto;">`;
            }
            return `<img style="max-width:150px; max-height:150px; height:auto; width:auto;">`;
          }

          return `<${tagName}>`;
        });
        return html;
      }

      chrome.runtime.sendMessage({
        content: stripAttributes(e.lastResponse),
        engine: e.engine,
      });
    }
  });
}

// Start initialization
initialize().catch(console.error);

// Remove the simple t() function and replace with proper i18n handling
function t(key) {
  if (!locale) {
    return chrome.i18n.getMessage(key.replace(" ", "_"), null) || key;
  } else {
    return localeKeys?.[key]?.message || key;
  }
}

async function createTab(query, engine = null) {
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
  chrome.storage.local.set({ lastQuery: query });
  if (curEngine) {
    let url;
    let curEngineScripts = await getScriptStatus(curEngine.name);
    if (curEngine.experimental) {
      if (curEngineScripts) {
        await chrome.storage.local.set({ [curEngine.name]: true });

        const waitForNoPing = () =>
          new Promise((resolve) => {
            let checkInterval = setInterval(() => {
              if (tabReceived > 0) {
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
          chrome.storage.local.remove("query");
          url = `${curEngine.url}${encodeURIComponent(query)}`;
          chrome.tabs.create({ url: url });
        }
      }
    } else {
      chrome.storage.local.remove("query");
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
        title: t(`${type.id.toLowerCase()}`),
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
  locale = null;
  await chrome.storage.local.get("locale").then((e) => {
    if (e.locale) locale = e.locale.split("-")[0];
  });
  if (locale) {
    const response = await fetch(`/_locales/${locale}/messages.json`);
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
  if (curTime > time + 1000 * 15) {
    console.log("Clearing old queries");
    aiList.forEach((ai) => {
      const aiName = ai.name;
      chrome.storage.local.remove([aiName, aiName + "Last"]);
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
      const imgblob = await fetch(iconUrl.replace(".svg", ".png")).then((r) =>
        r.blob()
      );
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
