// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  chrome.storage.local.get("Perplexity").then((e) => {
    orphan = e.Perplexity;
  });
  setTimeout(runAfterFullLoad, 3000);
})();

const MAX_COUNTER = 3000;
let counter = 0;
let element;
// if it was opened
let orphan;
async function runAfterFullLoad() {
  if (!orphan) {
    console.log("Orphan process. Exiting...");
    return;
  }
  console.log("Running query injection.");
  element = document.querySelector("textarea");
  await getTextInput();
  let { unstable } = await chrome.storage.local.get("unstable");
  if (!unstable) return;
  console.log("Unstable Feature activated. listening...");
  await runWithDelay();
  async function runWithDelay() {
    while (counter++ < MAX_COUNTER) {
      await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 5 seconds
      await getTextInput();
      await getLastResponse();
    }
    console.log("No activity. Stopped listening for queries");
  }
}
async function getLastResponse() {
  let { PerplexityLast } = await chrome.storage.local.get(["PerplexityLast"]);
  await chrome.storage.local.remove("PerplexityLast");
  if (!PerplexityLast) return;
  let lastResponse = document.querySelectorAll("div.prose");
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].textContent;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "Perplexity",
  });
}
async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, Perplexity } = await chrome.storage.local.get([
    "query",
    "Perplexity",
  ]);
  await chrome.storage.local.remove("Perplexity");
  const searchQuery = (Perplexity ? query : "")?.trim();

  if (!searchQuery) return;
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter
  while (attempts < maxRetries) {
    element = document.querySelector("textarea");
    console.log(
      `Attempt ${
        attempts + 1
      }: Injecting into ${element} with query: ${searchQuery}`
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

      await clickButton("button[aria-label='Submit']");
      return;
    } else {
      element = element || document.querySelector("textarea");
      console.log(`Element not found: Retrying after ${retryDelay}ms.`);
      attempts++;
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error(`Failed to find element after ${maxRetries} attempts.`);
  update();
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
  }, 3000);
  return;
}
function update() {
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    engine: "Perplexity",
  });
}
