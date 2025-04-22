// script.js
(async () => setTimeout(runAfterFullLoad, 3000))();

const SELECTORS = {
  AI: "Gemini",
  lastResponse: "GeminiLast",
  textbox: ".textarea",
  send: ".send-button",
  file: "input",
  deep: "button.mat-ripple",
  web: null,
  code: "button.mat-ripple",
  lastHTML: ".response-content",
};
const MAX_COUNTER = 3000;
let counter = 0;
let element;

async function runAfterFullLoad() {
  chrome.storage.local.get(SELECTORS.AI).then(async (e) => {
    let orphan = e[SELECTORS.AI];
    if (!orphan) {
      console.log("Orphan process. Exiting...");
      return;
    }
    console.log("Running query injection.");
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
  });
}
async function getLastResponse() {
  let { [SELECTORS.lastResponse]: getLast } = await chrome.storage.local.get([
    SELECTORS.lastResponse,
  ]);
  await chrome.storage.local.remove(SELECTORS.lastResponse);
  if (!getLast) return;
  let lastResponse = document.querySelectorAll(SELECTORS.lastHTML);
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: SELECTORS.AI,
  });
}
async function getTextInput(maxRetries = 5, retryDelay = 3000) {
  const {
    query,
    time,
    [SELECTORS.AI]: curAI,
  } = await chrome.storage.local.get(["query", "time", SELECTORS.AI]);
  const searchQuery = (curAI ? query : "")?.trim();
  await chrome.storage.local.remove(SELECTORS.AI);
  if (!searchQuery) return;
  const curTime = Date.now();
  if (curTime > time + 1000 * 15) return;
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter

  while (attempts < maxRetries) {
    element = document.querySelector(SELECTORS.textbox);
    console.log(`Attempt ${attempts + 1}: Injecting Query`);

    if (element) {
      element.textContent = searchQuery;
      clickButton();
      return;
    } else {
      console.log(`Element not found. Retrying after ${retryDelay}ms.`);
      attempts++;
      if (attempts < maxRetries) {
        // Check 'stop' condition here
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retry
      }
    }
  }
  console.error(`Failed to find element after ${maxRetries} attempts.`);
  update();
  return;
}

async function clickButton() {
  setTimeout(() => {
    const button = document.querySelector(SELECTORS.send);
    if (button) {
      button.click();
      console.log(`Clicked button: ${button}`);
      update();
    } else {
      console.log(`Button not found.`);
    }
  }, 3000);
  return;
}
async function update() {
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    engine: SELECTORS.AI,
  });
}

async function getButtons() {
  let { deep, code } = await chrome.storage.local.get(["deep", "code"]);
  if (code) {
    document.querySelectorAll(SELECTORS.code)[1].click();
  }
  if (deep) {
    document.querySelectorAll(SELECTORS.deep)[0].click();
  }
}
