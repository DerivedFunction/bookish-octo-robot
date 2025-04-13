// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

let stop = false;

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.stopLoop) {
    stop = true;
    console.log("Loop stop signal received.");
    sendResponse({ received: true });
  }
});

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getTextInput();
}

async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query } = await chrome.storage.local.get("query");
  if (!query || query.trim().length === 0 || query === undefined) return;
  let attempts = 0;
  let x = query.trim();
  const attribute = "textarea";
  while (attempts < maxRetries && !stop) {
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${attempts + 1}: Injecting into ${attribute} with query: ${x}`
    );

    if (element) {
      // Simulate input for React compatibility
      let lastValue = element.value || "";
      element.value = x;

      let event = new Event("input", { bubbles: true });
      event.simulated = true; // Hack for React 15

      // Hack for React 16+ _valueTracker
      let tracker = element._valueTracker;
      if (tracker) {
        tracker.setValue(lastValue);
      }
      element.dispatchEvent(event);

      await clickButton("button[type='submit']");
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
  }
}

async function clickButton(attribute) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const button = document.querySelector(attribute);
      if (button) {
        chrome.storage.local.remove("query");
        button.click();
        console.log(`Clicked button: ${attribute}`);
        // Send a message after the button click
        chrome.runtime.sendMessage(
          { buttonClicked: true },
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
      resolve();
    }, 1000);
  });
}
