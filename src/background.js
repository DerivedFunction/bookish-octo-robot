const manifest = chrome.runtime.getManifest();
const optionalPermissions = manifest.optional_permissions || [];
const optionalHostPermissions = manifest.optional_host_permissions || [];
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
      if (x.experimental) {
        url = x.url;
      } else {
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
    let url = new URL(x.url).hostname;
    chrome.tabs.create({ url: url });
  }
});

const cooldownTime = 8000; // 8 seconds cooldown
const lastInjected = {}; // key: tabId, value: timestamp

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url) {
    const urlSubstrings = ["https://gemini.google.com/app"];
    const isMatchingUrl = urlSubstrings.some(
      (substring) => tab.url === substring
    );
    if (isMatchingUrl) {
      const now = Date.now();
      if (!lastInjected[tabId] || now - lastInjected[tabId] > cooldownTime) {
        lastInjected[tabId] = now;

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
      } else {
        console.log(`Cooldown active for tab ${tabId}. Skipping injection.`);
      }
    }
  }
});
