// script.js
(async () => {
  chrome.storage.local.get("Meta").then((e) => {
    orphan = e.Meta;
  });
  setTimeout(runAfterFullLoad, 3000);
})();

const MAX_COUNTER = 3000;
let counter = 0;
let element;
// if it was opened
let orphan;
async function runAfterFullLoad() {
  if (!orphan) {
    console.log("Orphan process. Exiting...");
    return;
  }
  console.log("Running query injection.");

  await getImage();
  await getButtons();
  element = document.querySelector("div[contenteditable='true']");
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
}
async function getLastResponse() {
  let { MetaLast } = await chrome.storage.local.get(["MetaLast"]);
  await chrome.storage.local.remove("MetaLast");
  if (!MetaLast) return;
  let lastResponse = document.querySelectorAll(
    ".x78zum5.xdt5ytf div[dir='auto']"
  );
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "Meta",
  });
}
async function getTextInput(maxRetries = 5, retryDelay = 3000) {
  let { query, Meta } = await chrome.storage.local.get(["query", "Meta"]);
  const searchQuery = (Meta ? query : "")?.trim();
  await chrome.storage.local.remove("Meta");
  if (!searchQuery) return;
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter
  getListener();
  while (attempts < maxRetries) {
    element = document.querySelector("div[contenteditable='true']");
    console.log(
      `Attempt ${attempts + 1}: Injecting ${element} of query: ${searchQuery}`
    );

    if (element) {
      element.focus();
      const beforeInputEvent = new InputEvent("beforeinput", {
        inputType: "insertText",
        data: searchQuery,
        bubbles: true,
        cancelable: true,
      });

      element.dispatchEvent(beforeInputEvent);
      clickButton("div[aria-label='Send Message']");
      return;
    } else {
      getListener();
      console.log(`Element not found:. Retrying after ${retryDelay}ms.`);
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

function getListener() {
  element?.addEventListener("beforeinput", (event) => {
    if (event.inputType === "insertText") {
      event.preventDefault(); //Prevent the default behaviour
      const newText = event.data;
      const selection = window.getSelection();

      if (selection && selection.rangeCount) {
        const range = selection.getRangeAt(0);
        // Remove selected text (if any)
        range.deleteContents();

        // Insert the new text
        range.insertNode(document.createTextNode(newText));

        // Update selection (if desired)
        selection.removeAllRanges();
        selection.addRange(range);
      } else {
        element.appendChild(document.createTextNode(newText));
      }
    }
  });
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
    engine: "Meta",
  });
}
async function getImage() {
  const STORAGE_KEY_PREFIX = "pasted-file-";
  const fileUploadInput = document.querySelector("input");
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
  let { code } = await chrome.storage.local.get("code");
  if (code) {
    document.querySelector("div[aria-label='Canvas']").click();
  }
}
