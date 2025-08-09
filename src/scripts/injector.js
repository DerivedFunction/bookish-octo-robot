// Universal Script Injector
(async () => {
  const response = await fetch(new URL(chrome.runtime.getURL("ai-list.json")));
  if (!response.ok) {
    throw new Error("Failed to load AI list data");
  }
  const data = await response.json();
  const url = new URL(window.location.href);
  const urlHostname = url.hostname.replace("www.", "");
  const aiConfig = data["ai-list"].find((ai) => ai.url.includes(urlHostname));

  // Handle multiple selector configurations
  selectorConfigs = [
    {
      scriptType: "react",
    },
    {
      scriptType: "contenteditable",
    },
  ];
  SELECTORS = aiConfig.selectors;
  SELECTORS.kill = `${SELECTORS.AI}Kill`;
  SELECTORS.lastResponse = `${SELECTORS.AI}Last`;
  SCRIPT_TYPE = selectorConfigs[0].scriptType;

  // Parse the url for the 'prompt' parameter
  const prompt = new URLSearchParams(url.search).get("prompt");
  if (prompt) {
    await chrome.storage.local.set({
      [SELECTORS.AI]: true,
      query: prompt,
      time: Date.now(),
    });
  }
  chrome.storage.local.get("delay").then((e) => {
    DELAY = e.delay ?? 3000;
    console.log("Delay set", DELAY);
    setTimeout(runAfterFullLoad);
  });
})();

let SELECTORS;
let SCRIPT_TYPE;
let counter = 0;
let element;
let DELAY;
let currentSelectorIndex = 0;
let selectorConfigs = [];

async function runAfterFullLoad() {
  chrome.storage.local.get(SELECTORS.AI).then(async (e) => {
    let orphan = e[SELECTORS.AI];
    if (!orphan) {
      console.log("Orphan process. Exiting...");
      return;
    }
    console.log("Running query injection.");
    chrome.runtime.sendMessage({ ping: true, name: SELECTORS.AI });
    await Promise.resolve(new Promise((resolve) => setTimeout(resolve, DELAY)));
    await getImage();
    await getTextInput();
    let { unstable } = await chrome.storage.local.get("unstable");
    if (!unstable) return;
    console.log("Unstable Feature activated. listening...");
    await chrome.storage.local.remove(SELECTORS.kill);
    chrome.storage.onChanged.addListener(handleStorageChange);
  });
}

async function handleStorageChange(changes, areaName) {
  if (areaName !== "local") return;
  if (changes[SELECTORS.kill] && changes[SELECTORS.kill].newValue) {
    console.log("Killing listener...");
    chrome.storage.local.remove(SELECTORS.kill);
    chrome.storage.onChanged.removeListener(handleStorageChange);
    return;
  }
  if (changes[SELECTORS.AI] && changes[SELECTORS.AI].newValue) {
    chrome.runtime.sendMessage({ ping: true, name: SELECTORS.AI });
    await getImage();
    await getTextInput();
  }
  if (
    changes[SELECTORS.lastResponse] &&
    changes[SELECTORS.lastResponse].newValue
  ) {
    watchForResponseCompletion();
  }
}
let lastFinalHTML = {};
let finalComputedHTML = {};

async function getLastResponse() {
  const finalHTML = {};
  let hasChanges = false;
  const finalElement = document.createElement("div");

  for (const element of Array.from(SELECTORS.lastHTML)) {
    const sourceElements = document.querySelectorAll(
      `${element.trim().replace("/", "\\/")}`
    );
    const sourceElement = sourceElements[sourceElements.length - 1];

    if (!sourceElement) continue;

    const currentHTML = sourceElement.innerHTML;
    finalHTML[element] = currentHTML;

    if (lastFinalHTML[element] === currentHTML) {
      finalElement.appendChild(finalComputedHTML[element].cloneNode(true));
      continue;
    }

    // Change detected
    hasChanges = true;

    const newElement = document.createElement("div");

    function applyComputedStyles(source, target) {
      const computedStyles = window.getComputedStyle(source);
      for (let i = 0; i < computedStyles.length; i++) {
        const property = computedStyles[i];
        let value = computedStyles.getPropertyValue(property);

        if (property.startsWith("padding") || property.startsWith("margin")) {
          const numericValue = parseFloat(value);
          const threshold = 8;
          value =
            !isNaN(numericValue) && numericValue > threshold
              ? `${threshold}px`
              : value;
        }
        target.style[property] = value;
      }

      target.className = "";
      target.innerHTML = source.innerHTML;

      const sourceChildren = source.children;
      const targetChildren = target.children;
      for (let i = 0; i < sourceChildren.length; i++) {
        applyComputedStyles(sourceChildren[i], targetChildren[i]);
      }
    }

    applyComputedStyles(sourceElement, newElement);
    finalComputedHTML[element] = newElement;
    lastFinalHTML[element] = currentHTML;
    finalElement.appendChild(newElement);
  }

  if (hasChanges) {
    chrome.runtime.sendMessage({
      lastResponse: finalElement.innerHTML,
      engine: SELECTORS.AI,
    });
  } else {
    console.log("No changes detected")
  }
}

