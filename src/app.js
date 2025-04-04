let aiList = [];
let prompts = [];
let wallpapers = [];
const clearBtn = document.getElementById("clear");

const searchEngineBtn = document.querySelector(".search-engine-btn");
const dropdown = document.querySelector("#search-engine-dropdown");
const suggestionContainer = document.querySelector(".suggestions-container");
searchEngineBtn.addEventListener("click", () => {
  dropdown.classList.toggle("active");
});

document.addEventListener("click", (e) => {
  if (!searchEngineBtn.contains(e.target) && !dropdown.contains(e.target)) {
    dropdown.classList.remove("active");
  }
});

const goButton = document.getElementById("go");
const query = document.getElementById("search");
clearBtn.addEventListener("click", async () => {
  query.value = "";
  query.style.height = "auto";
  query.style.height = `${query.scrollHeight}px`;
  toggleButton(clearBtn, false);
  toggleButton(goButton, false);
  await getSuggestionButtons();
});

query.addEventListener("input", async () => {
  // Set the height to match the content (scrollHeight)
  query.style.height = "auto"; // Reset height to auto
  query.style.height = `${query.scrollHeight}px`; // Recalculate height
  let x = query.value.length > 0;
  toggleButton(clearBtn, x);
  toggleButton(goButton, x);
  if (!x) await getSuggestionButtons();
});

query.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!goButton.disabled) {
      goButton.click();
    }
  } else if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    query.value += "\n";
  }
});

goButton.addEventListener("click", () => {
  if (query.value.length > 0) {
    let url = `${getSearchEngineUrl()}${encodeURIComponent(query.value)}`;
    window.location.href = url;
  }
});

function toggleButton(button, enabled) {
  button.disabled = !enabled;
  if (enabled) button.classList.add("enabled");
  else button.classList.remove("enabled");
}

function getSearchEngineUrl() {
  let engine = JSON.parse(localStorage.getItem("selectedSearchEngine"));
  if (!engine) {
    engine = getSearchEngine();
  }

  return engine.url;
}

async function loadJsonData(resetOptions = {}) {
  // Default reset options
  const {
    resetAiList = false,
    resetPrompts = false,
    resetWallpapers = false,
  } = resetOptions;

  try {
    // Load AI list and prompts if not already loaded or resetting
    if (
      aiList.length === 0 ||
      resetAiList ||
      prompts.length === 0 ||
      resetPrompts
    ) {
      let response = await fetch("ai-list.json");
      if (!response.ok) {
        throw new Error("Failed to load AI list data");
      }
      let data = await response.json();
      aiList = data["ai-list"];
      prompts = data["prompts"];
    }

    // Load wallpapers if not already loaded or resetting
    if (wallpapers.length === 0 || resetWallpapers) {
      let response = await fetch("sample-wallpaper.json");
      if (!response.ok) {
        throw new Error("Failed to load wallpaper list data");
      }
      let data = await response.json();
      wallpapers = data;
    }
    return { aiList, prompts, wallpapers };
  } catch (error) {
    console.error("Error loading JSON data:", error);
    // Fallback to empty arrays if data wasn't loaded
    return {
      aiList: aiList || [],
      prompts: prompts || [],
      wallpapers: wallpapers || [],
    };
  }
}

async function getSearchEngineList() {
  if (aiList.length === 0) {
    const { aiList: loadedList } = await loadJsonData();
    return loadedList;
  }
  return aiList;
}

async function getSearchEngine() {
  try {
    let selectedEngine = localStorage.getItem("selectedSearchEngine");

    if (!selectedEngine) {
      const engines = await getSearchEngineList();
      if (engines.length === 0) throw new Error("No search engines available");

      selectedEngine = JSON.stringify(engines[0]);
      localStorage.setItem("selectedSearchEngine", selectedEngine);
    }

    const engineData = JSON.parse(selectedEngine);
    searchEngineBtn.innerHTML = "";
    await appendSvg({ image: engineData.image }, searchEngineBtn, null);
    if (engineData.image) {
      const iconUrl = engineData.image;
      if (chrome && chrome.action) {
        fetch(iconUrl)
          .then((response) => response.blob())
          .then((blob) => {
            const objectUrl = URL.createObjectURL(blob);
            chrome.action.setIcon({ path: objectUrl });
            if (browser && browser.sidebarAction)
              browser.sidebarAction.setIcon({ path: objectUrl });
          })
          .catch((error) =>
            console.error("Error setting browser action icon:", error)
          );
      }
    }
    return engineData;
  } catch (error) {
    console.error("Error setting up search engine:", error);
    return null;
  }
}

