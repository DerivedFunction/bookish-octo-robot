// script.js
(async () => {
  console.log("Script injected");
  await runAfterFullLoad();
})();
async function runAfterFullLoad() {
  console.log("Content script injected and running on:", window.location.href);
  let { query } = await chrome.storage.local.get("query");
  const currentUrl = window.location.href;
  console.log(currentUrl, query);

  if (!query || query.trim().length === 0 || query === undefined) return;

  if (currentUrl.includes("gemini.google.com/app")) {
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
  if (element !== undefined) {
    switch (type) {
      case "value":
        element.value = x;
        break;
      case "innerHTML":
        element.innerHTML = x;
        break;
      case "textContent":
        element.textContent = x;
        break;
    }
  } else {
    console.error(`Element not found: ${attribute}. Running again.`);
    await runAfterFullLoad();
  }
}

function clickButton(attribute) {
  setTimeout(async () => {
    const button = document.querySelector(attribute);
    if (button) {
      button.click();
      await chrome.storage.local.remove("query");
    } else {
      console.error(`Button not found: ${attribute}`);
    }
  }, 1000);
}
