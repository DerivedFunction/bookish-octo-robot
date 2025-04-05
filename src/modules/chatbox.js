import { query } from "./query.js";

export const chatbox = document.getElementById("chatbox");
export const trOption = document.getElementById("content-transparent"); // Function to update inactivity behavior
export let inactivityTimeout = null;
export let inactivitySetting = null;
export function updateInactivityBehavior() {
  inactivitySetting = localStorage.getItem("inactivity") || "-1";
  const timeoutSeconds = parseInt(inactivitySetting);

  // Clear any existing timeout
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }

  // Reset to full opacity when updating
  chatbox.style.opacity = "1";

  // Apply behavior based on setting
  if (timeoutSeconds === -1) {
    // Never fade: ensure it stays opaque
    chatbox.style.opacity = "1";
  } else if (timeoutSeconds === 0) {
    // Instantly fade when not hovered
    if (!chatbox.matches(":hover")) {
      chatbox.style.opacity = "0.1";
    }
  } else {
    // Delayed fade when not hovered
    if (!chatbox.matches(":hover")) {
      inactivityTimeout = setTimeout(() => {
        chatbox.style.opacity = "0.1";
      }, timeoutSeconds * 1000);
    }
  }
}
// Handle hover events
chatbox.addEventListener("mouseenter", () => {
  if (inactivityTimeout) {
    clearTimeout(inactivityTimeout);
    inactivityTimeout = null;
  }
  chatbox.style.opacity = "1";
});
chatbox.addEventListener("mouseleave", () => {
  const timeoutSeconds = parseInt(inactivitySetting);
  if (timeoutSeconds === -1 || query.matches(":focus")) return; // Never fade
  if (timeoutSeconds === 0) {
    chatbox.style.opacity = "0.1";
  } else {
    inactivityTimeout = setTimeout(() => {
      chatbox.style.opacity = "0.1";
    }, timeoutSeconds * 1000);
  }
});
// Handle dropdown change
trOption.addEventListener("change", () => {
  const option = trOption.options[trOption.selectedIndex].value;
  localStorage.setItem("inactivity", option);
  updateInactivityBehavior();
});

document.addEventListener("DOMContentLoaded", () => {
  // Set initial styles to ensure chatbox starts fully opaque
  chatbox.style.opacity = "1";
  chatbox.style.transition = "opacity 0.3s ease";
  // Load and apply stored inactivity setting
  inactivitySetting = localStorage.getItem("inactivity") || "-1"; // Default to "Never Fade"
  for (let i = 0; i < trOption.options.length; i++) {
    if (trOption.options[i].value === inactivitySetting) {
      trOption.options[i].selected = true;
      break;
    }
  }
  document.getElementById("reset").addEventListener("click", () => {
    localStorage.removeItem("inactivity");
    updateInactivityBehavior;
  });
  updateInactivityBehavior(); // Apply the stored inactivity setting
});
