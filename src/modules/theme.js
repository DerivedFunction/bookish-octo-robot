import { resetBtn } from "../app.js";
export const userThemeForm = document.getElementById("user-theme");
userThemeForm.addEventListener("change", async (e) => {
  localStorage.setItem("user-theme", e.target.value);
  if (e.target.value === "auto") {
   document.body.removeAttribute("data-theme");
   // check if system prefers dark mode
   const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
   document.body.setAttribute(
     "data-theme",
     prefersDarkScheme.matches ? "dark" : "light"
   );
    return;
  }
  const lightTheme = e.target.value === "true";
  document.body.setAttribute("data-theme", lightTheme ? "light" : "dark");
});
document.addEventListener("DOMContentLoaded", () => {
  const storedTheme = localStorage.getItem("user-theme") || "auto";
  userThemeForm.querySelectorAll("input").forEach((option) => {
    if (option.value === storedTheme) {
      option.checked = true;
    }
  });
  if (storedTheme === "auto") {
    document.body.removeAttribute("data-theme");
    // check if system prefers dark mode
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    document.body.setAttribute(
      "data-theme",
      prefersDarkScheme.matches ? "dark" : "light"
    );
  } else {
    document.body.setAttribute(
      "data-theme",
      storedTheme === "true" ? "light" : "dark"
    );
  }
  resetBtn.addEventListener("click", async () => {
    document.body.removeAttribute("data-theme");
    userThemeForm.querySelectorAll("input").forEach((option) => {
      option.checked = false;
    });
   // check if system prefers dark mode
    const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
    document.body.setAttribute(
      "data-theme",
      prefersDarkScheme.matches ? "dark" : "light"
    );
  });
});
