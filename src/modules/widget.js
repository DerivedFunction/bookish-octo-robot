import { appendImg } from "./appendImage.js";
import { setupTooltip } from "./tooltip.js";

export const widgetBtn = document.getElementById("widget-btn");
const scriptId = "popup"; // Define the ID of the script we want to toggle
let hasPopup = false;

// Function to update the button icon based on script registration status
export async function updateButtonIcon() {
  try {
    // Attempt to get registered scripts. This call itself might fail if scripting permissions
    // are truly missing or the API isn't ready in some rare edge cases.
    const registeredScripts =
      await chrome.scripting.getRegisteredContentScripts();
    const isScriptRegistered = registeredScripts.some(
      (script) => script.id === scriptId
    );
    hasPopup = isScriptRegistered;
    if (isScriptRegistered) {
      appendImg({ image: "/assets/images/buttons/web.svg" }, widgetBtn); // Script is enabled, show 'web.svg'
    } else {
      appendImg({ image: "/assets/images/buttons/noweb.svg" }, widgetBtn); // Script is disabled, show 'noweb.svg'
    }
  } catch (error) {
    // This catch block handles errors from chrome.scripting.getRegisteredContentScripts()
    // if the 'scripting' permission hasn't been granted or the API isn't available yet.
    hasPopup = false;
    appendImg({ image: "/assets/images/buttons/noweb.svg" }, widgetBtn);
    widgetBtn.title = "Side widget disabled (permission pending)"; // More informative tooltip
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await updateButtonIcon();
  setupTooltip(widgetBtn);
});

widgetBtn.addEventListener("click", async () => {
  try {
    // Now that we know 'scripting' permission is granted, we can reliably

    if (hasPopup) {
      // If the script is registered, unregister it
      await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
      console.log(`Content script '${scriptId}' unregistered.`);
      hasPopup = false;
    } else {
      // Register the content script
      const granted = await chrome.permissions.request({
        permissions: ["scripting"],
        origins: ["*://*/*"],
      });
      if (granted)
        try {
          await chrome.scripting.registerContentScripts([
            {
              id: scriptId,
              matches: ["*://*/*"],
              js: ["/scripts/popup.js"],
              runAt: "document_end",
              allFrames: true,
            },
          ]);
          console.log(`Content script '${scriptId}' registered.`);
          hasPopup = true;
        } catch (error) {
          console.log("Script registration failed:", error);
        }
    }
  } catch (error) {
    // This catch block handles errors during the permission request or content script operations.
    // E.g., if chrome.scripting or chrome.permissions themselves become unavailable unexpectedly,
    // though this is less common for click events than for initial load.
    console.error("An unexpected error occurred during script toggle:", error);
    // Ensure the icon reflects a disabled state if an error prevents toggling
    appendImg({ image: "/assets/images/buttons/noweb.svg" }, widgetBtn);
    widgetBtn.title = "Error toggling side widget";
  } finally {
    // Always update the button icon to reflect the final state after the click action
    await updateButtonIcon();
    chrome.runtime.sendMessage({
      message: "updatePopup"
    })
  }
});

chrome.runtime.onMessage.addListener((request) => {
  if (request.message === "updatePopup") {
    updateButtonIcon();
  }
})
