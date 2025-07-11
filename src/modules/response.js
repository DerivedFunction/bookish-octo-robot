import { appendImg } from "./appendImage.js";

export const chatBotResponse = document.getElementById("response-box-popup");
export const responseBox = document.getElementById("response-box");
const button = chatBotResponse.querySelector("button");
appendImg({ image: "assets/images/buttons/close.svg" }, button);
button.addEventListener("click", () => {
  chatBotResponse.style.display = "none";
});
