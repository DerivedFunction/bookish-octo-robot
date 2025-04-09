// Ensure 'browser' is defined (for Chrome compatibility without polyfill)
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  // AI searches
  let prompt = info.menuItemId;
  let query = prompt == "paste" ? "" : prompt;
  if (info.selectionText) {
    query = `${query} ${info.selectionText}`;
  } else if (info.linkUrl) {
    query = `${query} ${info.linkUrl}`;
  } else {
    query = `${query} ${tab.url}`;
  }
  query = query.trim();
  try {
    browser.sidebarAction.setPanel({
      panel: `sidebar.html`,
    });
    browser.sidebarAction.open();
    console.log(`Sending ${query} to sidebar...`);
    chrome.storage.local.set({ query: query });
  } catch (error) {
    console.log("Probably in Chrome. Cannot use Side Panel");
    console.log(`Opening ${query} in new tab...`);
    let x = await getSearchEngine();
    let url = `${x.url}${encodeURIComponent(query)}`;
    chrome.tabs.create({ url: url });
  }
});

async function getSearchEngine() {
  let x = await chrome.storage.local.get("engine");
  return (
    x["engine"] || {
      name: "Grok",
      url: "https://www.grok.com/?q=",
      image: "/assets/images/ai/grok.svg",
    }
  );
}

// Load the context menus dynamically
async function loadMenu() {
  // Remove existing quick-access menu
  await chrome.contextMenus.remove("search").catch(() => {});
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
  if (e.message && e.message === "selectedSearchEngine") {
    console.log("Search engine changed", e.engine.name);
    updateMenu(e.engine);
  }
});

// Initial menu setup
let prompts = [];
getPrompts();
