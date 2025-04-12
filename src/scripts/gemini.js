// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

async function runAfterFullLoad() {
  console.log("Running query injection.");
  let { query } = await chrome.storage.local.get("query");
  const currentUrl = window.location.href;
  if (!query || query.trim().length === 0 || query === undefined) return;

  await getTextInput(query, "textContent", ".ql-editor.textarea.new-input-ui");
  clickButton(".send-button");
}

async function getTextInput(
  query,
  type,
  attribute,
  maxRetries = 20,
  retryDelay = 3000
) {
  let attempts = 0;
  let x = query.trim();

  while (attempts < maxRetries) {
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${attempts + 1}: Injecting ${element} via ${type} of query: ${x}`
    );

    if (element) {
      switch (type) {
        case "value":
          element.value = x;
          break;
        case "textContent":
          element.textContent = x;
          break;
      }
      return; // Exit if element is found and updated
    } else {
      console.log(
        `Element not found: ${attribute}. Retrying after ${retryDelay}ms.`
      );
      attempts++;
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retry
      }
    }
  }

  console.error(
    `Failed to find element ${attribute} after ${maxRetries} attempts.`
  );
}

async function clickButton(attribute) {
  setTimeout(() => {
    const button = document.querySelector(attribute);
    if (button) {
      chrome.storage.local.remove("query"); // No need for await here; handle async separately if needed
      button.click();
      console.log(`Clicked button: ${attribute}`);
    } else {
      console.log(`Button not found: ${attribute}`);
    }
  }, 1000);
}
