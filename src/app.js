let aiList = [];
let prompts = [];
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
  goButton.disabled = true;
  goButton.classList.remove("enabled");
  clearBtn.disabled = true;
  clearBtn.classList.remove("enabled");
  await getSuggestionButtons();
});
query.addEventListener("input", async () => {
  if (query.value.length > 0) {
    goButton.disabled = false;
    goButton.classList.add("enabled");
    clearBtn.disabled = false;
    clearBtn.classList.add("enabled");
  } else {
    goButton.disabled = true;
    clearBtn.disabled = true;
    goButton.classList.remove("enabled");
    clearBtn.classList.remove("enabled");
    await getSuggestionButtons();
  }
});

goButton.addEventListener("click", () => {
  if (query.value.length > 0) {
    let url = `${getSearchEngineUrl()}${encodeURIComponent(query.value)}`;
    window.location.href = url;
  }
});

function getSearchEngineUrl() {
  let engine = JSON.parse(localStorage.getItem("selectedSearchEngine"));
  if (!engine) {
    engine = getSearchEngine();
  }

  return engine.url;
}

async function loadJsonData() {
  try {
    let response = await fetch("ai-list.json");
    if (!response.ok) {
      throw new Error("Failed to load AI list data");
    }
    let data = await response.json();
    aiList = data["ai-list"];
    prompts = data["prompts"];

    // Store in localStorage as backup
    localStorage.setItem("search-engines", JSON.stringify(aiList));
    localStorage.setItem("prompts", JSON.stringify(prompts));

    return { aiList, prompts };
  } catch (error) {
    console.error("Error loading JSON data:", error);
    // Fallback to localStorage if available
    return {
      aiList: JSON.parse(localStorage.getItem("search-engines") || "[]"),
      prompts: JSON.parse(localStorage.getItem("prompts") || "[]"),
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
        console.log(true);
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

function appendSvg(object, container, gap) {
  fetch(object.image)
    .then((response) => response.text())
    .then((svgContent) => {
      const svgElement = document.createElement("div");
      svgElement.innerHTML = svgContent;
      // Force SVG width and height to be the same
      const svg = svgElement.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "20");
        svg.setAttribute("height", "20");
      }

      svgElement.style.width = "20px";
      svgElement.style.height = "20px";
      if (gap) container.style.gap = gap;
      container.insertBefore(svgElement, container.firstChild); // Insert icon before text
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
  } else if (hour >= 16 && hour < 20) {
    // Evening: 16:00 - 19:59
    greeting = "Good Evening";
  } else {
    // Night: 20:00 - 3:59
    greeting = "A Night Owl";
  }

  x.textContent = y ? `${greeting}, ${y}!` : `${greeting}!`;
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
        clearBtn.classList.add("enabled");
        clearBtn.disabled = false;
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
      goButton.disabled = false;
      goButton.classList.add("enabled");
      clearBtn.disabled = false;
      clearBtn.classList.add("enabled");
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
  weatherField.value = x ? (x.zip ? x.zip : x.coord ? x.coord : "") : "";
});

nameBtn.addEventListener("click", () => {
  nameBtn.classList.remove("enabled");
  if (nameInput.value.length > 0) {
    localStorage.setItem("name", nameInput.value);
  } else {
    localStorage.removeItem("name");
  }
  nameBtn.disabled = true;
  getGreeting();
});
nameInput.addEventListener("input", () => {
  nameBtn.classList.add("enabled");
  if (nameInput.value.length > 0) {
    nameBtn.textContent = "Submit";
    nameBtn.disabled = false;
  } else {
    nameBtn.textContent = "Clear";
    nameBtn.disabled = false;
  }
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
    query.focus();
  } catch (err) {
    console.error("Failed to read clipboard contents: ", err);
    alert("Unable to access clipboard. Please grant permission and try again.");
  }
});
const weather = document.getElementById("weather");

function displayWeather(weatherData) {
  if (!weatherData) {
    weather.textContent = "";
    return;
  }
  const currentUnit = localStorage.getItem("weather-unit") || "metric";
  const temperature =
    currentUnit === "imperial"
      ? ((weatherData.temperature * 9) / 5 + 32).toFixed(1)
      : weatherData.temperature.toFixed(1);
  const unitSymbol = currentUnit === "imperial" ? "°F" : "°C";

  weather.textContent = `${weatherData.condition}, ${temperature}${unitSymbol}`;
}

const weatherBtn = document.getElementById("submit-weather");
const weatherField = document.getElementById("weather-field");

