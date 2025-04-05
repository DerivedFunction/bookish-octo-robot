import "./modules/index.js";
export function toggleButton(button, enabled) {
  button.disabled = !enabled;
  if (enabled) button.classList.add("enabled");
  else button.classList.remove("enabled");
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

    // Ensure all properties are defined, even if not requested
    return {
      aiList: result.aiList || [],
      prompts: result.prompts || [],
      wallpapers: result.wallpapers || [],
    };
  } catch (error) {
    console.error(`Error loading ${type} JSON data:`, error);
    // Return all properties as empty arrays on error
    return {
      aiList: [],
      prompts: [],
      wallpapers: [],
    };
  }
}
document.addEventListener("DOMContentLoaded", async () => {
  try {
    document.getElementById("reset").addEventListener("click", async () => {
      localStorage.clear();
      if (chrome && chrome.permissions) {
        await chrome.permissions.remove({
          permissions: ["clipboardRead"],
        });
      }
    });
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});
