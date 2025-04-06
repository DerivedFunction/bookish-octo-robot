import { toggleButton } from "../app.js";
import { appendSvg } from "./appendSvg.js";

const weather = document.getElementById("weather");
const weather_exp = 15 * 60 * 1000; // 15 minute expiration

export const weatherBtn = document.getElementById("submit-weather");
export const weatherField = document.getElementById("weather-field");

// New function to fetch weather data
async function fetchWeather() {
  try {
    console.log("Fetching weather from api.open-meteo.com");
    const location = JSON.parse(localStorage.getItem("location"));
    const [lat, lon] = location.coord.split(",");
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
      inputValue: weatherField.value.trim(),
      condition,
      temperature,
      unitSymbol,
      timestamp: new Date().getTime(),
      coord: location.coord,
    };

    localStorage.setItem("weatherData", JSON.stringify(weatherData));
    displayWeather();
  } catch (error) {
    console.error("Error fetching weather data:", error);
    weather.textContent = "--";
    localStorage.removeItem("location");
    localStorage.removeItem("weatherData");
  }
}
// Updated storeWeather function
async function storeWeather() {
  const cachedWeather = JSON.parse(localStorage.getItem("weatherData"));
  const now = new Date().getTime();
  let location = JSON.parse(localStorage.getItem("location"));

  const inputValue = weatherField.value.trim();
  // If the input field is empty, we want to delete the location
  if (inputValue.length === 0) {
    localStorage.removeItem("location");
    localStorage.removeItem("weatherData");
    toggleButton(weatherBtn, false); // Disable button
    appendSvg({ image: "/assets/images/buttons/save.svg" }, weatherBtn);
    await displayWeather();
    return;
  }
  // If we have a location from localStorage, and it is the same as our input
  // fetch weather data directly from our cache
  if (location && inputValue === location.inputValue) {
    if (
      cachedWeather &&
      now - cachedWeather.timestamp < weather_exp &&
      cachedWeather.inputValue === location.inputValue
    ) {
      // We have cache weather data
      await displayWeather();
    } else {
      await fetchWeather();
    }
    return;
  }

  // Handle location input from weatherField
  if (inputValue) {
    console.log("Fetching weather from api.open-meteo.com");
    const coords = inputValue.split(",");
    if (coords.length === 2 && coords.every((c) => !isNaN(parseFloat(c)))) {
      // Input is latitude,longitude
      location = coords.map((c) => parseFloat(c).toFixed(6)).join(",");
      localStorage.setItem(
        "location",
        JSON.stringify({
          inputValue: inputValue,
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
          weather.textContent = "";
          return;
        }

        const { latitude: lat, longitude: lon } = data.results[0];
        location = `${lat},${lon}`;
        localStorage.setItem(
          "location",
          JSON.stringify({
            inputValue: inputValue,
            coord: location,
          })
        );
        toggleButton(weatherBtn, false); // Disable the button
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        weather.textContent = "--";
        localStorage.removeItem("location");
        localStorage.removeItem("weatherData");
        return;
      }
    }
  } else if (!location) {
    localStorage.removeItem("location");
    localStorage.removeItem("weatherData");
    toggleButton(weatherBtn, false); // Disable button
    await displayWeather();
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
    cachedWeather.coord === location.coord
  ) {
    await displayWeather();
  } else {
    await fetchWeather();
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
          ? "/assets/images/buttons/save.svg"
          : "/assets/images/buttons/clear.svg",
    },
    weatherBtn
  );
});

export async function displayWeather() {
  const weatherData = JSON.parse(localStorage.getItem("weatherData"));
  let loc = JSON.parse(localStorage.getItem("location"));
  console.log("Fetching weather", loc);
  weatherField.value = loc ? loc.inputValue : "";
  // If no weatherData but we have a location, fetch it
  if (!weatherData && loc) {
    console.log("No weather data but location exists");
    await storeWeather();
    return;
  }

  // If still no weatherData (and no location), clear display
  if (!weatherData) {
    console.log("Still no weather data. Probably because it is not set.");
    weather.textContent = "";
    return;
  }

  const now = new Date().getTime();
  if (now - weatherData.timestamp > weather_exp) {
    weather.textContent = "";
    console.log("Weather data expired, fetching again...");
    await fetchWeather();
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

// In the DOMContentLoaded event listener:
document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/save.svg" }, weatherBtn);
  const unitToggle = document.getElementById("unit-toggle");
  unitToggle.checked = localStorage.getItem("weather-unit") === "imperial";
  unitToggle.addEventListener("change", async () => {
    const unit = unitToggle.checked ? "imperial" : "metric";
    localStorage.setItem("weather-unit", unit);
    await displayWeather();
  });

  await displayWeather();

  document.getElementById("reset").addEventListener("click", async () => {
    localStorage.removeItem("weatherData");
    unitToggle.checked = false;
    weatherField.value = "";
    appendSvg({ image: "/assets/images/buttons/save.svg" }, weatherBtn);
    toggleButton(weatherBtn, false);
    await displayWeather();
  });
});
