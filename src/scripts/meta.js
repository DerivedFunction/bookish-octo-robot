// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

let stop = false;

// Listen for messages from other scripts
chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
  if (request.stopLoop) {
    stop = true;
    console.log("Loop stop signal received.");
    sendResponse({ received: true }); // Optional: Send a response back
  }
});

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getTextInput("textContent", "div[aria-placeholder='Ask Meta AI...'] p");
}

async function getTextInput(
  type,
  attribute,
  maxRetries = 10,
  retryDelay = 3000
) {
  let { query } = await chrome.storage.local.get("query");
  if (!query || query.trim().length === 0 || query === undefined) return;
  let attempts = 0;
  let x = query.trim();

  while (attempts < maxRetries && !stop) {
    // Check 'stop' condition here
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${attempts + 1}: Injecting ${element} via ${type} of query: ${x}`
    );

    if (element) {
      let span = document.createElement("span");
      span.setAttribute("data-lexical-text", true);
      span.textContent = x;
      element.appendChild(span);
      clickButton("div[aria-label='Send Message']");
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
  }
}

async function clickButton(attribute) {
  setTimeout(() => {
    const button = document.querySelector(attribute);
    if (button) {
      chrome.storage.local.remove("query");
      button.click();
      console.log(`Clicked button: ${attribute}`);
      // Send a message after the button click
      chrome.runtime.sendMessage({ buttonClicked: true }, function (response) {
        if (chrome.runtime.lastError) {
          console.error(chrome.runtime.lastError);
        } else {
          console.log("Button clicked message sent, response:", response);
        }
      });
    } else {
      console.log(`Button not found: ${attribute}`);
    }
  }, 1000);
  return;
}
