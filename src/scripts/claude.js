// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getTextInput("textContent", "div[enterkeyhint='enter'] p");
}

async function getTextInput(
  type,
  attribute,
  maxRetries = 10,
  retryDelay = 3000
) {
  let { query, queryEngines, Claude } = await chrome.storage.local.get([
    "query",
    "queryEngines",
    "Claude",
  ]);
  const searchQuery = (queryEngines && Claude ? queryEngines : query)?.trim();
  if (!searchQuery) return;

  let attempts = 0;

  while (attempts < maxRetries) {
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${
        attempts + 1
      }: Injecting ${element} via ${type} of query: ${searchQuery}`
    );

    if (element) {
      switch (type) {
        case "value":
          element.value = searchQuery;
          break;
        case "textContent":
          element.textContent = searchQuery;
          break;
      }
      clickButton("button[aria-label='Send message']");
      return;
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
      chrome.storage.local.remove("query");
      chrome.storage.local.remove("Claude");
      button.click();
      console.log(`Clicked button: ${attribute}`);
      // Send a message after the button click
      chrome.runtime.sendMessage(
        { buttonClicked: true, engine: "Claude" },
        function (response) {
          if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError);
          } else {
            console.log("Button clicked message sent, response:", response);
          }
        }
      );
    } else {
      console.log(`Button not found: ${attribute}`);
    }
  }, 1000);
  return;
}
