import { toggleButton, resetBtn } from "../app.js";
import { appendImg } from "./appendImage.js";
import { getGreeting } from "./greetings.js";

export const nameInput = document.getElementById("name-field");
export const nameBtn = document.getElementById("submit-name");
nameBtn.addEventListener("click", () => {
  toggleButton(nameBtn, false);
  if (nameInput.value.length > 0) {
    localStorage.setItem("name", nameInput.value);
  } else {
    localStorage.removeItem("name");
  }
  getGreeting();
});
nameInput.addEventListener("input", () => {
  toggleButton(nameBtn, true);
  appendImg(
    {
      image:
        nameInput.value.length > 0
          ? "/assets/images/buttons/save.svg"
          : "/assets/images/buttons/clear.svg",
    },
    nameBtn
  );
});
document.addEventListener("DOMContentLoaded", () => {
  appendImg({ image: "assets/images/buttons/save.svg" }, nameBtn);
  resetBtn.addEventListener("click", async () => {
    nameInput.value = "";
    appendImg({ image: "/assets/images/buttons/save.svg" }, nameBtn);
    toggleButton(nameBtn, false);
  });
});
