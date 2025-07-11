import { resetBtn } from "../app.js";
import { t } from "./locales.js";

export const greeting = document.getElementById("greeting-form");
export const greetingContainer = document.getElementById("greeting-container");
greeting.addEventListener("change", async (e) => {
  localStorage.setItem("greeting", e.target.value);
  if (e.target.value === "custom") {
    let x = prompt(t("enter_custom_greeting"), t("greeting_hello"));
    localStorage.setItem("greeting", x ? x : t("greeting_hello"));
  }
  getGreeting();
});
export function getGreeting() {
  let x = document.getElementById("greeting");
  let x2 = document.getElementById("secondary");
  let y = localStorage.getItem("name");
  let z = localStorage.getItem("greeting");
  if (!z) {
    localStorage.setItem("greeting", "none");
    z = "none";
  }
  const now = new Date();
  const hour = now.getHours();

  let greeting = "";
  switch (z) {
    case "formal":
      if (hour >= 4 && hour < 12) {
        greeting = t("greeting_morning");
      } else if (hour >= 12 && hour < 16) {
        greeting = t("greeting_afternoon");
      } else if ((hour >= 16 && hour < 24) || (hour >= 0 && hour < 4)) {
        greeting = t("greeting_evening");
      }
      break;
    case "informal":
      greeting = t("greeting_hello");
      break;
    case "none":
      greeting = null;
      break;
    default:
      greeting = z;
  }
  greetingContainer.style.display = !greeting ? "none" : "";
  x.textContent = y
    ? t("welcome_name", { GREETING: greeting, NAME: y })
    : t("welcome", { GREETING: greeting });
  x2.textContent = greeting ? t("greeting_help") : "";
}
document.addEventListener("DOMContentLoaded", () => {
  const storedGreeting = localStorage.getItem("greeting");
  const options = Array.from(greeting.querySelectorAll("input"));
  if (storedGreeting) {
    let x = false;
    options.forEach((option) => {
      if (option.value === storedGreeting) {
        option.checked = true;
        x = true;
      }
    });
    if (!x) options[2].checked = true;
  } else {
    options[3].checked = true;
  }

  resetBtn.addEventListener("click", async () => {
    localStorage.removeItem("greeting");
    localStorage.removeItem("name");
    greeting.querySelectorAll("input").forEach((option) => {
      option.checked = false;
    });
    getGreeting();
  });
});
