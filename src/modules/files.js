import { appendSvg } from "./appendSvg.js";
import { setupTooltip } from "./tooltip.js";

const fileUploadBtn = document.getElementById("file-upload-btn");
setupTooltip(fileUploadBtn, () => true);

const fileUploadInput = document.getElementById("file-upload");
const filesList = document.getElementById("files-list");

const STORAGE_KEY_PREFIX = "pasted-file-";
const MAX_TOTAL_SIZE = 4 * 1024 * 1024; // 4MB in bytes

// Get total size of all stored files
async function getTotalStoredSize() {
  const data = await browser.storage.local.get();
  let totalSize = 0;
  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      totalSize += data[key].size;
    }
  }
  return totalSize;
}

// Store file in browser.storage.local
async function storeFile(filename, file) {
  const totalSize = await getTotalStoredSize();
  if (totalSize + file.size > MAX_TOTAL_SIZE) {
    alert("Cannot store file: Total size limit of 4MB exceeded.");
    return false;
  }

  const reader = new FileReader();
  return new Promise((resolve) => {
    reader.onload = async () => {
      await chrome.storage.local.set({
        [`${STORAGE_KEY_PREFIX}${filename.replace(" ", "")}`]: {
          data: reader.result,
          type: file.type,
          size: file.size,
        },
      });
      resolve(true);
    };
    reader.readAsDataURL(file);
  });
}

// Delete file from storage and DOM
async function deleteFile(filename, liElement) {
  await browser.storage.local.remove(`${STORAGE_KEY_PREFIX}${filename}`);
  liElement.remove();
}

function addFileToList(filename, blob) {
  const li = document.createElement("li");

  // Create a container for the tooltip and visual element
  const container = document.createElement("div");
  container.style.display = "inline-block";
  container.style.cursor = "pointer";

  if (blob.type.startsWith("image/")) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    img.style.height = "20px";
    img.style.objectFit = "contain";
    img.style.display = "block";
    container.appendChild(img);
  } else {
    // For non-image files, create a 20x20 square box
    const placeholder = document.createElement("div");
    appendSvg({ image: "/assets/images/buttons/file.svg" }, placeholder);
    container.appendChild(placeholder);
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

// Handle file input changes
fileUploadInput.addEventListener("change", async () => {
  const files = fileUploadInput.files;

  for (const file of files) {
    const success = await storeFile(file.name, file);
    if (success) {
      addFileToList(file.name, file);
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

      const success = await storeFile(filename, file);
      if (success) {
        addFileToList(filename, file);
      }
    }
  }
});

// On page load, clear all stored data
document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "/assets/images/buttons/paperclip.svg" }, fileUploadBtn);
  const data = await chrome.storage.local.get();

  for (const key in data) {
    if (key.startsWith(STORAGE_KEY_PREFIX)) {
      chrome.storage.local.remove(key);
    }
  }
});
