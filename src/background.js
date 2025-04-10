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
  console.log(`Sending ${query} to sidebar...`);
  chrome.storage.local.set({ query: query });
  try {
    browser.sidebarAction.setPanel({
      panel: `sidebar.html`,
    });
    browser.sidebarAction.open();
  } catch (error) {
    console.log("Probably in Chrome. Cannot use Side Panel");
    console.log(`Opening ${query} in new tab...`);
    let x = await getSearchEngine();
    if (x) {
      let url;
      if (x.experimental) {
        url = new URL(`${x.url}`);
      } else {
        url = new URL(`${x.url}${encodeURIComponent(query)}`);
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
  if (e.message && e.message === "selectedSearchEngine") {
    console.log("AI chatbot changed", e.engine.name);
    if (menusCreated) updateMenu(e.engine);
    else loadMenu();
  } else if (e.message && e.message === "reset") {
    console.log("Removing context menus");
    deleteMenu();
  }
});

// Initial menu setup
let prompts = [];
let menusCreated = false;
getPrompts();

chrome.action.onClicked.addListener(async () => {
  try {
    browser.sidebarAction.setPanel({
      panel: `sidebar.html`,
    });
    browser.sidebarAction.open();
  } catch (error) {
    console.log("Probably in Chrome. Cannot use Side Panel");
    console.log(`Opening new tab...`);
    let x = await getSearchEngine();
    if (x) {
      let url = `${x.url}`;
      chrome.tabs.create({ url: url });
    }
  }
});

// background.js
try {
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === "complete" && tab.url) {
      const urlSubstrings = ["gemini.google.com/app"];
      const isMatchingUrl = urlSubstrings.some((substring) =>
        tab.url.includes(substring)
      );
      if (isMatchingUrl) {
        chrome.scripting.executeScript(
          {
            target: { tabId: tabId },
            files: ["script.js"],
          },
          (results) => {
            if (chrome.runtime.lastError) {
              console.error(
                "Script injection failed: ",
                chrome.runtime.lastError.message
              );
            } else {
              console.log("Script injection succeeded, results:", results);
            }
          }
        );
      }
    }
  });
} catch {
  console.log("Experimental Permissions not enabled.");
}
