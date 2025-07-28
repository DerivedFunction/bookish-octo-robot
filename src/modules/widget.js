import { appendImg } from "./appendImage.js";
import { setupTooltip } from "./tooltip.js";

export const widgetBtn = document.getElementById("widget-btn");
const scriptId = "popup"; // Define the ID of the script we want to toggle

// Function to update the button icon based on script registration status
async function updateButtonIcon() {
  const registeredScripts =
    await chrome.scripting.getRegisteredContentScripts();
  const isScriptRegistered = registeredScripts.some(
    (script) => script.id === scriptId
  );

  if (isScriptRegistered) {
    appendImg({ image: "/assets/images/buttons/web.svg" }, widgetBtn); // Script is enabled, show 'web.svg'
  } else {
    appendImg({ image: "/assets/images/buttons/noweb.svg" }, widgetBtn); // Script is disabled, show 'noweb.svg'
  }
  
}

document.addEventListener("DOMContentLoaded", async () => {
  setupTooltip(widgetBtn); // Re-setup tooltip if text changes
  // Initial setup of the button icon when the DOM is loaded
  await updateButtonIcon();
});

widgetBtn.addEventListener("click", async () => {
  // For a reliable check, we should get all registered scripts and see if ours is among them.
  const registeredScripts =
    await chrome.scripting.getRegisteredContentScripts();
  const isScriptRegistered = registeredScripts.some(
    (script) => script.id === scriptId
  );

  if (isScriptRegistered) {
    // If the script is registered, unregister it
    await chrome.scripting.unregisterContentScripts({ ids: [scriptId] });
    console.log(`Content script '${scriptId}' unregistered.`);
  } else {
    // If the script is NOT registered, request 'scripting' permission (if not already granted)
    // and then register the script.
    const permissionsToRequest = {
      permissions: ["scripting"],
      origins: ["*://*/*"],
    };

    // Check if 'scripting' permission already exists
    const hasScriptingPermission = await chrome.permissions.contains({
      permissions: ["scripting"],
    });

    if (!hasScriptingPermission) {
      const granted = await chrome.permissions.request(permissionsToRequest);
      if (!granted) {
        console.log(
          "Scripting permission denied. Cannot register content script."
        );
        return; // Exit if permission isn't granted
      }
      console.log("Scripting permission granted.");
    }

    // Now, register the content script
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
  }

  // After every click (toggle), update the button icon to reflect the new state
  await updateButtonIcon();
});
