import { resetBtn } from "../app.js";
export const greeting = document.getElementById("greeting-form");
const greetingContainer = document.getElementById("greeting-container");
greeting.addEventListener("change", async (e) => {
  localStorage.setItem("greeting", e.target.value);
  if (e.target.value === "custom") {
    let x = prompt("Enter greeting", "Hi");
    localStorage.setItem("greeting", x ? x : "Hi");
  }
  getGreeting();
});
export function getGreeting() {
  let x = document.getElementById("greeting");
  let x2 = document.getElementById("secondary");
  let y = localStorage.getItem("name");
  let z = localStorage.getItem("greeting");
  if (!z) {
    localStorage.setItem("greeting", "formal");
    z = "formal";
  }
  const now = new Date();
  const hour = now.getHours();

  let greeting = "";
  switch (z) {
    case "formal":
      if (hour >= 4 && hour < 12) {
        // Morning: 4:00 - 11:59
        greeting = "Good Morning";
      } else if (hour >= 12 && hour < 16) {
        // Afternoon: 12:00 - 15:59
        greeting = "Good Afternoon";
      } else if ((hour >= 16 && hour < 24) || (hour >= 0 && hour < 4)) {
        // Evening: 16:00 - 19:59
        greeting = "Good Evening";
      }
      break;
    case "informal":
      greeting = "Hello";
      break;
    case "none":
      greeting = null;
      break;
    default:
      greeting = z;
  }
  greetingContainer.style.display = !greeting ? "none" : "";
  x.textContent = y ? `${greeting}, ${y}.` : `${greeting}.`;
  x2.textContent = greeting ? `How can I help you today?` : "";
}
document.addEventListener("DOMContentLoaded", () => {
  getGreeting();
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
    options[0].checked = true;
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