async function getTextInput(maxRetries = 15, retryDelay = DELAY) {
  const {
    query,
    time,
    [SELECTORS.AI]: curAI,
  } = await chrome.storage.local.get(["query", "time", SELECTORS.AI]);
  await chrome.storage.local.remove(SELECTORS.AI);
  const searchQuery = (curAI ? query : "")?.trim();

  if (!searchQuery) return;
  const curTime = Date.now();
  if (curTime > time + 1000 * 15) return;

  let attempts = 0;
  counter = 0;
  let success = false;

  while (attempts < maxRetries) {
    // Try each selector configuration in turn
    for (let i = 0; i < selectorConfigs.length; i++) {
      const currentConfig =
        selectorConfigs[(currentSelectorIndex + i) % selectorConfigs.length];
      const selector =
        currentConfig.scriptType === "contenteditable"
          ? "div[contenteditable='true']"
          : "textarea";
      element = document.querySelector(selector);
      console.log(
        `Attempt ${attempts + 1}, Config ${
          ((currentSelectorIndex + i) % selectorConfigs.length) + 1
        }: Injecting Query`
      );

      if (element) {
        switch (currentConfig.scriptType) {
          case "react":
            // React-specific input handling
            let lastValue = element.value || "";
            element.value = searchQuery;

            let event = new Event("input", { bubbles: true });
            event.simulated = true;

            let tracker = element._valueTracker;
            if (tracker) {
              tracker.setValue(lastValue);
            }
            element.dispatchEvent(event);
            break;

          case "contenteditable":
            element.focus();
            // Try meta injection first
            const beforeInputEvent = new InputEvent("beforeinput", {
              inputType: "insertText",
              data: searchQuery,
              bubbles: true,
              cancelable: true,
            });
            element.dispatchEvent(beforeInputEvent);
            const cleanupFn = getMetaListener();

            // Check if text was injected (use innerText/textContent to see visible text)
            setTimeout(() => {
              const visibleText = element.innerText || element.textContent;
              if (!visibleText?.includes(searchQuery)) {
                // Fallback to direct textContent if meta injection failed
                element.textContent = searchQuery;
                const inputEvent = new InputEvent("input", {
                  inputType: "insertText",
                  data: searchQuery,
                  bubbles: true,
                  cancelable: true,
                });
                element.dispatchEvent(inputEvent);
              }
            }, 100); // Small delay to check injection

            // Schedule cleanup after button click
            setTimeout(cleanupFn, 2000); // Delay cleanup until after button click (1s) + extra time
            break;
        }

        let clicked = await clickButton();
        if (clicked) {
          // Remember successful configuration for next time
          currentSelectorIndex =
            (currentSelectorIndex + i) % selectorConfigs.length;
          success = true;
          return;
        }
      }
    }

    if (!success) {
      console.log(`No configuration worked. Retrying after ${retryDelay}ms.`);
      attempts++;
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }
  }

  console.error(`Failed to find element after ${maxRetries} attempts.`);
  update();
}

function getMetaListener() {
  let insertedNode = null;

  const listener = (event) => {
    if (event.inputType === "insertText") {
      event.preventDefault();
      const newText = event.data;
      const selection = window.getSelection();

      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        const textNode = document.createTextNode(newText);
        range.insertNode(textNode);
        insertedNode = textNode;
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        const textNode = document.createTextNode(newText);
        element.appendChild(textNode);
        insertedNode = textNode;
      }
    }
  };

  element?.addEventListener("beforeinput", listener);

  // Return cleanup function that removes both the listener and the node
  return () => {
    element?.removeEventListener("beforeinput", listener);
    if (insertedNode?.parentNode) {
      insertedNode.parentNode.removeChild(insertedNode);
    }
  };
}

async function clickButton() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const button = document.querySelector(SELECTORS.send);
  if (button) {
    button.click();
    console.log(`Clicked button: ${button}`);
    update();
    watchForResponseCompletion();
    return true;
  } else {
    console.log(`Button not found`);
    return false;
  }
}

let countdown = 10;
let intervalId = null; // Store the interval ID to manage it globally

const poll = async () => {
  await getLastResponse();
  countdown--;
  if (countdown === 0) {
    // Clear the interval when countdown reaches 0
    clearInterval(intervalId);
    intervalId = null; // Reset the interval ID
    return;
  }
};

const startPolling = () => {
  if (!intervalId) {
    // Ensure only one interval is running
    intervalId = setInterval(poll, DELAY);
  }
};

function watchForResponseCompletion() {
  countdown += 10;
  if (countdown > 0 && !intervalId) {
    // Restart polling if countdown is reset and no interval is running
    startPolling();
  }
}

function update() {
  chrome.runtime.sendMessage({
    buttonClicked: true,
    engine: SELECTORS.AI,
  });
}

async function getImage() {
  const { [SELECTORS.AI]: curAI } = await chrome.storage.local.get(
    SELECTORS.AI
  );
  const STORAGE_KEY_PREFIX = "pasted-file-";
  const fileUploadInput = document.querySelector("input[type='file']");
  if (!curAI || !fileUploadInput || SELECTORS.noFile) return;
  const dataTransfer = new DataTransfer();

  const data = await chrome.storage.local.get();

  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const filename = key.replace(STORAGE_KEY_PREFIX, "");
        const fileData = data[key].data;

        const [, mimeType, base64String] =
          fileData.match(/^data:([^;]+);base64,(.+)$/) || [];
        if (!mimeType || !base64String) {
          console.error(`Invalid data URI format for key ${key}`);
          continue;
        }

        let binaryString;
        try {
          binaryString = atob(base64String);
        } catch (e) {
          console.error(`Invalid Base64 string for key ${key}`);
          continue;
        }
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        const blob = new Blob([bytes], { type: mimeType });
        const extension = data[key].fileExtension;
        const finalFilename = filename.endsWith(extension)
          ? filename
          : `${filename}${extension}`;

        const file = new File([blob], finalFilename, {
          type: mimeType,
          lastModified: new Date(),
        });

        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`Error processing file for key ${key}:`, error);
      }
    }
  }

  if (dataTransfer.files.length > 0) {
    fileUploadInput.files = dataTransfer.files;
    const event = new Event("change", { bubbles: true });
    fileUploadInput.dispatchEvent(event);
    await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 2000)));
  } else {
    console.log("No valid files to assign to input");
  }
}
