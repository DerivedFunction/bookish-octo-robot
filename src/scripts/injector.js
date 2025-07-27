// Universal Script Injector
(async () => {
  const response = await fetch(new URL(chrome.runtime.getURL("ai-list.json")));
  if (!response.ok) {
    throw new Error("Failed to load AI list data");
  }
  const data = await response.json();
  const url = new URL(window.location.href);
  const urlHostname = url.hostname;
  const aiConfig = data["ai-list"].find((ai) => ai.url.includes(urlHostname));
  
  // Handle multiple selector configurations
  if (Array.isArray(aiConfig.selectors.textbox)) {
    selectorConfigs = aiConfig.selectors.textbox.map(config => ({
      ...aiConfig.selectors,
      textbox: config.textbox,
      scriptType: config.scriptType
    }));
    SELECTORS = selectorConfigs[0];
    SCRIPT_TYPE = selectorConfigs[0].scriptType;
  } else {
    SELECTORS = aiConfig.selectors;
    SCRIPT_TYPE = aiConfig.scriptType || 'textContent';
    selectorConfigs = [{...SELECTORS, scriptType: SCRIPT_TYPE}];
  }

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
    setTimeout(runAfterFullLoad, DELAY);
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
    await getImage();
    await getTextInput();
  }

  if (changes[SELECTORS.lastResponse] && changes[SELECTORS.lastResponse].newValue) {
    await getLastResponse();
  }
}

async function getLastResponse() {
  let { [SELECTORS.lastResponse]: getLast } = await chrome.storage.local.get(SELECTORS.lastResponse);
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
  chrome.runtime.sendMessage({ ping: true, name: SELECTORS.AI });
  
  let attempts = 0;
  counter = 0;
  let success = false;
  
  while (attempts < maxRetries) {
    // Try each selector configuration in turn
    for (let i = 0; i < selectorConfigs.length; i++) {
      const currentConfig = selectorConfigs[(currentSelectorIndex + i) % selectorConfigs.length];
      const selector = currentConfig.scriptType === 'contenteditable' ? 
        "div[contenteditable='true']" : currentConfig.textbox;
      element = document.querySelector(selector);
      console.log(`Attempt ${attempts + 1}, Config ${(currentSelectorIndex + i) % selectorConfigs.length + 1}: Injecting Query`);

      if (element) {
        switch (currentConfig.scriptType) {
          case 'react':
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

          case 'contenteditable':
            element.focus();
            // Try meta injection first
            const beforeInputEvent = new InputEvent("beforeinput", {
              inputType: "insertText",
              data: searchQuery,
              bubbles: true,
              cancelable: true,
            });
            element.dispatchEvent(beforeInputEvent);
            getMetaListener();
            
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
            break;
        }

        let clicked = await clickButton();
        if (clicked) {
          // Remember successful configuration for next time
          currentSelectorIndex = (currentSelectorIndex + i) % selectorConfigs.length;
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
  element?.addEventListener("beforeinput", (event) => {
    if (event.inputType === "insertText") {
      event.preventDefault();
      const newText = event.data;
      const selection = window.getSelection();

      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        range.deleteContents();
        range.insertNode(document.createTextNode(newText));
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        element.appendChild(document.createTextNode(newText));
      }
    }
  });
}

async function clickButton() {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const button = document.querySelector(SELECTORS.send);
  if (button) {
    button.click();
    console.log(`Clicked button: ${button}`);
    update();
    return true;
  } else {
    console.log(`Button not found`);
    return false;
  }
}

function update() {
  chrome.runtime.sendMessage({
    buttonClicked: true,
    engine: SELECTORS.AI,
  });
}

async function getImage() {
  const { [SELECTORS.AI]: curAI } = await chrome.storage.local.get(SELECTORS.AI);
  const STORAGE_KEY_PREFIX = "pasted-file-";
  const fileUploadInput = document.querySelector("input[type='file']");
  if (!curAI || !fileUploadInput) return;
  const dataTransfer = new DataTransfer();

  const data = await chrome.storage.local.get();

  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const filename = key.replace(STORAGE_KEY_PREFIX, "");
        const fileData = data[key].data;

        const [, mimeType, base64String] = fileData.match(/^data:([^;]+);base64,(.+)$/) || [];
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
        const finalFilename = filename.endsWith(extension) ? filename : `${filename}${extension}`;

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
    await Promise.resolve(new Promise((resolve) => setTimeout(resolve, 1000)))
  } else {
    console.log("No valid files to assign to input");
  }
}
