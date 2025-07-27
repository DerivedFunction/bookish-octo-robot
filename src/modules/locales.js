import { query } from "./query.js";
import { getGreeting, greeting } from "./greetings.js";
import { resetBtn } from "../app.js";
import {
  closeBtn,
  closeScriptBtn,
  enableAll,
  exp_sidebar,
  revokeAll,
} from "./sidebar.js";
import { suggestDisplay } from "./suggestions.js";
import { userThemeForm } from "./theme.js";
import { getSuggestionButtons } from "./suggestions.js";
import { unitLabel, weatherField } from "./weather.js";
import { timeFormat } from "./updateTime.js";
import {
  backgroundSelect,
  bgImgExpSelect,
  bgNum,
  ownImgLabel,
} from "./backgroundImage.js";
// Handle localization
let currentLocale = null;
let localeKeys = null;

export async function initLocales() {
  localeKeys = null;
  currentLocale = null;
  await chrome.storage.local.get("locale").then((e) => {
    if (e.locale) currentLocale = e.locale.split("-")[0];
  });
  if (currentLocale) {
    const response = await fetch(`/_locales/${currentLocale}/messages.json`);
    if (response.ok) {
      localeKeys = await response.json();
    }
  }
  initLocaleSelector();
  updateUIText();
}
const localeSelect = document.getElementById("locale-select");
export function initLocaleSelector() {
  if (localeSelect) {
    localeSelect.value = currentLocale || "default";
    localeSelect.addEventListener("change", async (e) => {
      let value = e.target.value;
      if (value === "default") {
        await chrome.storage.local.remove("locale");
        value = null;
      } else await chrome.storage.local.set({ locale: value });
      window.dispatchEvent(new Event("localechange"));
      chrome.runtime.sendMessage({
        message: "localechange",
      });
    });
  }
}

export function t(key, substitutions = {}) {
  key = key.toLowerCase().replace(" ", "_").replace("-", "_");
  let text = null;
  if (!currentLocale) {
    // get the values of each item in subs in array
    let subs = [];
    Object.values(substitutions).forEach((value) => {
      subs.push(value);
    });
    text = chrome.i18n.getMessage(key, subs) || key;
  } else {
    text = localeKeys?.[key]?.message || key;
    Object.entries(substitutions).forEach(([key, value]) => {
      text = text.replace(new RegExp(`\\$${key}\\$`, "g"), value);
    });
  }
  return text;
}

export function formatTimeOption(option) {
  if (option.dataset.time === "never") return t("bg_change_never");
  if (option.dataset.time === "refresh") return t("bg_change_refresh");

  const time = option.dataset.time;
  const unit = option.dataset.unit;
  return `${t("change_every")} ${time} ${t(`time_${unit}`)}`;
}

// Update UI text when locale changes
export function updateUIText() {
  getGreeting();
  getSuggestionButtons();
  // Set initial placeholder
  query.placeholder = t("search_placeholder");
  resetBtn.textContent = t("reset_button");
  closeBtn.textContent = t("close_button");
  document.querySelector("#sidebar h1").textContent = t("options_title");
  document.querySelector("#name-label").textContent = t("name_label");
  document.querySelector("#greeting-form legend").textContent = t(
    "greeting_type_label"
  );
  suggestDisplay.querySelector("legend").textContent = t(
    "show_suggestions_label"
  );
  suggestDisplay.querySelectorAll("label").forEach((label) => {
    label.textContent = t(`${label.getAttribute("for")}`);
  });
  // Update radio labels
  greeting.querySelectorAll("label").forEach((label) => {
    label.textContent = t(`${label.getAttribute("for")}_option`);
  });
  document.querySelector("#lang").textContent = t("lang");
  document.querySelector("#theme-label").textContent = t("theme");
  userThemeForm.querySelectorAll("label").forEach((label) => {
    label.textContent = t(`theme_${label.getAttribute("for")}`);
  });
  weatherField.parentElement.previousElementSibling.textContent = t("weather");
  weatherField.placeholder = t("weather_placeholder");
  unitLabel.querySelector("label").textContent = t("unit_toggle");
  timeFormat.querySelector("legend").textContent = t("time_format");
  timeFormat.querySelectorAll("label").forEach((label) => {
    if (label.getAttribute("for") === "no-time")
      label.textContent = t("sug_hide");
    else label.textContent = `${label.getAttribute("for")} ${t("time_hours")}`;
  });
  closeScriptBtn.textContent = t("close_button");
  exp_sidebar.querySelector("h1").textContent = t("tooltip_experimental");
  exp_sidebar.querySelector("p").textContent = t("scripts_desc");
  exp_sidebar.querySelector("#enabled-label").textContent = t("enabled_label");
  exp_sidebar.querySelector("#supported-label").textContent =
    t("supported_label");
  exp_sidebar.querySelector("#required-label").textContent =
    t("required_label");
  exp_sidebar.querySelector("#image-support-label").textContent = t(
    "tooltip_upload_file"
  );
  exp_sidebar.querySelector("#unstable-section label").textContent =
    t("unstable_label");
  exp_sidebar.querySelector("#unstable-section p").textContent =
    t("unstable_p");
  enableAll.textContent = t("enable_all");
  revokeAll.textContent = t("revoke_all");

  document.querySelector("#bg-label").textContent = t("background");
  ownImgLabel.textContent = t("upload_image");
  bgNum.placeholder = t("gradient_angle");
  backgroundSelect.querySelectorAll("option").forEach((option) => {
    option.textContent = t(`bg_type_${option.value}`);
  });

  bgImgExpSelect.querySelectorAll("option").forEach((option) => {
    option.textContent = formatTimeOption(option);
  });
  localeSelect.querySelector("option[value='default']").textContent =
    t("background_default");
}

// Listen for locale changes
window.addEventListener("localechange", () => initLocales());
chrome.runtime.onMessage.addListener((e) => {
  if (e.message === "localechange") {
    initLocales();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  resetBtn.addEventListener("click", async () => {
    await chrome.storage.local.remove("locale");
    initLocales();
    chrome.runtime.sendMessage({
      message: "localechange",
    });
  });
});