async function addSearchEngines() {
  let searchEngines = await getSearchEngineList();
  const list = document.getElementById("search-engine-dropdown");
  list.innerHTML = ""; // Clear existing items

  searchEngines.forEach((engine) => {
    const fragment = document.createDocumentFragment();
    const listItem = document.createElement("li");
    listItem.className = "search-engine-option";
    listItem.setAttribute("data-link", engine.url);

    // Create container for icon and text
    const container = document.createElement("div");
    container.style.display = "flex";
    container.style.alignItems = "center";
    container.style.gap = "8px";

    // Add inline SVG
    appendSvg(engine, container, "4px");

    // Add text
    const text = document.createElement("span");
    text.textContent = engine.name;

    container.appendChild(text);
    listItem.appendChild(container);

    listItem.addEventListener("click", async () => {
      localStorage.setItem("selectedSearchEngine", JSON.stringify(engine));
      await getSearchEngine(); // Update the button icon immediately
      dropdown.classList.remove("active");
    });

    fragment.appendChild(listItem);
    list.appendChild(fragment);
  });
}

function appendSvg(object, container, gap, replace = false) {
  fetch(object.image)
    .then((response) => response.text())
    .then((svgContent) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const svg = svgDoc.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "20");
        svg.setAttribute("height", "20");
        svg.style.width = "20px";
        svg.style.height = "20px";
        if (gap) container.style.gap = gap;
        if (replace) {
          // check if the current icon is the same as the new one
          const currentIcon = container.querySelector("svg");
          if (currentIcon && currentIcon.outerHTML !== svg.outerHTML) {
            container.replaceChild(svg, currentIcon); // Replace existing icon
          } else {
            container.appendChild(svg); // Append new icon
          }
        } else {
          container.insertBefore(svg, container.firstChild); // Insert icon before text
        }
      }
    })
    .catch((error) => console.error("Error loading SVG:", error));
}

function getGreeting() {
  let x = document.getElementById("greeting");
  let y = localStorage.getItem("name");
  if (!x) return;

  const now = new Date();
  const hour = now.getHours();

  let greeting;

  if (hour >= 4 && hour < 12) {
    // Morning: 4:00 - 11:59
    greeting = "Good Morning";
  } else if (hour >= 12 && hour < 16) {
    // Afternoon: 12:00 - 15:59
    greeting = "Good Afternoon";
  } else if ((hour >= 16 && hour < 24) || (hour >= 0 && hour < 4)) {
    // Evening: 16:00 - 19:59
    greeting = "Good Evening";
  }
  x.textContent = y ? `${greeting}, ${y}.` : `${greeting}.`;
}

async function getPrompt() {
  if (prompts.length === 0) {
    const { prompts: loadedPrompts } = await loadJsonData();
    return loadedPrompts;
  }
  return prompts;
}

async function getSuggestionButtons() {
  if (document.getElementById("Solve")) {
    return; // If the button with id="solve" exists, do nothing
  }

  const promptList = await getPrompt();
  if (!Array.isArray(promptList) || promptList.length === 0) {
    console.warn("No prompts available");
    return;
  }

  suggestionContainer.innerHTML = ""; // Clear existing buttons
  const fragment = document.createDocumentFragment(); // Use a fragment for better performance

  promptList.forEach((prompt) => {
    if (!prompt.id || !prompt.prompt) return; // Skip invalid prompts

    const btn = document.createElement("button");
    btn.textContent = prompt.id;
    btn.id = prompt.id;

    if (prompt.image) {
      appendSvg({ image: prompt.image }, btn, "4px");
    }

    btn.addEventListener("click", () => {
      if (query.value.length == 0 || goButton.disabled) {
        query.value = prompt.prompt;
        query.focus();
        toggleButton(clearBtn, true);
        findSuggestions();
      } else {
        query.value = prompt.prompt + query.value;
        goButton.click();
      }
    });

    fragment.appendChild(btn); // Append button to the fragment
  });

  suggestionContainer.appendChild(fragment); // Append the fragment to the container
}
function findSuggestions() {
  suggestionContainer.innerHTML = ""; // Clear existing suggestions
  console.log(prompts);
  const promptList = prompts.find((p) => p.prompt === query.value);
  if (
    !promptList ||
    !promptList.suggestions ||
    promptList.suggestions.length === 0
  ) {
    console.warn("No suggestions available for the current prompt");
    return;
  }

  promptList.suggestions.forEach((suggestion) => {
    const suggestionElement = document.createElement("button");
    suggestionElement.className = "suggestion-item";
    suggestionElement.textContent = suggestion;
    const text = query.value + suggestion;
    suggestionElement.addEventListener("click", () => {
      query.value = text;
      toggleButton(goButton, true);
      toggleButton(clearBtn, true);
    });

    suggestionContainer.appendChild(suggestionElement);
  });
}
function updateTime() {
  const timeElement = document.getElementById("time");
  if (!timeElement) return;

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  const minutes = now.getMinutes().toString().padStart(2, "0");

  timeElement.textContent = `${hours}:${minutes}`;
}

