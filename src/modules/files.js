import { appendImg } from "./appendImage.js";
import { t } from "./locales.js";
import { showToast } from "./toaster.js";
import { setupTooltip } from "./tooltip.js";

export const fileUploadBtn = document.getElementById("file-upload-btn");
setupTooltip(fileUploadBtn, () => true);

const fileUploadInput = document.getElementById("file-upload");
const filesList = document.getElementById("files-list");

const STORAGE_KEY_PREFIX = "pasted-file-";
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4MB in bytes

// Get total size of all stored files
async function getTotalStoredSize() {
  const data = await chrome.storage.local.get();
  let totalSize = 0;
  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      totalSize += data[key].size;
    }
  }
  return totalSize;
}
async function getUniqueFilename(baseName) {
  const sanitizedBase = baseName.replace(/\s+/g, "");

  // Separate filename and extension
  const dotIndex = sanitizedBase.lastIndexOf(".");
  const namePart =
    dotIndex !== -1 ? sanitizedBase.slice(0, dotIndex) : sanitizedBase;
  const extPart = dotIndex !== -1 ? sanitizedBase.slice(dotIndex) : "";

  const allItems = await chrome.storage.local.get(null);
  let uniqueName = `${namePart}${extPart}`;
  let counter = 1;

  while (`${STORAGE_KEY_PREFIX}${uniqueName}` in allItems) {
    uniqueName = `${namePart}(${counter})${extPart}`;
    counter++;
  }

  return uniqueName;
}

async function storeFile(filename, file) {
  const totalSize = await getTotalStoredSize();
  if (totalSize + file.size > MAX_TOTAL_SIZE) {
    showToast(t("file_limit"));
    return null; // Return null to indicate failure
  }

  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async () => {
      const uniqueFilename = await getUniqueFilename(filename);
      await chrome.storage.local.set({
        [`${STORAGE_KEY_PREFIX}${uniqueFilename}`]: {
          data: reader.result,
          type: file.type,
          size: file.size,
          fileExtension: // get the last part of the filename after the last dot
            filename.includes(".")
              ? filename.split(".").pop()
              : ""
        },
      });
      resolve(uniqueFilename); // Return the unique filename
    };
    reader.readAsDataURL(file);
  });
}

// Handle file input changes
fileUploadInput.addEventListener("change", async () => {
  const files = fileUploadInput.files;

  for (const file of files) {
    const uniqueFilename = await storeFile(file.name, file);
    if (uniqueFilename) {
      addFileToList(uniqueFilename, file); // Use unique filename
    }
  }
});

// Handle pasted images
document.addEventListener("paste", async (event) => {
  const items = event.clipboardData?.items;
  if (!items) return;

  for (const item of items) {
    if (item.type.startsWith("image/")) {
      const file = item.getAsFile();
      const filename = file.name || `pasted-${Date.now()}.png`;

      const uniqueFilename = await storeFile(filename, file);
      if (uniqueFilename) {
        addFileToList(uniqueFilename, file); // Use unique filename
      }
    } else {
      // all files are ok
      const file = item.getAsFile();
      const uniqueFilename = await storeFile(file.name, file);
      if (uniqueFilename) {
        addFileToList(uniqueFilename, file); // Use unique filename
      }
    }
  }
});

// Delete file from storage and DOM
async function deleteFile(filename, liElement) {
  await chrome.storage.local.remove(`${STORAGE_KEY_PREFIX}${filename}`);
  liElement.remove();
}

function addFileToList(filename, blob) {
  const li = document.createElement("li");

  // Create a container for the tooltip and visual element
  const container = document.createElement("div");
  container.style.cursor = "pointer";

  if (blob.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    img.style.height = "20px";
    img.style.objectFit = "contain";
    img.style.display = "block";
    container.appendChild(img);
  } else {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.textContent = filename;
    container.appendChild(a);
  }

  // Tooltip shows the filename
  setupTooltip(container, () => true, filename);

  // Click to delete
  li.addEventListener("click", async () => {
    await deleteFile(filename, li);
  });

  li.appendChild(container);
  filesList.appendChild(li);
}

// On page load, clear all stored data
document.addEventListener("DOMContentLoaded", async () => {
  appendImg({ image: "/assets/images/buttons/paperclip.svg" }, fileUploadBtn);
  const data = await chrome.storage.local.get();
  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      chrome.storage.local.remove(key);
    }
  }
});

chrome.runtime.onMessage.addListener((e) => {
  if (e.message === "clearImage") {
    filesList.innerHTML = "";
  }
});
