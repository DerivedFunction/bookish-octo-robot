import { toggleButton } from "../app.js";
import { appendSvg } from "./appendSvg.js";
const weather = document.getElementById("weather");
const weather_exp = 15 * 60 * 1000; // 15 minute expiration

export const weatherBtn = document.getElementById("submit-weather");
export const weatherField = document.getElementById("weather-field");
export const unitToggle = document.getElementById("unit-toggle");
export const container = document.getElementById("unit-toggle-label");

// Single constant for weather codes, descriptions, and icons
const WEATHER_CONDITIONS = {
  0: { description: "Clear sky", iconBase: "sun/moon" },
  1: { description: "Mainly clear", iconBase: "suncloud/mooncloud" },
  2: { description: "Partly cloudy", iconBase: "suncloud/mooncloud" },
  3: { description: "Overcast", iconBase: "cloud" },
  45: { description: "Fog", iconBase: "fog" },
  48: { description: "Depositing rime fog", iconBase: "fog" },
  51: { description: "Drizzle: Light intensity", iconBase: "drizzle" },
  53: { description: "Drizzle: Moderate intensity", iconBase: "drizzle" },
  55: { description: "Drizzle: Dense intensity", iconBase: "drizzle" },
  56: { description: "Freezing Drizzle: Light intensity", iconBase: "drizzle" },
  57: { description: "Freezing Drizzle: Dense intensity", iconBase: "drizzle" },
  61: { description: "Rain: Slight intensity", iconBase: "rain" },
  63: { description: "Rain: Moderate intensity", iconBase: "rain" },
  65: { description: "Rain: Heavy intensity", iconBase: "rain" },
  66: { description: "Freezing Rain: Light intensity", iconBase: "rain" },
  67: { description: "Freezing Rain: Heavy intensity", iconBase: "rain" },
  71: { description: "Snow fall: Slight intensity", iconBase: "snow" },
  73: { description: "Snow fall: Moderate intensity", iconBase: "snow" },
  75: { description: "Snow fall: Heavy intensity", iconBase: "snow" },
  77: { description: "Snow grains", iconBase: "snow" },
  80: { description: "Rain showers: Slight intensity", iconBase: "rain" },
  81: { description: "Rain showers: Moderate intensity", iconBase: "rain" },
  82: { description: "Rain showers: Violent intensity", iconBase: "rain" },
  85: { description: "Snow showers: Slight intensity", iconBase: "snow" },
  86: { description: "Snow showers: Heavy intensity", iconBase: "snow" },
  95: {
    description: "Thunderstorm: Slight or moderate",
    iconBase: "lightning",
  },
  96: { description: "Thunderstorm with slight hail", iconBase: "lightning" },
  99: { description: "Thunderstorm with heavy hail", iconBase: "lightning" },
};

