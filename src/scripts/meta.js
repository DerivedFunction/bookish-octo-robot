// script.js
(async () => {
  setTimeout(runAfterFullLoad, 3000);
})();

async function runAfterFullLoad() {
  console.log("Running query injection.");

  await getImage();
  await getButtons();
  await getTextInput("div[contenteditable='true']");
}

async function getTextInput(attribute, maxRetries = 5, retryDelay = 3000) {
  let { query, Meta } = await chrome.storage.local.get(["query", "Meta"]);
  const searchQuery = (Meta ? query : "")?.trim();
  await chrome.storage.local.remove("Meta");
  if (!searchQuery) return;

  let attempts = 0;

  while (attempts < maxRetries) {
    // Check 'stop' condition here
    const element = document.querySelector(attribute);
    console.log(element);
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
  chrome.runtime.sendMessage({ buttonClicked: true, engine: "Meta" });
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
    console.warn("No valid files to assign to input");
  }
}

async function getButtons() {
  let { code } = await chrome.storage.local.get("code");
  if (code) {
    document.querySelector("div[aria-label='Canvas']").click();
  }
}
