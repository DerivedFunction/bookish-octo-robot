// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  chrome.storage.local.get("HuggingFace").then((e) => {
    orphan = e.HuggingFace;
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
  await getButtons();
  element = document.querySelector("textarea[placeholder='Ask anything']");
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
  let { HuggingFaceLast } = await chrome.storage.local.get(["HuggingFaceLast"]);
  await chrome.storage.local.remove("HuggingFaceLast");
  if (!HuggingFaceLast) return;
  let lastResponse = document.querySelectorAll(
    "[data-message-role='assistant']"
  );
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "HuggingFace",
  });
}
async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, HuggingFace } = await chrome.storage.local.get([
    "query",
    "HuggingFace",
  ]);
  await chrome.storage.local.remove("HuggingFace");
  const searchQuery = (HuggingFace ? query : "")?.trim();

  if (!searchQuery) return;
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter
  while (attempts < maxRetries) {
    element = document.querySelector("textarea[placeholder='Ask anything']");
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
      await clickButton("button[name='submit']");
      return;
    } else {
      element =
        element ||
        document.querySelector("textarea[placeholder='Ask anything']");
      console.log(
        `Element not found: ${attribute}. Retrying after ${retryDelay}ms.`
      );
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
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    content: "",
    engine: "Hug",
  });
}
async function getButtons() {
  let { web } = await chrome.storage.local.get("web");
  if (web) {
    document.querySelector("button.base-tool").click();
  }
}
