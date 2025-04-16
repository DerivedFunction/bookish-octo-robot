// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

let stop = false;

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.stopLoop) {
    if (request.engine === "Gemini") {
      stop = true;
      console.log("Loop stop signal received.");
      sendResponse({ received: true }); // Optional: Send a response back
    }
  }
});

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getTextInput("textContent", ".ql-editor.textarea.new-input-ui");
}

async function getTextInput(
  type,
  attribute,
  maxRetries = 5,
  retryDelay = 3000
) {
  let { query, Gemini } = await chrome.storage.local.get(["query", "Gemini"]);
  const searchQuery = (Gemini ? query : "")?.trim();
  await chrome.storage.local.remove("Gemini");
  if (!searchQuery) return;

  let attempts = 0;

  while (attempts < maxRetries && !stop) {
    // Check 'stop' condition here
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
      clickButton(".send-button");
      return;
    } else {
      console.log(
        `Element not found: ${attribute}. Retrying after ${retryDelay}ms.`
      );
      attempts++;
      if (attempts < maxRetries && !stop) {
        // Check 'stop' condition here
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retry
      }
    }
  }

  if (stop) {
    console.log("Loop stopped by external signal.");
  } else {
    console.error(
      `Failed to find element ${attribute} after ${maxRetries} attempts.`
    );
    return;
  }
}

async function clickButton(attribute) {
  setTimeout(() => {
    const button = document.querySelector(attribute);
    if (button) {
      button.click();
      console.log(`Clicked button: ${attribute}`);
      update();
    } else {
      console.log(`Button not found: ${attribute}`);
    }
  }, 1000);
  return;
}
async function update() {
  // Send a message after the button click
  chrome.runtime.sendMessage({ buttonClicked: true, engine: "Gemini" });
}
