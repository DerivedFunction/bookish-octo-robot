import { query } from "./query.js";
import { getGreeting } from "./greetings.js";
import { resetBtn } from "../app.js";
import { closeBtn } from "./sidebar.js";
import { suggestDisplay } from "./suggestions.js";
import { userThemeForm } from "./theme.js";
import { getSuggestionButtons } from "./suggestions.js";
// Handle localization
const DEFAULT_LOCALE = "en";
let currentLocale = DEFAULT_LOCALE;
let translations = {};

export async function initLocales() {
  currentLocale =
    localStorage.getItem("locale") ||
    navigator.language.split("-")[0] ||
    DEFAULT_LOCALE;
  await loadTranslations(currentLocale);
  initLocaleSelector();
}
const localeSelect = document.getElementById("locale-select");
export function initLocaleSelector() {
  if (localeSelect) {
    localeSelect.value = currentLocale;
    localeSelect.addEventListener("change", async (e) => {
      await loadTranslations(e.target.value);

      window.dispatchEvent(new Event("localechange"));
    });
  }
}

export async function loadTranslations(locale) {
  try {
    const response = await fetch(`/_locales/${locale}/messages.json`);
    if (!response.ok) {
      console.warn(
        `Translations for ${locale} not found, falling back to ${DEFAULT_LOCALE}`
      );
      if (locale !== DEFAULT_LOCALE) {
        return loadTranslations(DEFAULT_LOCALE);
      }
      return;
    }
    translations = await response.json();
    currentLocale = locale;
    localStorage.setItem("locale", locale);
  } catch (error) {
    console.error("Error loading translations:", error);
  }
}

export function t(key, substitutions = {}) {
  const translation = translations[key];
  if (!translation) {
    console.warn(`Translation missing for key: ${key}`);
    return key;
  }

  let text = translation.message;
  Object.entries(substitutions).forEach(([key, value]) => {
    text = text.replace(new RegExp(`\\$${key}\\$`, "g"), value);
  });

  return text;
}

// Update UI text when locale changes
export function updateUIText() {
  getGreeting();
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
  document.querySelector('[for="formal"]').textContent = t("formal_option");
  document.querySelector('[for="informal"]').textContent = t("informal_option");
  document.querySelector('[for="custom"]').textContent = t("custom_option");
  document.querySelector('[for="no-greeting"]').textContent = t("none_option");
  document.querySelector("#lang").textContent = t("lang");
  document.querySelector("#theme-label").textContent = t("theme");
  userThemeForm.querySelectorAll("label").forEach((label) => {
    // find the label for attribute
    let input = label.getAttribute("for");
    label.textContent = t(`theme_${input}`);
  });
  document.querySelector("#se-label").textContent = t(
    "tooltip_search_everywhere"
  );
  getSuggestionButtons();
}

// Listen for locale changes
window.addEventListener("localechange", updateUIText);
