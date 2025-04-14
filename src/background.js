const needPerm = ["Gemini", "DeepSeek"];
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  let query;
  let prompt = info.menuItemId;
  if (prompt == "switch" || info.parentMenuItemId == "switch") {
    await switchEngine(prompt);
    return;
  }
  query = prompt == "paste" ? "" : prompt;
  if (info.selectionText) {
    query = `${query} ${info.selectionText}`;
  } else if (info.linkUrl) {
    query = `${query} ${info.linkUrl}`;
  } else if (tab.url) {
    query = `${query} ${tab.url}`;
  } else {
    query = "";
  }
  query = query.trim();

  console.log(`Sending ${query} to sidebar...`);
  chrome.storage.local.set({ query });
  chrome.runtime.sendMessage({
    // Send a message to the sidebar
    message: "sendQuery",
  });
  try {
    await browser.sidebarAction.setPanel({
      panel: `sidebar.html`,
    });
    await browser.sidebarAction.open();
  } catch (error) {
    await createTab(query);
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
  if (!Experimental && needPerm.some((e) => e === search.name)) {
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
  chrome.runtime.sendMessage({
    message: "selectedSearchEngine",
    engine: selected,
  });
  const iconUrl = selected.image;
  await chrome.action.setIcon({ path: iconUrl });
  try {
    browser.sidebarAction.setIcon({ path: iconUrl });
  } catch (error) {}
}

// Message listener for dynamic updates
chrome.runtime.onMessage.addListener(async (e) => {
  if (e.message === "selectedSearchEngine") {
    console.log("AI chatbot changed", e.engine.name);
    const { Experimental } = await chrome.storage.local.get("Experimental");
    if (!Experimental && needPerm.some((eg) => eg === e.engine.name)) {
      await loadMenu(); // Rebuild menu if permissions are lacking
    } else {
      updateMenu(e.engine);
    }
  } else if (e.message === "reset") {
    console.log("Removing context menus");
    await deleteMenu();
  } else if (e.message === "Experimental") {
    console.log("Scripting Permissions changed for ", e.engine.name);
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