setInterval(updateTime, 5000);
updateTime();

const optionBtn = document.getElementById("options-button");
const sidebar = document.getElementById("sidebar");
const nameInput = document.getElementById("name-field");
const nameBtn = document.getElementById("submit-name");
optionBtn.addEventListener("click", () => {
  sidebar.style.display = "block";
  nameInput.value = localStorage.getItem("name") || "";
  let x = JSON.parse(localStorage.getItem("location"));
  weatherField.value = x ? x.name : "";
});

nameBtn.addEventListener("click", () => {
  toggleButton(nameBtn, false);
  if (nameInput.value.length > 0) {
    localStorage.setItem("name", nameInput.value);
  } else {
    localStorage.removeItem("name");
  }
  getGreeting();
});
nameInput.addEventListener("input", () => {
  toggleButton(nameBtn, true);
  appendSvg(
    {
      image:
        nameInput.value.length > 0
          ? "/assets/images/save.svg"
          : "/assets/images/clear.svg",
    },
    nameBtn,
    null,
    true
  );
});
document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && !optionBtn.contains(e.target)) {
    sidebar.style.display = "none";
  }
});

const pasteBtn = document.getElementById("paste");
pasteBtn.addEventListener("click", async () => {
  try {
    const permissionStatus = await chrome.permissions.request({
      permissions: ["clipboardRead"],
    });
    if (!permissionStatus) {
      alert(
        "Permission to access clipboard is denied. Please enable it in your browser settings."
      );
      return;
    }
    const text = await navigator.clipboard.readText();
    query.value += text;
    // Set the height to match the content (scrollHeight)
    query.style.height = "auto";
    query.style.height = `${query.scrollHeight}px`;
    query.focus();
    let x = query.value.length > 0;
    toggleButton(clearBtn, x);
    toggleButton(goButton, x);
  } catch (err) {
    console.error("Failed to read clipboard contents: ", err);
    alert("Unable to access clipboard. Please grant permission and try again.");
  }
});

const weather = document.getElementById("weather");
const weather_exp = 1 * 60 * 1000; // 1 minute expiration
const weatherBtn = document.getElementById("submit-weather");
const weatherField = document.getElementById("weather-field");

// Existing displayWeather function (unchanged)
function displayWeather(weatherData) {
  if (!weatherData) {
    weather.textContent = "";
    return;
  }
  const now = new Date().getTime();
  if (now - weatherData.timestamp > weather_exp) {
    weather.textContent = "";
    localStorage.removeItem("weatherData");
    console.log("Weather data expired, fetching again...");
    storeWeather();
    return;
  }
  const currentUnit = localStorage.getItem("weather-unit") || "metric";
  const temperature =
    currentUnit === "imperial"
      ? ((weatherData.temperature * 9) / 5 + 32).toFixed(1) // C to F
      : weatherData.temperature.toFixed(1);
  const unitSymbol = currentUnit === "imperial" ? "°F" : "°C";

  weather.textContent = `${weatherData.condition}, ${temperature}${unitSymbol}`;
}

