// script.js
(async () => {
  chrome.storage.local.get("ChatGPT").then((e) => {
    orphan = e.ChatGPT;
  });
  setTimeout(runAfterFullLoad, 3000);
})();
const MAX_COUNTER = 300;
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
  element = document.querySelector("#prompt-textarea p");
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
  let { ChatGPTLast } = await chrome.storage.local.get(["ChatGPTLast"]);
  await chrome.storage.local.remove("ChatGPTLast");
  if (!ChatGPTLast) return;
  let lastResponse = document.querySelectorAll("article");
  if (lastResponse.length === 0) return;
  let content = lastResponse[lastResponse.length - 1].innerHTML;
  chrome.runtime.sendMessage({
    lastResponse: content,
    engine: "ChatGPT",
  });
}
async function getTextInput(maxRetries = 10, retryDelay = 3000) {
  let { query, ChatGPT } = await chrome.storage.local.get(["query", "ChatGPT"]);
  await chrome.storage.local.remove("ChatGPT"); //remove immediately off the queue
  const searchQuery = (ChatGPT ? query : "")?.trim();
  if (!searchQuery) return;
  chrome.runtime.sendMessage({ ping: true });
  let attempts = 0;
  counter = 0; //reset the counter
  while (attempts < maxRetries) {
    console.log(
      `Attempt ${attempts + 1}: Injecting ${element} of query: ${searchQuery}`
    );

    if (element) {
      element.textContent = searchQuery;
      clickButton("#composer-submit-button");
      return;
    } else {
      element = document.querySelector("#prompt-textarea p"); // try finding it again
      console.log(`Element not found. Retrying after ${retryDelay}ms.`);
      attempts++;
      if (attempts < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay)); // Wait before retry
      }
    }
  }

  console.error(`Failed to find element after ${maxRetries} attempts.`);
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
function update(content = "") {
  // Send a message after the button click
  chrome.runtime.sendMessage({
    buttonClicked: true,
    engine: "ChatGPT",
  });
}

async function getImage() {
  const STORAGE_KEY_PREFIX = "pasted-file-";
  const fileUploadInput = document.querySelector("input[type='file']");
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
    document
      .querySelector("button[data-testid='composer-button-search']")
      .click();
  }
  if (deep) {
    document
      .querySelector("button[data-testid='composer-button-reason']")
      .click();
  }
}
