import { clearBtn, goBtn } from "./actionButtons.js";
import { toggleButton } from "../app.js";
import { suggestionResult } from "./suggestions.js";
import { getSearchEngineUrl, toggleDropdown } from "./searchEngine.js";
export const query = document.getElementById("search");
query.addEventListener("input", async () => {
  // Set the height to match the content (scrollHeight)
  chatbox.style.opacity = "1.0";
  await queryEvents();
});
query.addEventListener("focus", async () => {
  suggestionResult.innerHTML = "";
  chatbox.style.opacity = "1.0";
  // Set the height to match the content (scrollHeight)
  await queryEvents();
});
query.addEventListener("keydown", async (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    if (!goBtn.disabled && query.value.length < MAX_LIMIT) {
      goBtn.click();
    } else if (goBtn.disabled) {
      let y = await getSearchEngineUrl();
      if (!y) toggleDropdown("open");
    }
  } else if (e.key === "Enter" && e.shiftKey) {
    e.preventDefault();
    query.value += "\n";
  }
});
export async function queryEvents() {
  query.style.height = "auto"; // Reset height to auto
  query.style.height = `${query.scrollHeight}px`; // Recalculate height
  let x = query.value.length > 0;
  toggleButton(clearBtn, x);
  let y = await getSearchEngineUrl();
  toggleButton(goBtn, x && y);
  getCharCount();
}
export const MAX_LIMIT = 5000; // max char count
export function getCharCount() {
  const charLength = query.value.length;
  charCount.textContent = `${charLength}/${MAX_LIMIT}`;
  if (charLength >= MAX_LIMIT * 0.9) {
    charCount.style.color = "var(--danger-color)";
  } else if (charLength >= MAX_LIMIT * 0.7) {
    charCount.style.color = "var(--warning-color)";
  } else {
    charCount.style.color = ""; // Reset to default color
  }
}
export const charCount = document.getElementById("char-count");
document.addEventListener("DOMContentLoaded", () => {
  query.value = "";
});