// New function to fetch weather data
async function fetchWeather(location) {
  try {
    const [lat, lon] = location.split(",");
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&temperature_unit=celsius`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }
    const data = await response.json();
    const currentWeather = data.current_weather;

    const weatherDescriptions = {
      0: "Clear sky",
      1: "Mainly clear",
      2: "Partly cloudy",
      3: "Overcast",
      45: "Fog",
      48: "Depositing rime fog",
      51: "Drizzle: Light intensity",
      53: "Drizzle: Moderate intensity",
      55: "Drizzle: Dense intensity",
      56: "Freezing Drizzle: Light intensity",
      57: "Freezing Drizzle: Dense intensity",
      61: "Rain: Slight intensity",
      63: "Rain: Moderate intensity",
      65: "Rain: Heavy intensity",
      66: "Freezing Rain: Light intensity",
      67: "Freezing Rain: Heavy intensity",
      71: "Snow fall: Slight intensity",
      73: "Snow fall: Moderate intensity",
      75: "Snow fall: Heavy intensity",
      77: "Snow grains",
      80: "Rain showers: Slight intensity",
      81: "Rain showers: Moderate intensity",
      82: "Rain showers: Violent intensity",
      85: "Snow showers: Slight intensity",
      86: "Snow showers: Heavy intensity",
      95: "Thunderstorm: Slight or moderate",
      96: "Thunderstorm with slight hail",
      99: "Thunderstorm with heavy hail",
    };
    const condition =
      weatherDescriptions[currentWeather.weathercode] || "Unknown";
    const temperature = currentWeather.temperature; // Always Celsius
    const unitSymbol = "°C"; // Stored unit is always Celsius

    const weatherData = {
      condition,
      temperature,
      unitSymbol,
      timestamp: new Date().getTime(),
      location,
    };

    localStorage.setItem("weatherData", JSON.stringify(weatherData));
    displayWeather(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    weather.textContent = "Unable to fetch weather.";
  }
}

// Updated storeWeather function
async function storeWeather() {
  const cachedWeather = JSON.parse(localStorage.getItem("weatherData"));
  const now = new Date().getTime();
  let location = JSON.parse(localStorage.getItem("location"))
    ? JSON.parse(localStorage.getItem("location")).coord
    : null;

  const inputValue = weatherField.value.trim();

  // If we have a location from localStorage, fetch weather data directly
  if (location && !inputValue) {
    if (
      cachedWeather &&
      now - cachedWeather.timestamp < weather_exp &&
      cachedWeather.location === location
    ) {
      displayWeather(cachedWeather);
      return;
    }
    await fetchWeather(location);
    return;
  }

  // Handle location input from weatherField
  if (inputValue) {
    const coords = inputValue.split(",");
    if (coords.length === 2 && coords.every((c) => !isNaN(parseFloat(c)))) {
      // Input is latitude,longitude
      location = coords.map((c) => parseFloat(c).toFixed(6)).join(",");
      localStorage.setItem(
        "location",
        JSON.stringify({
          name: inputValue,
          zip: null,
          coord: location,
        })
      );
    } else {
      // Treat as postal code or name and fetch coordinates
      try {
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            inputValue
          )}&count=1`
        );
        const data = await response.json();

        if (!data.results?.length) {
          alert("Location not found. Try using lat,lon format.");
          weather.textContent = "";
          return;
        }

        const { latitude: lat, longitude: lon } = data.results[0];
        location = `${lat},${lon}`;
        localStorage.setItem(
          "location",
          JSON.stringify({
            name: inputValue,
            zip: inputValue,
            coord: location,
          })
        );
        toggleButton(weatherBtn, false); // Disable the button
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        alert("Something went wrong. Please try again.");
        weather.textContent = "Unable to fetch weather.";
        return;
      }
    }
  } else if (!location) {
    localStorage.removeItem("location");
    localStorage.removeItem("weatherData");
    toggleButton(weatherBtn, false); // Disable button
    displayWeather(null);
    return;
  }

  if (!location) {
    weather.textContent = "";
    return;
  }

  // Check cache and fetch if needed
  if (
    cachedWeather &&
    now - cachedWeather.timestamp < weather_exp &&
    cachedWeather.location === location
  ) {
    displayWeather(cachedWeather);
  } else {
    await fetchWeather(location);
  }
}

