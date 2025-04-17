// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getButtons();
  await getTextInput("textContent", ".ql-editor.textarea.new-input-ui");
}

async function getTextInput(
  type,
  attribute,
  maxRetries = 5,
  retryDelay = 3000
) {
  let { query, Gemini } = await chrome.storage.local.get(["query", "Gemini"]);
  const searchQuery = (Gemini ? query : "")?.trim();
  await chrome.storage.local.remove("Gemini");
  if (!searchQuery) return;

  let attempts = 0;

  while (attempts < maxRetries) {
    // Check 'stop' condition here
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${
        attempts + 1
      }: Injecting ${element} via ${type} of query: ${searchQuery}`
    );

    if (element) {
      switch (type) {
        case "value":
          element.value = searchQuery;
          break;
        case "textContent":
          element.textContent = searchQuery;
          break;
      }
      clickButton(".send-button");
      return;
    } else {
      console.log(
        `Element not found: ${attribute}. Retrying after ${retryDelay}ms.`
      );
      attempts++;
      if (attempts < maxRetries) {
        // Check 'stop' condition here
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retry
      }
    }
  }
  console.error(
    `Failed to find element ${attribute} after ${maxRetries} attempts.`
  );
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
