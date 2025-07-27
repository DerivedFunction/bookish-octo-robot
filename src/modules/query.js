import { goBtn } from "./actionButtons.js";
import { toggleButton, resetBtn } from "../app.js";
import { suggestionResult } from "./suggestions.js";
import { multiBtn, newClick } from "./searchEverywhere.js";
import { selectedEngine, toggleDropdown } from "./searchEngine.js";
import { hasScripts } from "./searchEngine.js";
import { t } from "./locales.js";
import { setupTooltip } from "./tooltip.js";

export const query = document.getElementById("search");

// Update placeholder when locale changes
window.addEventListener("localechange", () => {
  query.placeholder = t("search_placeholder");
});

export function getLimit() {
  return hasScripts ? selectedEngine?.limit || 0 : MAX_LIMIT;
}
query.addEventListener("input", () => {
  // Set the height to match the content (scrollHeight)
  chatbox.style.opacity = "1.0";
  queryEvents();
});
query.addEventListener("focus", () => {
  suggestionResult.innerHTML = "";
  chatbox.style.opacity = "1.0";
  // Set the height to match the content (scrollHeight)
  queryEvents();
});
query.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();

    if (!goBtn.disabled && query.value.length < getLimit()) {
      if (newClick) goBtn.click();
      else multiBtn.click();
    } else if (goBtn.disabled) {
      if (!newClick) {
        multiBtn.click();
        return;
      }
      let y = selectedEngine?.url;
      if (!y) toggleDropdown("open");
    }
  } else if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    query.value += "\n";
  }
});
export function queryEvents() {
  query.style.height = "auto"; // Reset height to auto
  query.style.height = `${query.scrollHeight}px`; // Recalculate height
  let x = query.value.length > 0;
  let y = selectedEngine?.url;
  toggleButton(goBtn, x && y);
  toggleButton(multiBtn, x);
  getCharCount();
}
export const MAX_LIMIT = 8000; // max char count
export function getCharCount() {
  const charLength = query.value.length;
  const LIMIT = getLimit();
  charCount.textContent = `${charLength}/${LIMIT}`;
  if (charLength >= LIMIT * 0.9) {
    charCount.style.color = "var(--danger-color)";
  } else if (charLength >= LIMIT * 0.7) {
    charCount.style.color = "var(--warning-color)";
  } else {
    charCount.style.color = ""; // Reset to default color
  }
}
export const charCount = document.getElementById("char-count");
export const delayCount = document.getElementById("delay-count");
export let delay = localStorage.getItem("delay") || 3000;
delayCount.addEventListener("click", () => {
  delay =
    parseInt(prompt(`${t("delay_prompt")} (ms):`, "3000")) ||
    localStorage.getItem("delay") ||
    3000;
  localStorage.setItem("delay", delay ?? 3000);
  delayCount.textContent = `${delay}ms`;
  chrome.storage.local.set({ delay: delay });
});
document.addEventListener("DOMContentLoaded", () => {
  charCount.style.display = "none";
  if (!delay) localStorage.setItem("delay", 3000);
  query.value = "";
  queryEvents();
  setupTooltip(delayCount);
  resetBtn.addEventListener("click", () => {
    delayCount.textContent = "";
    delay = 3000;
    chrome.storage.local.remove("delay");
    localStorage.removeItem("delay");
  });
});

chrome.runtime.onMessage.addListener((e) => {
  if (e?.message === "Experimental") {
    delayCount.textContent = e.status ? `${delay}ms` : "";
  }
});
