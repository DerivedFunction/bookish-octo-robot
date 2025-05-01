import { toggleButton, loadJsonData, resetBtn } from "../app.js";
import { appendSvg } from "./appendSvg.js";
import { t } from "./locales.js";

let expirationTimeout = null;
const CACHE_NAME = "bg-image-cache";

// Dummy base URL for own_img (must be a valid HTTPS URL)
const DUMMY_OWN_IMG_URL = "https://bookish.octo.robot/own_img";

// Store image data in cache with a valid Request object
async function putInCache(key, imageData) {
  try {
    const cache = await caches.open(CACHE_NAME);
    // Use the key if it's a valid URL, otherwise use the dummy URL
    const cacheKey =
      key.startsWith("http://") || key.startsWith("https://")
        ? key
        : DUMMY_OWN_IMG_URL;
    const request = new Request(cacheKey);
    const response = new Response(imageData, {
      headers: { "Content-Type": "image/jpeg" }, // Adjust based on image type if needed
    });
    await cache.put(request, response);
  } catch (error) {
    console.error("Error caching image data:", error);
    throw error;
  }
}

// Retrieve image data with a cache-first strategy
async function getCachedImageData(key) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey =
      key.startsWith("http://") || key.startsWith("https://")
        ? key
        : DUMMY_OWN_IMG_URL;
    const request = new Request(cacheKey);

    // Check the cache first
    const responseFromCache = await cache.match(request);
    if (responseFromCache) {
      const blob = await responseFromCache.blob();
      return await blobToDataURL(blob);
    }

    // If not in cache, return null (we'll handle fetching elsewhere)
    return null;
  } catch (error) {
    console.error("Error retrieving cached image data:", error);
    return null;
  }
}

// Clear cached image data
async function clearCachedImageData(key) {
  try {
    const cache = await caches.open(CACHE_NAME);
    const cacheKey =
      key.startsWith("http://") || key.startsWith("https://")
        ? key
        : DUMMY_OWN_IMG_URL;
    const request = new Request(cacheKey);
    await cache.delete(request);
  } catch (error) {
    console.error("Error clearing cached image data:", error);
  }
}
// LocalStorage functions for bgOption
function getBgOption() {
  const bgOption = localStorage.getItem("bg-option");
  return bgOption ? JSON.parse(bgOption) : null;
}

function setBgOption(bgData) {
  try {
    // Store metadata without data in localStorage
    const metadata = {
      type: bgData.type,
      url: bgData.url,
      expiration: bgData.expiration,
      timeExpire: bgData.timeExpire,
      credits: bgData.credits,
      lightModeText: bgData.lightModeText,
    };
    localStorage.setItem("bg-option", JSON.stringify(metadata));
  } catch (error) {
    if (error.name === "QuotaExceededError") {
      console.warn("LocalStorage quota exceeded:", error);
      // Handle quota exceeded if needed, though data is no longer stored here
    } else {
      throw error;
    }
  }
}

function clearBgOption() {
  localStorage.removeItem("bg-option");
}

export async function loadData() {
  const bgOption = getBgOption();
  const body = document.body;
  const now = Date.now();

  if (bgOption && bgOption.type) {
    switch (bgOption.type) {
      case "bg_img":
        if (bgOption.expiration === -1) {
          await clearCachedImageData(bgOption.url);
          await applyBackgroundImage(bgOption);
        } else if (bgOption.timeExpire === 0 || now > bgOption.timeExpire) {
          await setNewBackgroundImage(body, bgOption);
        } else {
          await applyBackgroundImage(bgOption);
          scheduleBackgroundUpdate(body, bgOption, now);
        }
        break;
      case "color":
        body.style.backgroundColor = bgOption.url; // Treat url as color value
        break;
      case "gradient":
        const [ang, color1, color2] = bgOption.url.split(",");
        body.style.backgroundImage = `linear-gradient(${ang}deg, ${color1}, ${color2})`;
        break;
      case "own_img":
        await applyBackgroundImage(bgOption);
        break;
      default:
        resetBackground();
        clearBgOption();
        break;
    }
  }
}

export const backgroundSelect = document.getElementById("bg-select");
const bgText = document.getElementsByClassName("bg-text");
export const bgImgExpSelect = document.getElementById("bg_img-exp");
export const bgBtn = document.getElementById("save-bg");
export const bgColor = document.getElementById("solid-color");
export const bgColor2 = document.getElementById("solid-color-2");
export const bgNum = document.getElementById("gradient-number");
const ownImgInput = document.getElementById("img-file");
export const ownImgLabel = document.getElementById("img-file-label");

