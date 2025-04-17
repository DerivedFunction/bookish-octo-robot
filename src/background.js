chrome.contextMenus.onClicked.addListener((info, tab) => {
  // AI searches
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
  chrome.runtime.sendMessage({
    message: "sendQuery",
  });
  try {
    // Synchronously set panel and open sidebar in Firefox
    browser.sidebarAction.setPanel({ panel: "index.html#sidebar" });
    browser.sidebarAction.open().catch((error) => {
      console.error("Failed to open sidebar:", error);
      createTab(query); // Fallback to creating a tab
    });
  } catch (error) {
    console.error(error);
    createTab(query);
  }
});
chrome.contextMenus.onClicked.addListener(async (info) => {
  if (info.menuItemId == "switch" || info.parentMenuItemId == "switch") {
    await switchEngine(info.menuItemId);
    return;
  }
});
async function createTab(query) {
  let x = await getSearchEngine();
  if (x) {
    let url;
    let { Experimental } = await chrome.storage.local.get("Experimental"); // If we have permissions
    if (x.experimental) {
      // If set to true, use the original url
      if (Experimental) url = hostnameToURL(new URL(x.url).hostname);
      // Else use the query form
      else {
        chrome.storage.local.remove("query");
        url = `${x.url}${encodeURIComponent(query)}`;
      }
    } else {
      chrome.storage.local.remove("query");
      url = `${x.url}${encodeURIComponent(query)}`;
    }
    chrome.tabs.create({ url: url });
  }
}

async function getSearchEngine() {
  let { engine: x } = await chrome.storage.local.get("engine");
  return x || null;
}

async function deleteMenu() {
  console.log("Deleting context menus");
  await chrome.contextMenus.remove("search").catch(() => {});
  await chrome.contextMenus.remove("switch").catch(() => {});
  menusCreated = false;
}
function hostnameToURL(hostname) {
  // Create a URL object with a base URL
  const urlObject = new URL("https://example.com");
  // Update the hostname
  urlObject.hostname = hostname;
  // Get the full URL string
  let url = urlObject.href;
  // Append specific paths based on hostname content
  if (hostname.includes("huggingface")) {
    url += "chat";
  }
  if (hostname.includes("gemini")) {
    url += "app";
  }
  return url;
}