async function storeWeather() {
  const cachedWeather = JSON.parse(localStorage.getItem("weatherData"));
  const now = new Date().getTime();
  let location = JSON.parse(localStorage.getItem("location"))
    ? JSON.parse(localStorage.getItem("location")).coord
    : null;

  const postalCode = weatherField.value.trim();

  // Handle location input from weatherField
  if (postalCode) {
    // Check if postalCode is already in lat,lon format
    const coords = postalCode.split(",");
    if (
      coords.length === 2 &&
      !isNaN(parseFloat(coords[0])) &&
      !isNaN(parseFloat(coords[1]))
    ) {
      // Input is latitude,longitude
      location = `${parseFloat(coords[0]).toFixed(6)},${parseFloat(
        coords[1]
      ).toFixed(6)}`;
      localStorage.setItem(
        "location",
        JSON.stringify({
          zip: postalCode,
          coord: location,
        })
      );
    } else {
      // Treat as postal code and fetch coordinates
      try {
        const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
          postalCode
        )}&count=1`;
        const response = await fetch(url);
        const data = await response.json();

        if (!data.results || data.results.length === 0) {
          alert("Location not found. Try using lat,lon format.");
          weather.textContent = "";
          return;
        }

        const { latitude: lat, longitude: lon, name } = data.results[0];
        location = `${lat},${lon}`;
        localStorage.setItem(
          "location",
          JSON.stringify({
            zip: postalCode,
            coord: location,
          })
        );
        alert(
          `Coordinates for ${postalCode}: Lat ${lat}, Lon ${lon} ${name}\nResults may be inaccurate.`
        );
        weatherBtn.classList.remove("enabled");
        weatherBtn.disabled = true;
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        alert("Something went wrong. Please try again.");
        weather.textContent = "Unable to fetch weather.";
        return;
      }
    }
  } else {
    localStorage.removeItem("location");
    localStorage.removeItem("weatherData");
    weatherBtn.classList.remove("enabled");
    weatherBtn.disabled = true;
    displayWeather(null);
    return;
  }

  // If no location available, clear weather display
  if (!location) {
    weather.textContent = "";
    return;
  }

  // Check cache: same location and less than 15 minutes old
  if (
    cachedWeather &&
    now - cachedWeather.timestamp < 15 * 60 * 1000 &&
    cachedWeather.location === location
  ) {
    displayWeather(cachedWeather);
    return;
  }

  // Fetch weather data
  try {
    const [lat, lon] = location.split(",");
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`
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

    const unit = localStorage.getItem("weather-unit") || "metric";
    const temperature = currentWeather.temperature;
    const unitSymbol = "°C";

    const weatherData = {
      condition,
      temperature,
      unitSymbol,
      timestamp: now,
      location,
    };

    localStorage.setItem("weatherData", JSON.stringify(weatherData));
    displayWeather(weatherData);
  } catch (error) {
    console.error("Error fetching weather data:", error);
    weather.textContent = "Unable to fetch weather.";
  }
}

// Updated event listener
weatherBtn.addEventListener("click", storeWeather);
weatherField.addEventListener("input", () => {
  weatherBtn.classList.add("enabled");
  if (weatherField.value.length > 0) {
    weatherBtn.textContent = "Submit";
    weatherBtn.disabled = false;
  } else {
    weatherBtn.textContent = "Clear";
    weatherBtn.disabled = false;
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  try {
    loadData();
    // Add icons
    appendSvg({ image: "assets/images/options.svg" }, optionBtn, null);
    appendSvg({ image: "assets/images/clear.svg" }, clearBtn, null);
    appendSvg({ image: "assets/images/paste.svg" }, pasteBtn, "4px");
    sidebar.style.display = "none";
    const unitToggle = document.getElementById("unit-toggle");
    unitToggle.checked = localStorage.getItem("weather-unit") === "imperial";
    unitToggle.addEventListener("change", () => {
      const unit = unitToggle.checked ? "imperial" : "metric";
      localStorage.setItem("weather-unit", unit);
      displayWeather(JSON.parse(localStorage.getItem("weatherData")));
    });
    document.getElementById("reset").addEventListener("click", async () => {
      localStorage.clear();
      if (chrome && chrome.permissions) {
        await chrome.permissions.remove({
          permissions: ["clipboardRead"],
        });
      }
      // Load all data first
      await loadData();
    });
  } catch (error) {
    console.error("Error initializing application:", error);
  }
});
async function loadData() {
  await loadJsonData();

  // Then initialize UI components
  getGreeting();
  await addSearchEngines();
  await getSearchEngine();

  displayWeather(JSON.parse(localStorage.getItem("weatherData")));
  await getSuggestionButtons();
}
