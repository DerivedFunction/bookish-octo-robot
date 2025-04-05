import { toggleButton, loadJsonData } from "../app.js";
import { appendSvg } from "./appendSvg.js";
let expirationTimeout = null; // To store the timeout reference

// IndexedDB setup
const dbName = "BackgroundDB";
const storeName = "bgOptions";
let db;
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      db.createObjectStore(storeName, { keyPath: "id" });
    };
  });
}
export async function getBgOption() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readonly");
    const store = transaction.objectStore(storeName);
    const request = store.get("bg-option");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

async function setBgOption(bgData) {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const data = { id: "bg-option", ...bgData };
    const request = store.put(data);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
export async function clearBgOption() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete("bg-option");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}
export async function loadData() {
  let bgOption = await getBgOption();
  const body = document.body;
  const now = new Date().getTime();

  if (bgOption && bgOption.type) {
    switch (bgOption.type) {
      case "bg-img":
        if (bgOption.expiration === -1) {
          applyBackgroundImage(body, bgOption);
        } else if (bgOption.timeExpire === 0 || now > bgOption.timeExpire) {
          await setNewBackgroundImage(body, bgOption);
        } else {
          applyBackgroundImage(body, bgOption);
          scheduleBackgroundUpdate(body, bgOption, now);
        }
        break;
      case "color":
        //change the body background color
        body.style.backgroundColor = bgOption.data;
        break;
      case "gradient":
        const data = bgOption.data.split(",");
        const ang = data[0];
        const color1 = data[1];
        const color2 = data[2];
        body.style.backgroundImage = `linear-gradient(${ang}deg, ${color1}, ${color2})`;
        break;
      case "own-img":
        if (bgOption.url) {
          applyBackgroundImage(body, bgOption);
        } else {
          resetBackground(body);
        }
        break;
      default:
        resetBackground(body);
        await clearBgOption();
        break;
    }
  }
}
export const backgroundSelect = document.getElementById("bg-select");
const bgText = document.getElementsByClassName("bg-text");
export const bgImgExpSelect = document.getElementById("bg-img-exp");
export const bgBtn = document.getElementById("save-bg");
export const bgColor = document.getElementById("solid-color");
export const bgColor2 = document.getElementById("solid-color-2");
export const bgNum = document.getElementById("gradient-number");
const ownImgInput = document.getElementById("img-file");
export const ownImgLabel = document.getElementById("img-file-label");
bgColor.addEventListener("input", () => {
  toggleButton(bgBtn, true);
});
bgColor2.addEventListener("input", () => {
  toggleButton(bgBtn, true);
});
bgNum.addEventListener("input", () => {
  toggleButton(bgBtn, true);
});
ownImgInput.addEventListener("change", () => {
  ownImgLabel.textContent = "Click to upload again...";
  toggleButton(bgBtn, true);
});
bgImgExpSelect.addEventListener("change", () => {
  toggleButton(bgBtn, true);
});
backgroundSelect.addEventListener("change", () => {
  ownImgLabel.textContent = "Click to upload...";
  toggleButton(bgBtn, true);
});
bgBtn.addEventListener("click", async () => {
  const selectedOption =
    backgroundSelect.options[backgroundSelect.selectedIndex].value;
  const body = document.body;
  let bgData = (await getBgOption()) || {
    type: selectedOption,
    data: null,
    url: null,
    expiration: -1,
    timeExpire: -1,
    lightModeText: null,
    credits: null,
  };
  if (bgData.type !== selectedOption) {
    bgData.type = selectedOption;
    bgData.data = null;
    bgData.url = null;
    bgData.expiration = -1;
    bgData.timeExpire = -1;
    bgData.credits = null;
    bgData.lightModeText = null;
  }
  ownImgLabel.textContent = "Click to upload...";
  switch (selectedOption) {
    case "bg-img":
      if (!bgData.url) {
        await setNewBackgroundImage(body, bgData);
      } else {
        applyBackgroundImage(body, bgData);
      }
      break;
    case "color":
      resetBackground(body);
      const color = bgColor.value;
      body.style.backgroundColor = color;
      bgData.data = color;
      bgData.url = null;
      bgData.credits = null;
      setBgOption(bgData);
      break;
    case "gradient":
      resetBackground(body);
      const color1 = bgColor.value;
      const color2 = bgColor2.value;
      const ang = bgNum.value ? bgNum.value : 0;
      const gradient = `linear-gradient(${ang}deg, ${color1}, ${color2})`;
      body.style.backgroundImage = gradient;
      bgData.data = `${ang},${color1},${color2}`;
      bgData.url = null;
      bgData.credits = null;
      setBgOption(bgData);
      break;
    case "own-img":
      const file = ownImgInput.files[0];
      if (file) {
        bgData.url = await blobToDataURL(file);
        bgData.credits = [file.name];
        ownImgLabel.textContent = file.name;
        applyBackgroundImage(body, bgData);
        await setBgOption(bgData);
      } else {
        resetBackground(body);
      }
      break;
    default:
      resetBackground(body);
      bgData.url = null;
      bgData.credits = null;
      break;
  }

  if (selectedOption === "bg-img") {
    const expirationOption =
      bgImgExpSelect.options[bgImgExpSelect.selectedIndex].value;
    const now = new Date().getTime();
    const { time } = getExpirationDetails(expirationOption, now);
    bgData.expiration = parseInt(expirationOption);
    bgData.timeExpire = time;

    if (expirationTimeout) {
      clearTimeout(expirationTimeout);
      expirationTimeout = null;
    }

    if (bgData.timeExpire !== -1 && bgData.timeExpire !== 0) {
      scheduleBackgroundUpdate(body, bgData, now);
    }
  } else {
    bgData.expiration = -1;
    bgData.timeExpire = -1;
    if (expirationTimeout) {
      clearTimeout(expirationTimeout);
      expirationTimeout = null;
    }
  }

  if (bgData.url || selectedOption === "default") {
    await setBgOption(bgData);
  }
  toggleButton(bgBtn, false);
});
// Helper function to schedule background update
function scheduleBackgroundUpdate(body, bgData, now) {
  if (expirationTimeout) {
    clearTimeout(expirationTimeout);
  }

  const timeUntilExpiration = bgData.timeExpire - now;
  if (timeUntilExpiration > 0) {
    expirationTimeout = setTimeout(async () => {
      await setNewBackgroundImage(body, bgData);
      await setBgOption(bgData); // Update with new image data
      const newNow = new Date().getTime();
      scheduleBackgroundUpdate(body, bgData, newNow);
    }, timeUntilExpiration);
  }
}
const credits = document.getElementById("credits");
// Helper function to determine the theme
function determineTheme(isLightMode) {
  return isLightMode ? "light" : "dark";
}
// Helper function to apply background image styles
function applyBackgroundImage(body, bgData) {
  body.style.backgroundColor = "";
  body.style.backgroundImage = `url('${bgData.url}')`;
  body.style.backgroundSize = "cover";
  body.style.backgroundRepeat = "no-repeat";
  body.style.backgroundPosition = "center";
  if (bgData.credits && bgData.credits.length == 4) {
    const person = document.createElement("a");
    person.href = bgData.credits[0];
    person.textContent = bgData.credits[1];
    const domain = document.createElement("a");
    domain.textContent = bgData.credits[2];
    domain.href = bgData.credits[3];
    credits.innerHTML = "";
    credits.appendChild(person);
    credits.appendChild(document.createTextNode(" from "));
    credits.appendChild(domain);
    credits.setAttribute("target", "_blank");
    credits.setAttribute("rel", "noopener noreferrer");
    credits.style.display = "";
  } else if (bgData.credits && bgData.credits.length == 1) {
    const filename = document.createElement("span");
    filename.textContent = bgData.credits[0];
    credits.innerHTML = "";
    credits.appendChild(filename);
    credits.style.display = "";
  }
  setTextColor(bgData, bgData.lightModeText != null);
}
export function setTextColor(bgData = null, condition = false) {
  if (condition && bgData != null) {
    Array.from(bgText).forEach((element) => {
      element.setAttribute("data-theme", determineTheme(bgData.lightModeText));
    });
  } else {
    Array.from(bgText).forEach((element) =>
      element.removeAttribute("data-theme")
    );
  }
}
// Helper function to convert blob to Data URL