// Fetch weather data
async function fetchWeather() {
  try {
    console.log("Fetching weather from api.open-meteo.com");
    const location = JSON.parse(localStorage.getItem("location"));
    const [lat, lon] = location.coord.split(",");
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true&daily=sunrise,sunset&temperature_unit=celsius&timezone=auto`
    );
    if (!response.ok) {
      throw new Error("Failed to fetch weather data");
    }
    const data = await response.json();
    const currentWeather = data.current_weather;
    const daily = data.daily;

    const condition =
      WEATHER_CONDITIONS[currentWeather.weathercode]?.description || "Unknown";
    const temperature = currentWeather.temperature;
    const unitSymbol = "°C";

    const weatherData = {
      inputValue: weatherField.value.trim(),
      condition,
      temperature,
      unitSymbol,
      timestamp: new Date().getTime(),
      coord: location.coord,
      weathercode: currentWeather.weathercode,
      sunrise: daily.sunrise[0],
      sunset: daily.sunset[0],
      weatherTime: currentWeather.time,
    };

    localStorage.setItem("weatherData", JSON.stringify(weatherData));
    displayWeather();
  } catch (error) {
    console.error("Error fetching weather data:", error);
    clearFields();
  }
}

// Get coordinates and fetch weather
async function getCoords() {
  const cachedWeather = JSON.parse(localStorage.getItem("weatherData"));
  const now = new Date().getTime();
  let location = JSON.parse(localStorage.getItem("location"));

  const inputValue = weatherField.value.trim();
  if (inputValue.length === 0) {
    clearFields();
    appendSvg({ image: "/assets/images/buttons/save.svg" }, weatherBtn); // Default 20px
    await displayWeather();
    return;
  }

  if (location && inputValue === location.inputValue) {
    if (
      cachedWeather &&
      now - cachedWeather.timestamp < weather_exp &&
      cachedWeather.inputValue === location.inputValue
    ) {
      await displayWeather();
    } else {
      await fetchWeather();
    }
    return;
  }

  if (inputValue) {
    const coords = inputValue.split(",");
    if (coords.length === 2 && coords.every((c) => !isNaN(parseFloat(c)))) {
      location = coords.map((c) => parseFloat(c).toFixed(6)).join(",");
      localStorage.setItem(
        "location",
        JSON.stringify({
          inputValue: inputValue,
          coord: location,
        })
      );
    } else {
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
        toggleButton(weatherBtn, false);
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

// Icon selection based on time
function getWeatherIcon(weatherCode, weatherTime, sunrise, sunset) {
  const now = new Date(weatherTime || Date.now());
  const sunriseTime = new Date(sunrise);
  const sunsetTime = new Date(sunset);
  const isDay = now >= sunriseTime && now < sunsetTime;

  const condition = WEATHER_CONDITIONS[weatherCode] || {
    iconBase: "cloud",
  };
  const iconBase = condition.iconBase;

  if (iconBase === "sun/moon") {
    return isDay ? "sun.svg" : "moon.svg";
  } else if (iconBase === "suncloud/mooncloud") {
    return isDay ? "suncloud.svg" : "mooncloud.svg";
  } else {
    return `${iconBase}.svg`;
  }
}

// Display weather with icon
export async function displayWeather() {
  const weatherData = JSON.parse(localStorage.getItem("weatherData"));
  let loc = JSON.parse(localStorage.getItem("location"));
  console.log("Fetching weather", loc, weatherData);

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

  const iconPath = `/assets/images/weather/${getWeatherIcon(
    weatherData.weathercode,
    weatherData.weatherTime,
    weatherData.sunrise,
    weatherData.sunset
  )}`;
  weather.innerHTML = `${temperature}${unitSymbol}`;
  appendSvg(
    {
      image: iconPath,
      size: "40px",
      description: WEATHER_CONDITIONS[weatherData.weathercode].description,
    },
    weather,
    "5px",
    false
  ); // Custom size for weather icons
  container.style.display = "";
}

// Clear fields
function clearFields() {
  weather.textContent = "";
  weatherField.value = "";
  localStorage.removeItem("location");
  localStorage.removeItem("weatherData");
  container.style.display = "none";
  toggleButton(weatherBtn, false);
}

// Event listeners
weatherBtn.addEventListener("click", getCoords);
weatherField.addEventListener("input", () => {
  toggleButton(weatherBtn, true);
  appendSvg(
    {
      image:
        weatherField.value.length > 0
          ? "/assets/images/buttons/save.svg"
          : "/assets/images/buttons/clear.svg",
    },
    weatherBtn
  ); // Default 20px for buttons
});

document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "/assets/images/buttons/save.svg" }, weatherBtn); // Default 20px
  unitToggle.checked = localStorage.getItem("weather-unit") === "imperial";
  unitToggle.addEventListener("change", async () => {
    const unit = unitToggle.checked ? "imperial" : "metric";
    localStorage.setItem("weather-unit", unit);
    await displayWeather();
  });

  await displayWeather();

  document.getElementById("reset").addEventListener("click", async () => {
    clearFields();
    appendSvg({ image: "/assets/images/buttons/save.svg" }, weatherBtn); // Default 20px
    await displayWeather();
  });
});
