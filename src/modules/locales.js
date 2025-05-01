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
// Handle localization
const DEFAULT_LOCALE = "en";
let currentLocale = DEFAULT_LOCALE;
let translations = {};

export async function initLocales() {
  await chrome.storage.local.get("locale").then(async (e) => {
    currentLocale =
      e.locale || navigator.language.split("-")[0] || DEFAULT_LOCALE;
  });
  await loadTranslations(currentLocale);
  initLocaleSelector();
  updateUIText();
}
const localeSelect = document.getElementById("locale-select");
export function initLocaleSelector() {
  if (localeSelect) {
    localeSelect.value = currentLocale;
    localeSelect.addEventListener("change", async (e) => {
      await loadTranslations(e.target.value);
      window.dispatchEvent(new Event("localechange"));
      chrome.runtime.sendMessage({
        message: "localechange",
        locale: e.target.value,
      });
    });
  }
}

export async function loadTranslations(locale) {
  try {
    const response = await fetch(`/locales/${locale}/messages.json`);
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
    chrome.storage.local.set({ locale });
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
  document.querySelector("#se-label").textContent = t(
    "tooltip_search_everywhere"
  );
  closeScriptBtn.textContent = t("close_button");
  exp_sidebar.querySelector("h1").textContent = t("tooltip_experimental");
  exp_sidebar.querySelector("p").textContent = t("scripts_desc");
  exp_sidebar.querySelector("#enabled-label").textContent = t("enabled_label");
  exp_sidebar.querySelector("#supported-label").textContent =
    t("supported_label");
  exp_sidebar.querySelector("#required-label").textContent =
    t("required_label");
  exp_sidebar.querySelector("#image-support-label").textContent = t(
    "image_support_label"
  );
  exp_sidebar.querySelector("#unstable-section label").textContent =
    t("unstable_label");
  exp_sidebar.querySelector("#unstable-section p").textContent =
    t("unstable_p");
  enableAll.textContent = t("enable_all");
  revokeAll.textContent = t("revoke_all");
}

// Listen for locale changes
window.addEventListener("localechange", updateUIText);
chrome.runtime.onMessage.addListener((e) => {
  if (e.message === "localechange") {
    initLocales();
  }
});

document.addEventListener("DOMContentLoaded", () => {
  resetBtn.addEventListener("click", () => {
    initLocales();
  });
});
