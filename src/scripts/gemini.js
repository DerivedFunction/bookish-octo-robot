// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();
let element;
const MAX_COUNTER = 20;
let counter = 0;
async function runAfterFullLoad() {
  console.log("Running query injection.");
  element = document.querySelector(".textarea");
  await getButtons();
  await getTextInput();

  await runWithDelay();
  async function runWithDelay() {
    while (counter++ < MAX_COUNTER) {
      await new Promise((resolve) => setTimeout(resolve, 5000)); // Wait 5 seconds
      await getTextInput();
    }
    console.log("No activity. Stopped listening for queries");
  }
}

async function getTextInput(maxRetries = 5, retryDelay = 3000) {
  let { query, Gemini } = await chrome.storage.local.get(["query", "Gemini"]);
  const searchQuery = (Gemini ? query : "")?.trim();
  await chrome.storage.local.remove("Gemini");
  if (!searchQuery) return;

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
  chrome.runtime.sendMessage({ buttonClicked: true, engine: "Gemini" });
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
