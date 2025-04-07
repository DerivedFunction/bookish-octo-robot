import { toggleButton } from "../app.js";
import { appendSvg } from "./appendSvg.js";

const weather = document.getElementById("weather");
const weather_exp = 15 * 60 * 1000; // 15 minute expiration

export const weatherBtn = document.getElementById("submit-weather");
export const weatherField = document.getElementById("weather-field");
export const unitToggle = document.getElementById("unit-toggle");
export const container = document.getElementById("unit-toggle-label");
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
    clearFields();
  }
}

async function getCoords() {
  const cachedWeather = JSON.parse(localStorage.getItem("weatherData"));
  const now = new Date().getTime();
  let location = JSON.parse(localStorage.getItem("location"));

  const inputValue = weatherField.value.trim();
  // If the input field is empty, we want to delete the location
  if (inputValue.length === 0) {
    clearFields();
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
        console.log("Fetching coordinates from api.open-meteo.com");
        const response = await fetch(
          `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
            inputValue
          )}&count=1`
        );
        const data = await response.json();

        if (!data.results?.length) {
          console.log("Bad location.");
          clearFields();
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
        await fetchWeather();
        return;
      } catch (error) {
        console.error("Error fetching coordinates:", error);
        clearFields();
        return;
      }
    }
  } else {
    clearFields();
    await displayWeather();
    return;
  }
}
// Event listeners
weatherBtn.addEventListener("click", getCoords);
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

function clearFields() {
  weather.textContent = "";
  weatherField.value = "";
  localStorage.removeItem("location");
  localStorage.removeItem("weatherData");
  container.style.display = "none";
  toggleButton(weatherBtn, false);
}

export async function displayWeather() {
  const weatherData = JSON.parse(localStorage.getItem("weatherData"));
  let loc = JSON.parse(localStorage.getItem("location"));
  console.log("Fetching weather", loc);

  if (!loc) {
    //No location means we don't have anything
    console.log("No location set for weather.");
    clearFields();
    return;
  }
  weatherField.value = loc.inputValue;
  // If no weatherData but we have a location, fetch it
  if (!weatherData) {
    console.log("No weather data but location exists");
    await fetchWeather();
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
  container.style.display = "";
}

// In the DOMContentLoaded event listener:
document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/save.svg" }, weatherBtn);

  unitToggle.checked = localStorage.getItem("weather-unit") === "imperial";
  unitToggle.addEventListener("change", async () => {
    const unit = unitToggle.checked ? "imperial" : "metric";
    localStorage.setItem("weather-unit", unit);
    await displayWeather();
  });

  await displayWeather();

  document.getElementById("reset").addEventListener("click", async () => {
    clearFields();
    appendSvg({ image: "/assets/images/buttons/save.svg" }, weatherBtn);
    await displayWeather();
  });
});
