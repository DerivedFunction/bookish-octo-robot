import { appendImg } from "./appendImage.js";
import { setupTooltip } from "./tooltip.js";

export const widgetBtn = document.getElementById("widget-btn");
const scriptId = "popup"; // Define the ID of the script we want to toggle

// Function to update the button icon based on script registration status
async function updateButtonIcon() {
  try {
    // Attempt to get registered scripts. This call itself might fail if scripting permissions
    // are truly missing or the API isn't ready in some rare edge cases.
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
  } catch (error) {
    // This catch block handles errors from chrome.scripting.getRegisteredContentScripts()
    // if the 'scripting' permission hasn't been granted or the API isn't available yet.
    appendImg({ image: "/assets/images/buttons/noweb.svg" }, widgetBtn);
    widgetBtn.title = "Side widget disabled (permission pending)"; // More informative tooltip
  } finally {
    setupTooltip(widgetBtn); // Ensure tooltip is always set up
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await updateButtonIcon();
});

widgetBtn.addEventListener("click", async () => {
  // Define permissions needed for this specific script
  const permissionsToRequest = {
    permissions: ["scripting"],
    origins: ["*://*/*"], // Keep this specific for popup.js if needed
  };

  try {
    // Check if 'scripting' permission is already granted.
    // This is robust because chrome.permissions API is generally available earlier.
    const hasScriptingPermission = await chrome.permissions.contains({
      permissions: ["scripting"],
    });

    let granted = false;
    if (!hasScriptingPermission) {
      // If 'scripting' permission is NOT globally granted, request it.
      // This is the point where the user will see the permission prompt.
      granted = await chrome.permissions.request(permissionsToRequest);
      if (!granted) {
        console.log(
          "Scripting permission denied by user. Cannot register content script."
        );
        // Update UI to reflect it's still disabled after denial
        await updateButtonIcon();
        return; // Exit if permission isn't granted
      }
      console.log("Scripting permission granted.");
    } else {
      // If scripting permission is already granted, we can proceed.
      granted = true;
    }

    // Now that we know 'scripting' permission is granted, we can reliably
    // check and toggle the *specific* content script.
    if (granted) {
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
        // Register the content script
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
  }
});
