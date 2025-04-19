// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  chrome.storage.local.get("Qwen").then((e) => {
    orphan = e.Qwen;
  });
  setTimeout(runAfterFullLoad, 3000);
})();

const MAX_COUNTER = 3000;
let counter = 0;
let element;
// if it was opened
let orphan;

async function getLastResponse() {
  let { QwenLast } = await chrome.storage.local.get(["QwenLast"]);
  await chrome.storage.local.remove("QwenLast");
  if (!QwenLast) return;
  let lastResponse = document.querySelectorAll(
    "div.ds-markdown.ds-markdown--block"
  );
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "Qwen",
  });
}
async function runAfterFullLoad() {
  if (!orphan) {
    console.log("Orphan process. Exiting...");
    return;
  }
  console.log("Running query injection.");
  element = document.querySelector("textarea");
  await getButtons();
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

async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, Qwen } = await chrome.storage.local.get(["query", "Qwen"]);
  await chrome.storage.local.remove("Qwen"); //remove immediately off the queue
  const searchQuery = (Qwen ? query : "")?.trim();

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

      await clickButton("#send-message-button");
      return;
    } else {
      console.log(`Element not found. Retrying after ${retryDelay}ms.`);
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

async function update() {
  await chrome.storage.local.remove("Qwen");
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    content: "",
    engine: "Qwen",
  });
}
async function getButtons() {
  let { deep, web } = await chrome.storage.local.get(["deep", "web"]);
  let buttons = document.querySelectorAll(".operationBtn button");
  if (web) {
    buttons[1].click();
  }
  if (deep) {
    buttons[0].click();
  }
}
