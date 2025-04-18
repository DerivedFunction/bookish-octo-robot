// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  chrome.storage.local.get("DeepSeek").then((e) => {
    orphan = e.DeepSeek;
  });
  setTimeout(runAfterFullLoad, 3000);
})();

const MAX_COUNTER = 300;
let counter = 0;
let element;
// if it was opened
let orphan;

async function getLastResponse() {
  let { DeepSeekLast } = await chrome.storage.local.get(["DeepSeekLast"]);
  await chrome.storage.local.remove("DeepSeekLast");
  if (!DeepSeekLast) return;
  let lastResponse = document.querySelectorAll(
    "div.ds-markdown.ds-markdown--block"
  );
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "DeepSeek",
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
  let { query, DeepSeek } = await chrome.storage.local.get([
    "query",
    "DeepSeek",
  ]);
  await chrome.storage.local.remove("DeepSeek"); //remove immediately off the queue
  const searchQuery = (DeepSeek ? query : "")?.trim();

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

      await clickButton("._7436101");
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
  await chrome.storage.local.remove("DeepSeek");
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    content: "",
    engine: "DeepSeek",
  });
}
async function getButtons() {
  let { deep, web } = await chrome.storage.local.get(["deep", "web"]);
  if (web) {
    document.querySelectorAll("div.ds-button")[1].click();
  }
  if (deep) {
    document.querySelectorAll("div.ds-button")[0].click();
  }
}
