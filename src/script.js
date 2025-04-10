// script.js
(async () => {
  setTimeout(await runAfterFullLoad(), 1000);
})();
async function runAfterFullLoad() {
  console.log("Running query injection.");
  let { query } = await chrome.storage.local.get("query");
  const currentUrl = window.location.href;
  if (!query || query.trim().length === 0 || query === undefined) return;
  if (currentUrl === "https://gemini.google.com/app") {
    // New chat
    await getTextInput(
      query,
      "textContent",
      ".ql-editor.textarea.new-input-ui"
    );
    clickButton(".send-button");
  }
}

async function getTextInput(query, type, attribute) {
  let x = query.trim();
  const element = document.querySelector(attribute);
  console.log(`Injecting ${element} via ${type} of query: ${x}`);
  if (element) {
    switch (type) {
      case "value":
        element.value = x;
        break;
      case "textContent":
        element.textContent = x;
        break;
    }
  } else {
    console.error(`Element not found: ${attribute}. Running again.`);
    setTimeout(await runAfterFullLoad(), 1000);
  }
}

async function clickButton(attribute) {
  setTimeout(async () => {
    const button = document.querySelector(attribute);
    if (button) {
      await chrome.storage.local.remove("query");
      button.click();
    } else {
      console.error(`Button not found: ${attribute}`);
    }
  }, 1000);
}
