import { loadJsonData, toggleButton } from "../app.js";
import { goBtn, clearBtn } from "./actionButtons.js";
import { appendSvg } from "./appendSvg.js";
import { query, getCharCount } from "./query.js";

export const suggestionContainer = document.getElementById("suggestions");
export const suggestionResult = document.getElementById("suggestions-result");
async function getPrompt() {
  const { prompts: loadedPrompts } = await loadJsonData("ai");
  return loadedPrompts;
}
export async function getSuggestionButtons() {
  suggestionResult.innerHTML = "";

  const promptList = await getPrompt();
  if (!Array.isArray(promptList) || promptList.length === 0) {
    console.warn("No prompts available");
    return;
  }
  const fragment = document.createDocumentFragment(); // Use a fragment for better performance

  promptList.forEach((prompt) => {
    if (!prompt.id || !prompt.prompt) return; // Skip invalid prompts

    const btn = document.createElement("button");
    btn.textContent = prompt.id;
    btn.id = prompt.id;

    if (prompt.image) {
      appendSvg({ image: prompt.image }, btn, "4px", false);
    }

    btn.addEventListener("click", () => {
      if (goBtn.disabled) {
        query.value = prompt.prompt;
        getCharCount();
        toggleButton(clearBtn, true);
      } else {
        query.value = prompt.prompt + query.value;
      }
      findSuggestions();
    });

    fragment.appendChild(btn); // Append button to the fragment
  });
  suggestionContainer.replaceChildren(fragment); // Append the fragment to the container
}

async function findSuggestions() {
  const prompts = await getPrompt();
  const promptList = prompts.find((p) => p.prompt === query.value);
  if (
    !promptList ||
    !promptList.suggestions ||
    promptList.suggestions.length === 0
  ) {
    console.warn("No suggestions available for the current prompt");
    return;
  }
  const fragment = document.createDocumentFragment();
  promptList.suggestions.forEach((suggestion) => {
    const suggestionElement = document.createElement("button");
    suggestionElement.className = "suggestion-item";
    suggestionElement.textContent = suggestion;
    suggestionElement.setAttribute(
      "data-replace",
      promptList.replace ? promptList.replace : false
    );
    suggestionElement.addEventListener("click", () => {
      query.value = `${
        suggestionElement.getAttribute("data-replace") === "true"
          ? suggestion
          : query.value + suggestion
      }: `;
      suggestionResult.innerHTML = "";
      query.focus();
    });
    fragment.appendChild(suggestionElement);
  });
  suggestionResult.replaceChildren(fragment);
}
document.addEventListener("DOMContentLoaded", async () => {
  await getSuggestionButtons();
  document.getElementById("reset").addEventListener("click", async () => {
    await getSuggestionButtons();
  });
});
