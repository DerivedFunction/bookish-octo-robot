import { appendImg } from "./appendImage.js";

export const widgetBtn = document.getElementById("widget-btn");
document.addEventListener("DOMContentLoaded", () => {
  appendImg({ image: "/assets/images/buttons/web.svg" }, widgetBtn);
});

widgetBtn.addEventListener("click", async () => {
  // Get permission to inject popup.js on all future websites
  await chrome.permissions.request({
    permissions: ["scripting"],
    origins: ["*://*/*"],
  });

  await chrome.scripting.registerContentScripts([
    {
      id: "popup",
      matches: ["*://*/*"],
      js: ["/scripts/popup.js"],
      runAt: "document_end",
      allFrames: true,
    },
  ]);
});