async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
export async function readText(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(blob);
  });
}
// Helper function to set a new background image

async function setNewBackgroundImage(body, bgData = null) {
  try {
    const { wallpapers: wallpapers } = await loadJsonData("wallpapers");
    const randomIndex = Math.floor(Math.random() * wallpapers.length);
    const wallpaper = wallpapers[randomIndex];
    const imageResponse = await fetch(wallpaper.url);
    if (!imageResponse.ok) throw new Error("Failed to fetch image");
    const imageBlob = await imageResponse.blob();
    const dataUrl = await blobToDataURL(imageBlob);

    if (bgData) {
      bgData.url = dataUrl;
      bgData.credits = [
        wallpaper.credits,
        wallpaper.name,
        wallpaper.domain,
        wallpaper.url,
      ];
      bgData.lightModeText = wallpaper.lightModeText;
      const { time } = getExpirationDetails(
        bgData.expiration,
        new Date().getTime()
      );
      bgData.timeExpire = time;
    }
    applyBackgroundImage(body, bgData);
  } catch (error) {
    console.error("Error setting new background image:", error);
    if (bgData && bgData.url) {
      applyBackgroundImage(body, bgData);
    } else {
      resetBackground(body);
    }
  }
}
// Helper function to reset background to default
export function resetBackground(body) {
  body.style.backgroundImage = "";
  body.style.backgroundColor = "";
  credits.innerHTML = "";
  credits.style.display = "none";
  Array.from(bgText).forEach((element) => element.removeAttribute("style"));
}
// Simplified helper function to calculate expiration details
function getExpirationDetails(expirationOption, now) {
  const seconds = parseInt(expirationOption);
  if (seconds === -1 || seconds === 0) {
    return { time: seconds };
  } else {
    return { time: now + seconds * 1000 }; // Convert seconds to milliseconds
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/save.svg" }, bgBtn);
  await loadData();
  const bgOption = await getBgOption();
  backgroundSelect.addEventListener("change", () => {
    const selectedOption =
      backgroundSelect.options[backgroundSelect.selectedIndex].value;
    [bgColor, bgImgExpSelect, bgColor2, bgNum, ownImgLabel].forEach((e) => {
      e.style.display = "none";
    });
    ownImgLabel.textContent = "Click to upload...";
    switch (selectedOption) {
      case "bg-img":
        bgImgExpSelect.style.display = "";
        break;
      case "color":
        bgColor.style.display = "";
        break;
      case "gradient":
        bgColor.style.display = "";
        bgColor2.style.display = "";
        bgNum.style.display = "";
        break;
      case "own-img":
        ownImgLabel.style.display = "";
        break;
      default:
        break;
    }
    if (selectedOption !== "bg-img") {
      setTextColor(); // reset text color
    }
  });
  if (bgOption) {
    if (bgOption.type !== "bg-img") {
      setTextColor(); // reset text color
    }
    // Set background select
    for (let i = 0; i < backgroundSelect.options.length; i++) {
      if (backgroundSelect.options[i].value === bgOption.type) {
        backgroundSelect.options[i].selected = true;
        break;
      }
    }
    [bgColor, bgImgExpSelect, bgColor2, bgNum, ownImgLabel].forEach((e) => {
      e.style.display = "none";
    });

    switch (bgOption.type) {
      // Set expiration select for bg-img
      case "bg-img":
        bgImgExpSelect.style.display = "";
        for (let i = 0; i < bgImgExpSelect.options.length; i++) {
          if (bgImgExpSelect.options[i].value == bgOption.expiration) {
            bgImgExpSelect.options[i].selected = true;
            break;
          }
        }
        break;
      case "color":
        bgColor.value = bgOption.data;
        bgColor.style.display = "";
        break;
      case "gradient":
        const bgGradient = bgOption.data.split(",");
        bgNum.value = bgGradient[0];
        bgColor.value = bgGradient[1];
        bgColor2.value = bgGradient[2];
        bgColor.style.display = "";
        bgColor2.style.display = "";
        bgNum.style.display = "";
        break;
      case "own-img":
        ownImgLabel.textContent = bgOption.credits[0]
          ? bgOption.credits[0]
          : "Click to upload...";

        ownImgLabel.style.display = "";
      default:
        break;
    }
  } else {
    setTextColor(); // reset text color
    [bgImgExpSelect, backgroundSelect].forEach((e) => {
      Array.from(e.options).forEach((option) =>
        option.removeAttribute("selected")
      );
    });
    [bgColor, bgImgExpSelect, bgColor2, bgNum, ownImgLabel].forEach((e) => {
      e.style.display = "none";
    });
    backgroundSelect.options[0].selected = true;
  }
  document.getElementById("reset").addEventListener("click", async () => {
    clearBgOption();
    resetBackground(document.body);
    setTextColor();
    ownImgLabel.textContent = "Click to upload...";
    [bgImgExpSelect, backgroundSelect, trOption].forEach((selectElement) => {
      Array.from(selectElement.options).forEach((option) =>
        option.removeAttribute("selected")
      );
      selectElement.options[0].selected = true;
    });
    [bgImgExpSelect, bgColor, bgColor2, bgNum, ownImgLabel].forEach((e) => {
      e.style.display = "none";
    });
    await loadData();
  });
});
