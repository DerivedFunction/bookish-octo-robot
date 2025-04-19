// script.js
(async () => {
  chrome.storage.local.get("Gemini").then((e) => {
    orphan = e.Gemini;
  });
  setTimeout(runAfterFullLoad, 3000);
})();
let element;
const MAX_COUNTER = 3000;
let counter = 0;
// if it was opened
let orphan;
async function runAfterFullLoad() {
  if (!orphan) {
    console.log("Orphan process. Exiting...");
    return;
  }
  console.log("Running query injection.");
  element = document.querySelector(".textarea");
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
async function getLastResponse() {
  let { GeminiLast } = await chrome.storage.local.get(["GeminiLast"]);
  await chrome.storage.local.remove("GeminiLast");
  if (!GeminiLast) return;
  let lastResponse = document.querySelectorAll(".response-content");
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "Gemini",
  });
}
async function getTextInput(maxRetries = 5, retryDelay = 3000) {
  let { query, Gemini } = await chrome.storage.local.get(["query", "Gemini"]);
  const searchQuery = (Gemini ? query : "")?.trim();
  await chrome.storage.local.remove("Gemini");
  if (!searchQuery) return;
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter

  while (attempts < maxRetries) {
    element = document.querySelector(".textarea");
    console.log(
      `Attempt ${attempts + 1}: Injecting ${element} via query: ${searchQuery}`
    );

    if (element) {
      element.textContent = searchQuery;
      clickButton(".send-button");
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
    engine: "Gemini",
  });
}

async function getButtons() {
  let { deep, code } = await chrome.storage.local.get(["deep", "code"]);
  if (code) {
    document.querySelectorAll("button.mat-ripple")[1].click();
  }
  if (deep) {
    document.querySelectorAll("button.mat-ripple")[0].click();
  }
}