bgColor.addEventListener("input", () => toggleButton(bgBtn, true));
bgColor2.addEventListener("input", () => toggleButton(bgBtn, true));
bgNum.addEventListener("input", () => toggleButton(bgBtn, true));
ownImgInput.addEventListener("change", () => {
  toggleButton(bgBtn, true);
  bgBtn.click();
});
bgImgExpSelect.addEventListener("change", () => toggleButton(bgBtn, true));
backgroundSelect.addEventListener("change", () => {
  ownImgLabel.textContent = t("upload_image");
  toggleButton(bgBtn, true);
});

bgBtn.addEventListener("click", async () => {
  const selectedOption =
    backgroundSelect.options[backgroundSelect.selectedIndex].value;
  const body = document.body;
  let bgData = (await getBgOption()) || {
    type: selectedOption,
    url: null,
    expiration: -1,
    timeExpire: -1,
    lightModeText: null,
    credits: null,
  };

  if (bgData.type !== selectedOption) {
    bgData = {
      ...bgData,
      type: selectedOption,
      url: null,
      expiration: -1,
      timeExpire: -1,
      credits: null,
      lightModeText: null,
    };
  }
  ownImgLabel.textContent = t("upload_image");

  switch (selectedOption) {
    case "bg_img":
      if (!bgData.url) {
        await setNewBackgroundImage(body, bgData);
      } else {
        await applyBackgroundImage(bgData);
      }
      break;
    case "color":
      resetBackground();
      const color = bgColor.value;
      body.style.backgroundColor = color;
      bgData.url = color;
      bgData.credits = null;
      setBgOption(bgData);
      break;
    case "gradient":
      resetBackground();
      const color1 = bgColor.value;
      const color2 = bgColor2.value;
      const ang = bgNum.value || 0;
      const gradient = `linear-gradient(${ang}deg, ${color1}, ${color2})`;
      body.style.backgroundImage = gradient;
      bgData.url = `${ang},${color1},${color2}`; // Store gradient as url
      bgData.credits = null;
      setBgOption(bgData);
      break;
    case "own_img":
      const file = ownImgInput.files[0];
      if (file) {
        await putInCache(DUMMY_OWN_IMG_URL, file); // Cache under dummy URL
        bgData.url = null; // No HTTPS URL for user-uploaded images
        bgData.credits = [file.name];
        ownImgLabel.textContent = file.name;
        await applyBackgroundImage(bgData);
        setBgOption(bgData);
      } else {
        resetBackground();
      }
      break;
    default:
      resetBackground();
      bgData.url = null;
      bgData.credits = null;
      break;
  }

  if (selectedOption === "bg_img") {
    const expirationOption =
      bgImgExpSelect.options[bgImgExpSelect.selectedIndex].value;
    const now = Date.now();
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

  if (
    bgData.url ||
    selectedOption === "default" ||
    selectedOption === "own_img"
  ) {
    setBgOption(bgData);
  }
  toggleButton(bgBtn, false);
});

function scheduleBackgroundUpdate(body, bgData, now) {
  if (expirationTimeout) {
    clearTimeout(expirationTimeout);
  }

  const timeUntilExpiration = bgData.timeExpire - now;
  if (timeUntilExpiration > 0) {
    expirationTimeout = setTimeout(async () => {
      await setNewBackgroundImage(body, bgData);
      setBgOption(bgData);
      const newNow = Date.now();
      scheduleBackgroundUpdate(body, bgData, newNow);
    }, timeUntilExpiration);
  }
}

const credits = document.getElementById("credits");

function determineTheme(isLightMode) {
  return isLightMode ? "light" : "dark";
}

async function applyBackgroundImage(bgData) {
  const body = document.body;
  body.style.backgroundColor = "";
  let imageUrl;

  if (bgData.type === "bg_img") {
    // Try cache first, fall back to HTTPS URL
    imageUrl = await getCachedImageData(bgData.url);
    if (!imageUrl) {
      // If not in cache, use the HTTPS URL and attempt to re-cache it
      try {
        const response = await fetch(bgData.url);
        if (response.ok) {
          const blob = await response.blob();
          await putInCache(bgData.url, blob);
          imageUrl = await blobToDataURL(blob);
        } else {
          imageUrl = bgData.url; // Fallback to URL directly
        }
      } catch (error) {
        console.error("Error fetching bg_img:", error);
        imageUrl = bgData.url; // Use URL as last resort
      }
    }
  } else if (bgData.type === "own_img") {
    // Try cache first
    imageUrl = await getCachedImageData(DUMMY_OWN_IMG_URL);
    if (!imageUrl) {
      console.warn("No cached image data found for own_img");
      resetBackground();
      return;
    }
  } else {
    imageUrl = bgData.url; // Fallback for unexpected cases
  }

  body.style.backgroundImage = `url('${imageUrl}')`;
  body.style.backgroundSize = "cover";
  body.style.backgroundRepeat = "no-repeat";
  body.style.backgroundPosition = "center";

  if (bgData.credits && bgData.credits.length === 4) {
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
  } else if (bgData.credits && bgData.credits.length === 1) {
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

async function blobToDataURL(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function setNewBackgroundImage(body, bgData = null) {
  try {
    const { wallpapers } = await loadJsonData("wallpapers");
    const randomIndex = Math.floor(Math.random() * wallpapers.length);
    const wallpaper = wallpapers[randomIndex];

    // Fetch the image
    const imageResponse = await fetch(wallpaper.url);
    if (!imageResponse.ok) throw new Error("Failed to fetch image");
    const imageBlob = await imageResponse.blob();

    // Cache the image data
    await putInCache(wallpaper.url, imageBlob);

    if (bgData) {
      bgData.url = wallpaper.url; // Store HTTPS URL in bg-option.url
      bgData.credits = [
        wallpaper.credits,
        wallpaper.name,
        wallpaper.domain,
        wallpaper.url,
      ];
      bgData.lightModeText = wallpaper.lightModeText;
      const { time } = getExpirationDetails(bgData.expiration, Date.now());
      bgData.timeExpire = time;
    }
    await applyBackgroundImage(bgData);
    setBgOption(bgData); // Save metadata to localStorage
  } catch (error) {
    console.error("Error setting new background image:", error);
    if (bgData && bgData.url) {
      await applyBackgroundImage(bgData);
    } else {
      resetBackground();
    }
  }
}

export function resetBackground() {
  document.body.style.backgroundImage = "";
  document.body.style.backgroundColor = "";
  credits.innerHTML = "";
  credits.style.display = "none";
  Array.from(bgText).forEach((element) => element.removeAttribute("style"));
  clearCachedImageData(DUMMY_OWN_IMG_URL); // Clear own_img cache
}

function getExpirationDetails(expirationOption, now) {
  const seconds = parseInt(expirationOption);
  if (seconds === -1 || seconds === 0) {
    return { time: seconds };
  } else {
    return { time: now + seconds * 1000 };
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/save.svg" }, bgBtn);

  const bgOption = getBgOption();
  backgroundSelect.addEventListener("change", () => {
    const selectedOption =
      backgroundSelect.options[backgroundSelect.selectedIndex].value;
    [bgColor, bgImgExpSelect, bgColor2, bgNum, ownImgLabel].forEach((e) => {
      e.style.display = "none";
    });
    ownImgLabel.textContent = t("upload_image");
    switch (selectedOption) {
      case "bg_img":
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
      case "own_img":
        ownImgLabel.style.display = "";
        break;
      default:
        break;
    }
    if (selectedOption !== "bg_img") {
      setTextColor();
    }
  });

  if (bgOption) {
    if (bgOption.type !== "bg_img") {
      setTextColor();
    }
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
      case "bg_img":
        bgImgExpSelect.style.display = "";
        for (let i = 0; i < bgImgExpSelect.options.length; i++) {
          if (bgImgExpSelect.options[i].value == bgOption.expiration) {
            bgImgExpSelect.options[i].selected = true;
            break;
          }
        }
        break;
      case "color":
        bgColor.value = bgOption.url;
        bgColor.style.display = "";
        break;
      case "gradient":
        const bgGradient = bgOption.url.split(",");
        bgNum.value = bgGradient[0];
        bgColor.value = bgGradient[1];
        bgColor2.value = bgGradient[2];
        bgColor.style.display = "";
        bgColor2.style.display = "";
        bgNum.style.display = "";
        break;
      case "own_img":
        ownImgLabel.textContent = bgOption.credits[0]
          ? bgOption.credits[0]
          : t("upload_image");
        ownImgLabel.style.display = "";
        break;
      default:
        break;
    }
  } else {
    setTextColor();
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
  await loadData();
  resetBtn.addEventListener("click", async () => {
    clearBgOption();
    resetBackground();
    setTextColor();
    ownImgLabel.textContent = t("upload_image");
    [bgImgExpSelect, backgroundSelect].forEach((selectElement) => {
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
