const needPerm = ["Gemini", "DeepSeek"];
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
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
  query = query.trim();
  console.log(`Sending ${query} to sidebar...`);
  chrome.storage.local.set({ query });
  chrome.runtime.sendMessage({
    // Send a message to the sidebar
    message: "sendQuery",
  });
  try {
    browser.sidebarAction.setPanel({
      panel: `sidebar.html`,
    });
    browser.sidebarAction.open();
  } catch (error) {
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
});

async function getSearchEngine() {
  let { engine: x } = await chrome.storage.local.get("engine");
  return x || null;
}

async function deleteMenu() {
  await chrome.contextMenus.remove("search").catch(() => {});
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
  // Remove existing quick-access menu
  deleteMenu();
  const search = await getSearchEngine();
  if (search) {
    chrome.contextMenus.create(
      {
        id: "search",
        title: "Ask " + `${search.name}`,
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
  } else {
    console.log("No AI chatbots selected.");
  }
}
function updateMenu(engine) {
  chrome.contextMenus.update("search", {
    title: "Ask " + `${engine.name}`,
  });
}
async function getPrompts() {
  let response = await fetch("ai-list.json");
  if (!response.ok) {
    throw new Error("Failed to load AI list data");
  }
  let data = await response.json();
  prompts = data["prompts"];
  await loadMenu();
}
// Listen for changes in localStorage and update menus accordingly
chrome.runtime.onMessage.addListener(async (e) => {
  if (e.message === "selectedSearchEngine") {
    console.log("AI chatbot changed", e.engine.name);
    if (menusCreated) updateMenu(e.engine);
    else loadMenu();
  } else if (e.message === "reset") {
    console.log("Removing context menus");
    deleteMenu();
  }
});

// Initial menu setup
let prompts = [];
let menusCreated = false;
getPrompts();

chrome.action.onClicked.addListener(async () => {
  let x = await getSearchEngine();
  if (x) {
    let url = hostnameToURL(new URL(x.url).hostname);

    chrome.tabs.create({ url: url });
  }
});
