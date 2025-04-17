import "./modules/index.js";
import { showToast } from "./modules/toaster.js";
export const resetBtn = document.getElementById("reset");
export function toggleButton(button, enabled, style = "enabled") {
  button.disabled = !enabled;
  if (enabled) button.classList.add(style);
  else button.classList.remove(style);
}

export function toggleClass(container, condition, style = "enabled") {
  if (condition) container.classList.add(style);
  else container.classList.remove(style);
}
export const needPerm = ["Gemini", "DeepSeek"];
export async function readText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}
export async function loadJsonData(type) {
  try {
    // Object to store only the requested data
    const result = {};

    // Fetch only the specified data type
    if (type === "ai" || type === null) {
      const response = await fetch("ai-list.json");
      if (!response.ok) {
        throw new Error("Failed to load AI list data");
      }
      const data = await response.json();
      result.aiList = data["ai-list"];
      result.prompts = data["prompts"];
    }

    if (type === "wallpapers" || type === null) {
      console.log("fetching wallpapers");
      const response = await fetch("sample-wallpaper.json");
      if (!response.ok) {
        throw new Error("Failed to load wallpaper list data");
      }
      const data = await response.json();
      result.wallpapers = data;
    }
    if (type === "scripts" || type === null) {
      console.log("fetching scripts");
      const response = await fetch("scripts.json");
      if (!response.ok) {
        throw new Error("Failed to load scripts");
      }
      const data = await response.json();
      result.scripts = data;
    }

    // Ensure all properties are defined, even if not requested
    return {
      aiList: result.aiList || [],
      prompts: result.prompts || [],
      wallpapers: result.wallpapers || [],
      scripts: result.scripts || [],
    };
  } catch (error) {
    console.error(`Error loading ${type} JSON data:`, error);
    // Return all properties as empty arrays on error
    return {
      aiList: [],
      prompts: [],
      wallpapers: [],
      scripts: [],
    };
  }
}

export function hostnameToURL(hostname) {
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
document.addEventListener("DOMContentLoaded", async () => {
  try {
    resetBtn.addEventListener("click", async () => {
      localStorage.clear();
      await chrome.storage.local.clear();
      await caches.keys().then((keyList) =>
        Promise.all(
          keyList.map((key) => {
            return caches.delete(key);
          })
        )
      );
      await chrome.runtime.sendMessage({
        // Send a message to the background script to remove the contextMenu
        message: "reset",
      });
      showToast("All options and data cleared");
    });
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});
