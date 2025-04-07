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
  localStorage.setItem("query", query);
  console.log(`Sending ${query} to sidebar...`);
  browser.sidebarAction.setPanel({
    panel: `sidebar.html`,
  });
  browser.sidebarAction.open();
});

function getSearchEngine() {
  return (
    JSON.parse(localStorage.getItem("selectedSearchEngine")) || {
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
  const search = getSearchEngine();
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
      () => void browser.runtime.lastError
    );
    prompts.forEach((type) => {
      browser.contextMenus.create(
        {
          id: type.prompt,
          title: type.id,
          parentId: "search",
          contexts: type.context,
        },
        () => void browser.runtime.lastError
      );
    });
  }
}
function updateMenu() {
  browser.contextMenus.update("search", {
    title: "Ask " + `${getSearchEngine().name}`,
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
browser.runtime.onMessage.addListener((e) => {
  if (e.message && e.message === "selectedSearchEngine") {
    console.log("Search engine changed", e.engine.name);
    getSearchEngine();
    updateMenu();
  }
});

// Initial menu setup
let prompts = [];
getPrompts();
