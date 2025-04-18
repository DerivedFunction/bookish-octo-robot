// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  chrome.storage.local.get("Mistral").then((e) => {
    orphan = e.Mistral;
  });
  setTimeout(runAfterFullLoad, 3000);
})();

const MAX_COUNTER = 300;
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
  await getTextInput();
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
  let { MistralLast } = await chrome.storage.local.get(["MistralLast"]);
  await chrome.storage.local.remove("MistralLast");
  if (!MistralLast) return;
  let lastResponse = document.querySelectorAll("div[dir='auto']");
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "Mistral",
  });
}
async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, Mistral } = await chrome.storage.local.get(["query", "Mistral"]);
  await chrome.storage.local.remove("Mistral");
  const searchQuery = (Mistral ? query : "")?.trim();
  if (!searchQuery) return;
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

      await clickButton("button[type='submit']");
      return;
    } else {
      console.log(
        `Element not found: ${element}. Retrying after ${retryDelay}ms.`
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
  chrome.runtime.sendMessage({
    buttonClicked: true,
    content: "",
    engine: "Mistral",
  });
}
