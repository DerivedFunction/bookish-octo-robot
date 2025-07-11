// script.js
(async () => setTimeout(runAfterFullLoad, 3000))();
const SELECTORS = fetch("ai-list.json")
  .then((res) => res.json())
  .then((data) => data.selectors);
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

    await getTextInput();
    let { unstable } = await chrome.storage.local.get("unstable");
    if (!unstable) return;
    console.log("Unstable Feature activated. listening...");
    chrome.storage.onChanged.addListener(handleStorageChange);
  });
}
// Listener function to handle storage changes
async function handleStorageChange(changes, areaName) {
  // Only react to changes in the 'local' storage area
  if (areaName !== "local") return;
  if (changes[SELECTORS.kill] && changes[SELECTORS.kill].newValue) {
    console.log("Killing listener...");
    chrome.storage.local.remove(SELECTORS.kill);
    chrome.storage.onChanged.removeListener(handleStorageChange);
    return;
  }

  // Check if the main AI trigger key was added or changed
  // This indicates a potential new query or image task
  if (changes[SELECTORS.AI] && changes[SELECTORS.AI].newValue) {
    await getTextInput(); // This function checks internally if query/time are valid and removes the key if processed.
  }

  // Check if the request to get the last response was added or changed
  if (
    changes[SELECTORS.lastResponse] &&
    changes[SELECTORS.lastResponse].newValue
  ) {
    await getLastResponse(); // This function checks internally and removes the key if processed.
  }
}
async function getLastResponse() {
  let { [SELECTORS.lastResponse]: getLast } = await chrome.storage.local.get(
    SELECTORS.lastResponse
  );
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
  chrome.runtime.sendMessage({ ping: true, name: SELECTORS.AI });
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
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const button = document.querySelector(SELECTORS.send);
  if (button) {
    button.click();
    console.log(`Clicked button: ${button}`);
    update();
  } else {
    console.log(`Button not found.`);
  }
  return;
}
async function update() {
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    engine: SELECTORS.AI,
  });
}
