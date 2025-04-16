// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

let stop = false;

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.stopLoop) {
    if (request.engine === "DeepSeek") {
      stop = true;
      console.log("Loop stop signal received.");
      sendResponse({ received: true });
    }
  }
});

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getTextInput();
}

async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, DeepSeek } = await chrome.storage.local.get([
    "query",
    "DeepSeek",
  ]);
  await chrome.storage.local.remove("DeepSeek"); //remove immediately off the queue
  const searchQuery = (DeepSeek ? query : "")?.trim();

  if (!searchQuery) return;

  let attempts = 0;
  const attribute = "#chat-input";
  while (attempts < maxRetries && !stop) {
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${
        attempts + 1
      }: Injecting into ${attribute} with query: ${searchQuery}`
    );

    if (element) {
      // Simulate input for React compatibility
      let lastValue = element.value || "";
      element.value = searchQuery;

      let event = new Event("input", { bubbles: true });
      event.simulated = true; // Hack for React 15

      // Hack for React 16+ _valueTracker
      let tracker = element._valueTracker;
      if (tracker) {
        tracker.setValue(lastValue);
      }
      element.dispatchEvent(event);

      await clickButton("._7436101");
      return;
    } else {
      console.log(
        `Element not found: ${attribute}. Retrying after ${retryDelay}ms.`
      );
      attempts++;
      if (attempts < maxRetries && !stop) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  if (stop) {
    console.log("Loop stopped by external signal.");
  } else {
    console.error(
      `Failed to find element ${attribute} after ${maxRetries} attempts.`
    );
    update();
  }
}

async function clickButton(attribute) {
  let attempts = 0;
  const maxRetries = 10;
  const intervalMs = 3000; // 3 seconds

  while (attempts < maxRetries && !stop) {
    const button = document.querySelector(attribute);
    if (button && !button.disabled) {
      button.click();
      console.log(`Clicked button: ${attribute}`);
      update();
      return; // Exit after successful click
    }

    // Wait 3 seconds before the next attempt
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    attempts++;
    console.log(`Attempt ${attempts} of ${maxRetries} failed, retrying...`);
  }

  console.log(
    `Max retries (${maxRetries}) reached or stopped for button: ${attribute}`
  );
  update();
}

async function update() {
  await chrome.storage.local.remove("DeepSeek");
  // Send a message after the button click
  chrome.runtime.sendMessage({ buttonClicked: true, engine: "DeepSeek" });
}
