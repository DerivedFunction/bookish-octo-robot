// script.js Thanks to https://github.com/facebook/react/issues/11488#issuecomment-347775628
(async () => setTimeout(runAfterFullLoad, 3000))();
const SELECTORS = {
  AI: "Grok",
  lastResponse: "GrokLast",
  textbox: "textarea",
  send: "button[type='submit']",
  file: "input[type='file']",
  deep: "button[aria-label='Think']",
  web: "button[aria-label='DeepSearch']",
  code: null,
  lastHTML: ".last-response",
};
const MAX_COUNTER = 3000;
let counter = 0;
let element;

async function getLastResponse() {
  let { [SELECTORS.lastResponse]: getLast } = await chrome.storage.local.get([
    SELECTORS.lastResponse,
  ]);
  await chrome.storage.local.remove(SELECTORS.lastResponse);
  if (!getLast) return;
  let lastResponse = document.querySelector(SELECTORS.lastHTML)?.parentElement;
  if (!lastResponse) return;
  let buttons = lastResponse.querySelectorAll(
    "button[aria-label='Show inline']"
  );
  buttons.forEach((btn) => {
    btn.click();
  });
  // lastReponse's innerHTML should reflect the new changes
  let content = lastResponse.innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: SELECTORS.AI,
  });
}
async function runAfterFullLoad() {
  chrome.storage.local.get(SELECTORS.AI).then(async (e) => {
    let orphan = e[SELECTORS.AI];
    if (!orphan) {
      console.log("Orphan process. Exiting...");
      return;
    }
    console.log("Running query injection.");
    await getImage();
    await getButtons();
    element = document.querySelector("textarea");
    await getTextInput();
    let { unstable } = await chrome.storage.local.get("unstable");
    if (!unstable) return;
    console.log("Unstable Feature activated. listening...");
    await runWithDelay();
    async function runWithDelay() {
      while (counter++ < MAX_COUNTER) {
        await new Promise((resolve) => setTimeout(resolve, 1000)); // Wait 5 seconds
        await getImage();
        await getTextInput();
        await getLastResponse();
      }
      console.log("No activity. Stopped listening for queries");
    }
  });
}

async function getTextInput(maxRetries = 10, retryDelay = 3000) {
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
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter
  while (attempts < maxRetries) {
    element = document.querySelector(SELECTORS.textbox);
    console.log(`Attempt ${attempts + 1}: Injecting Query`);
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

      await clickButton();
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

async function getImage() {
  const { [SELECTORS.AI]: curAI } = await chrome.storage.local.get(
    SELECTORS.AI
  );
  const STORAGE_KEY_PREFIX = "pasted-file-";
  const fileUploadInput = document.querySelector(SELECTORS.file);
  if (!curAI || !fileUploadInput) return;
  const dataTransfer = new DataTransfer();

  // Map MIME types to file extensions
  const mimeToExtension = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/webp": ".webp",
    "image/tiff": ".tiff",
  };

  const data = await chrome.storage.local.get();

  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      try {
        const filename = key.replace(STORAGE_KEY_PREFIX, "");
        const fileData = data[key].data; // e.g., "data:image/png;base64,iVBORw0KGgo..."

        // Extract MIME type and Base64 string
        const [, mimeType, base64String] =
          fileData.match(/^data:([^;]+);base64,(.+)$/) || [];
        if (!mimeType || !base64String) {
          console.error(`Invalid data URI format for key ${key}`);
          continue;
        }

        // Check if MIME type is an image
        if (!mimeType.startsWith("image/")) {
          console.error(`Non-image MIME type (${mimeType}) for key ${key}`);
          continue;
        }

        // Convert Base64 to binary
        let binaryString;
        try {
          binaryString = atob(base64String); // Decode raw Base64
        } catch (e) {
          console.error(`Invalid Base64 string for key ${key}`);
          continue;
        }
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // Create Blob (reconstructed image)
        const blob = new Blob([bytes], { type: mimeType });

        // Determine file extension
        const extension = mimeToExtension[mimeType] || ".bin"; // Fallback for unknown MIME types
        const finalFilename = filename.endsWith(extension)
          ? filename
          : `${filename}${extension}`;

        // Create File
        const file = new File([blob], finalFilename, {
          type: mimeType,
          lastModified: new Date(),
        });

        // Add to DataTransfer
        dataTransfer.items.add(file);
      } catch (error) {
        console.error(`Error processing file for key ${key}:`, error);
      }
    }
  }

  // Assign files to the input
  console.log("Files assigned:", dataTransfer.files);
  console.log("File input:", fileUploadInput);
  if (dataTransfer.files.length > 0) {
    fileUploadInput.files = dataTransfer.files;
    // Trigger change event to notify listeners
    const event = new Event("change", { bubbles: true });
    fileUploadInput.dispatchEvent(event);
  } else {
    console.log("No valid files to assign to input");
  }
}
async function getButtons() {
  let { deep, web } = await chrome.storage.local.get(["deep", "web"]);
  if (web) {
    document.querySelector(SELECTORS.web).click();
  }
  if (deep) {
    document.querySelector(SELECTORS.deep).click();
  }
}
