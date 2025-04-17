// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

async function runAfterFullLoad() {
  console.log("Running query injection.");
  await getTextInput();
}

async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, Mistral } = await chrome.storage.local.get(["query", "Mistral"]);
  await chrome.storage.local.remove("Mistral");
  const searchQuery = (Mistral ? query : "")?.trim();
  if (!searchQuery) return;
  let attempts = 0;
  const attribute = "textarea";
  while (attempts < maxRetries) {
    const element = document.querySelector(attribute);
    console.log(
      `Attempt ${
        attempts + 1
      }: Injecting into ${attribute} with query: ${searchQuery}`
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
        `Element not found: ${attribute}. Retrying after ${retryDelay}ms.`
      );
      attempts++;
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error(
    `Failed to find element ${attribute} after ${maxRetries} attempts.`
  );
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
  chrome.runtime.sendMessage({ buttonClicked: true, engine: "Mistral" });
}