// Event listeners
weatherBtn.addEventListener("click", storeWeather);
weatherField.addEventListener("input", () => {
  toggleButton(weatherBtn, true); // Enable button
  appendSvg(
    {
      image:
        weatherField.value.length > 0
          ? "/assets/images/save.svg"
          : "/assets/images/clear.svg",
    },
    weatherBtn,
    null,
    true
  );
});
async function loadSimple() {
  getGreeting();
  await addSearchEngines();
  await getSearchEngine();
  await getSuggestionButtons();
  displayWeather(JSON.parse(localStorage.getItem("weatherData")));
}

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

async function getBgOption() {
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

async function clearBgOption() {
  if (!db) await openDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([storeName], "readwrite");
    const store = transaction.objectStore(storeName);
    const request = store.delete("bg-option");
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

async function loadData() {
  let bgOption = await getBgOption();
  const body = document.body;
  const now = new Date().getTime();
  const { wallpapers: loadedWallpapers } = await loadJsonData();
  wallpapers = loadedWallpapers;

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

const backgroundSelect = document.getElementById("bg-select");
const bgText = document.getElementsByClassName("bg-text");
const bgImgExpSelect = document.getElementById("bg-img-exp");
const bgBtn = document.getElementById("save-bg");
const bgColor = document.getElementById("solid-color");
const bgColor2 = document.getElementById("solid-color-2");
const bgNum = document.getElementById("gradient-number");
const ownImgInput = document.getElementById("img-file");
const ownImgLabel = document.getElementById("img-file-label");
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
  console.log(selectedOption, bgData.type);
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
      console.log(file);
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
    console.log(expirationOption);
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
  console.log(timeUntilExpiration);
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
  body.style.backgroundImage = `url('${bgData.url}')`;
  body.style.backgroundSize = "cover";
  body.style.backgroundRepeat = "no-repeat";
  body.style.backgroundPosition = "center";
  body.style.backgroundColor = "";
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

function setTextColor(bgData = null, condition = false) {
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

// Helper function to set a new background image
async function setNewBackgroundImage(body, bgData = null) {
  try {
    if (!wallpapers || wallpapers.length === 0) {
      const response = await fetch("sample-wallpaper.json");
      if (!response.ok) throw new Error("Failed to load wallpaper data");
      wallpapers = await response.json();
    }

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
function resetBackground(body) {
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
const chatbox = document.getElementById("chatbox");
const trOption = document.getElementById("content-transparent");

let inactivityTimeout = null;

// Set initial styles to ensure chatbox starts fully opaque
chatbox.style.opacity = "1";
chatbox.style.transition = "opacity 0.3s ease";

// Load and apply stored inactivity setting
let inactivitySetting = localStorage.getItem("inactivity") || "-1"; // Default to "Never Fade"
for (let i = 0; i < trOption.options.length; i++) {
  if (trOption.options[i].value === inactivitySetting) {
    trOption.options[i].selected = true;
    break;
  }
}

// Function to update inactivity behavior
function updateInactivityBehavior() {
  inactivitySetting = localStorage.getItem("inactivity") || "-1";
  const timeoutSeconds = parseInt(inactivitySetting);

  // Clear any existing timeout
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }

  // Reset to full opacity when updating
  chatbox.style.opacity = "1";

  // Apply behavior based on setting
  if (timeoutSeconds === -1) {
    // Never fade: ensure it stays opaque
    chatbox.style.opacity = "1";
  } else if (timeoutSeconds === 0) {
    // Instantly fade when not hovered
    if (!chatbox.matches(":hover")) {
      chatbox.style.opacity = "0.3";
    }
  } else {
    // Delayed fade when not hovered
    if (!chatbox.matches(":hover")) {
      inactivityTimeout = setTimeout(() => {
        chatbox.style.opacity = "0.3";
      }, timeoutSeconds * 1000);
    }
  }
}

// Handle hover events
chatbox.addEventListener("mouseenter", () => {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
  chatbox.style.opacity = "1";
});

chatbox.addEventListener("mouseleave", () => {
  const timeoutSeconds = parseInt(inactivitySetting);
  if (timeoutSeconds === -1) return; // Never fade

  if (timeoutSeconds === 0) {
    chatbox.style.opacity = "0.3";
  } else {
    inactivityTimeout = setTimeout(() => {
      chatbox.style.opacity = "0.3";
    }, timeoutSeconds * 1000);
  }
});

// Handle dropdown change
trOption.addEventListener("change", () => {
  const option = trOption.options[trOption.selectedIndex].value;
  localStorage.setItem("inactivity", option);
  updateInactivityBehavior();
});

const userThemeForm = document.getElementById("user-theme");
userThemeForm.addEventListener("change", async (e) => {
  localStorage.setItem("user-theme", e.target.value);
  if (e.target.value === "auto") {
    document.body.removeAttribute("data-theme");
    return;
  }
  const lightTheme = e.target.value === "true";
  document.body.setAttribute("data-theme", lightTheme ? "light" : "dark");
});
document.addEventListener("DOMContentLoaded", async () => {
  try {
    // Add icons
    appendSvg({ image: "assets/images/options.svg" }, optionBtn, null);
    appendSvg({ image: "assets/images/clear.svg" }, clearBtn, null);
    appendSvg({ image: "assets/images/save.svg" }, nameBtn, null);
    appendSvg({ image: "assets/images/save.svg" }, weatherBtn, null);
    appendSvg({ image: "assets/images/save.svg" }, bgBtn, null);
    appendSvg({ image: "assets/images/paste.svg" }, pasteBtn, "4px");
    await loadSimple();
    // Set initial state
    updateInactivityBehavior(); // Apply the stored inactivity setting

    const unitToggle = document.getElementById("unit-toggle");
    unitToggle.checked = localStorage.getItem("weather-unit") === "imperial";
    unitToggle.addEventListener("change", () => {
      const unit = unitToggle.checked ? "imperial" : "metric";
      localStorage.setItem("weather-unit", unit);
      displayWeather(JSON.parse(localStorage.getItem("weatherData")));
    });
    const storedTheme = localStorage.getItem("user-theme");
    if (storedTheme !== null) {
      userThemeForm.querySelectorAll("input").forEach((option) => {
        if (option.value === storedTheme) {
          option.checked = true;
        }
      });
      if (storedTheme === "auto") {
        document.body.removeAttribute("data-theme");
      } else {
        document.body.setAttribute(
          "data-theme",
          storedTheme === "true" ? "light" : "dark"
        );
      }
    }
    await loadData();
    const bgOption = await getBgOption();
    backgroundSelect.addEventListener("change", () => {
      const selectedOption =
        backgroundSelect.options[backgroundSelect.selectedIndex].value;
      [
        bgColor,
        bgImgExpSelect,
        bgColor2,
        bgNum,
        ownImgInput,
        ownImgLabel,
      ].forEach((e) => {
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
          ownImgInput.style.display = "";
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
      [
        bgColor,
        bgImgExpSelect,
        bgColor2,
        bgNum,
        ownImgInput,
        ownImgLabel,
      ].forEach((e) => {
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
          ownImgInput.style.display = "";
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
      [
        bgColor,
        bgImgExpSelect,
        bgColor2,
        bgNum,
        ownImgInput,
        ownImgLabel,
      ].forEach((e) => {
        e.style.display = "none";
      });
      backgroundSelect.options[0].selected = true;
    }
    // Gets the query from context menu
    let q = localStorage.getItem("query");
    if (q) {
      localStorage.removeItem("query");
      query.value = q;
      toggleButton(goButton, true);
      goButton.click();
    }
    document.getElementById("reset").addEventListener("click", async () => {
      localStorage.clear();
      clearBgOption();
      resetBackground(document.body);
      [unitToggle].forEach((toggle) => {
        toggle.checked = false;
      });

      [weatherField, nameInput].forEach((field) => {
        field.value = "";
      });
      [weatherBtn, nameBtn].forEach((btn) => {
        appendSvg({ image: "/assets/images/save.svg" }, btn, null, true);
        toggleButton(btn, false);
      });
      [bgImgExpSelect, backgroundSelect, trOption].forEach((selectElement) => {
        Array.from(selectElement.options).forEach((option) =>
          option.removeAttribute("selected")
        );
        selectElement.options[0].selected = true;
      });
      userThemeForm.querySelectorAll("input").forEach((option) => {
        option.checked = false;
      });
      ownImgLabel.textContent = "Click to upload...";
      document.body.removeAttribute("data-theme");
      setTextColor();
      bgImgExpSelect.style.display = "none";
      updateInactivityBehavior();
      if (chrome && chrome.permissions) {
        await chrome.permissions.remove({
          permissions: ["clipboardRead"],
        });
      }
      await loadSimple();
      await loadData();
    });
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});
