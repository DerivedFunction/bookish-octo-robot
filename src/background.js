// Ensure 'browser' is defined (for Chrome compatibility without polyfill)
const browser = window.browser || window.chrome;
browser.contextMenus.onClicked.addListener(async (info, tab) => {
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

  try {
    browser.sidebarAction.setPanel({
      panel: `sidebar.html`,
    });
    browser.sidebarAction.open();
  } catch (error) {
    console.log("Probably in Chrome");
    browser.sidePanel.open({ windowId: tab.windowId });
  }
  console.log(`Sending ${query} to sidebar...`);
  browser.storage.local.set({ query: query });
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
  await browser.contextMenus.remove("search").catch(() => {});
  const search = await getSearchEngine();
  if (search) {
    browser.contextMenus.create(
      {
        id: "search",
        title: "Ask " + `${search.name}`,
        contexts: ["selection", "link", "page"],
      },
      () => void browser.runtime.lastError
    );
    browser.contextMenus.create(
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
browser.runtime.onMessage.addListener(async (e) => {
  if (e.message && e.message === "selectedSearchEngine") {
    console.log("Search engine changed", e.engine.name);
    updateMenu(e.engine);
  }
});

// Initial menu setup
let prompts = [];
getPrompts();