// Load the context menus dynamically
async function loadMenu() {
  // Remove existing menus
  await deleteMenu();
  console.log("Creating context menus");
  const search = await getSearchEngine();
  let { Experimental } = await chrome.storage.local.get("Experimental");

  // If no search engine is selected, create only the switch menu
  if (!search) {
    chrome.contextMenus.create(
      {
        id: "switch",
        title: "Switch to different AI chatbot",
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
    menusCreated = true;
    console.log("No AI chatbots selected.");
    return;
  }

  // Check if the selected engine requires permissions and Experimental is false
  if (!Experimental && search.needsPerm) {
    chrome.contextMenus.create(
      {
        id: "switch",
        title: "Switch to different AI chatbot",
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
    console.log(`No permissions for ${search.name}.`);
    menusCreated = true;
    return;
  }

  // Create full menu for valid engine with permissions
  chrome.contextMenus.create(
    {
      id: "search",
      title: `Ask ${search.name}`,
      contexts: ["selection", "link", "page"],
    },
    () => void chrome.runtime.lastError
  );
  chrome.contextMenus.create(
    {
      id: "paste",
      title: "Paste Selection Into Prompt",
      parentId: "search",
      contexts: ["selection", "link"],
    },
    () => void chrome.runtime.lastError
  );
  chrome.contextMenus.create(
    {
      id: "switch",
      title: "Switch to different AI chatbot",
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
        id: type.prompt,
        title: type.id,
        parentId: "search",
        contexts: type.context,
      },
      () => void chrome.runtime.lastError
    );
  });
  menusCreated = true;
}
// Update menu title when engine changes
function updateMenu(engine) {
  if (menusCreated) {
    chrome.contextMenus.update(
      "search",
      {
        title: `Ask ${engine.name}`,
      },
      () => void chrome.runtime.lastError
    );
  } else {
    loadMenu();
  }
}
async function getPrompts() {
  let response = await fetch("ai-list.json");
  if (!response.ok) {
    throw new Error("Failed to load AI list data");
  }
  let data = await response.json();
  prompts = data["prompts"];
  aiList = data["ai-list"];
  await loadMenu();
}
async function switchEngine(name) {
  let selected = null;
  aiList.forEach((ai) => {
    if (ai.name === name) selected = ai;
  });
  await chrome.storage.local.set({ engine: selected });
  await loadMenu();
  try {
    await chrome.runtime.sendMessage({
      message: "selectedSearchEngine",
      engine: selected,
    });
  } catch {}
  if (!selected) return;
  const iconUrl = chrome.runtime.getURL(selected.image);
  if (!iconUrl) return;
  try {
    // Firefox works
    await chrome.action.setIcon({ path: iconUrl });
    browser.sidebarAction.setIcon({ path: iconUrl });
  } catch (error) {
    console.log("Using Chrome. Drawing an icon *.png via canvas", error);
    try {
      const imgblob = await fetch(iconUrl.replace(".svg", ".png")).then((r) =>
        r.blob()
      );
      const img = await createImageBitmap(imgblob);
      const canvas = new OffscreenCanvas(32, 32); // Recommended base size for extension icons
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      // Get the ImageData from the canvas
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      // Set the icon using imageData
      await chrome.action.setIcon({ imageData: imageData });
    } catch (error) {
      console.error("Error setting extension icon:", error);
    }
  }
}
// Message listener for dynamic updates
chrome.runtime.onMessage.addListener(async (e) => {
  if (e.message === "selectedSearchEngine") {
    console.log("AI chatbot changed", e.engine?.name);
    const { Experimental } = await chrome.storage.local.get("Experimental");
    if (!Experimental && e.engine?.needsPerm) {
      await loadMenu(); // Rebuild menu if permissions are lacking
    } else {
      updateMenu(e.engine);
    }
  } else if (e.message === "reset") {
    console.log("Removing context menus");
    await deleteMenu();
  } else if (e.message === "Experimental") {
    console.log("Scripting Permissions changed for ", e.engine?.name);
    await loadMenu(); // Rebuild menu on permission change
  }
});

// Initial menu setup
let prompts = [];
let aiList = [];
let menusCreated = false;
getPrompts();

chrome.action.onClicked.addListener(async () => {
  let x = await getSearchEngine();
  if (x) {
    let url = hostnameToURL(new URL(x.url).hostname);
    chrome.tabs.create({ url: url });
  }
});

// background.js
chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
  if (request.buttonClicked) {
    // Retrieve stored engine states
    const keys = await chrome.storage.local.get();

    // Check if none of the engines are enabled (aka ChatGPT: false), or if no such key exist (aka not in storage)
    let noneEnabled = true;

    // Iterate through the list of engines
    for (const ai of aiList) {
      const aiName = ai.name;
      // Check if the key exists in the stored keys and if its value is true
      if (keys.hasOwnProperty(aiName) && keys[aiName] === true) {
        // If at least one engine is enabled, set noneEnabled to false and break the loop
        noneEnabled = false;
        break;
      }
    }

    if (noneEnabled) {
      // Get all keys from storage
      const allKeys = await chrome.storage.local.get(null); // null retrieves all key-value pairs
      const files = Object.keys(allKeys).filter((key) =>
        key.startsWith("pasted-file-")
      );
      if (files.length > 0) {
        await chrome.storage.local.remove(files);
        chrome.runtime.sendMessage({ message: "clearImage" });
      }
      await chrome.storage.local.remove("query");
    }
  }
});
