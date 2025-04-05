import { weatherField } from "./weather.js";
import { nameInput } from "./nameInput.js";
import { appendSvg } from "./appendSvg.js";
export const optionBtn = document.getElementById("options-button");
optionBtn.addEventListener("click", () => {
  sidebar.style.display = "block";
  nameInput.value = localStorage.getItem("name") || "";
  let x = JSON.parse(localStorage.getItem("location"));
  weatherField.value = x ? x.name : "";
});
const sidebar = document.getElementById("sidebar");
document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && !optionBtn.contains(e.target)) {
    sidebar.style.display = "none";
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/options.svg" }, optionBtn);
});
