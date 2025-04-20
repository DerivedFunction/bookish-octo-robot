import { appendSvg } from "./appendSvg.js";

export const chatBotResponse = document.getElementById("response-box-popup");
export const responseBox = document.getElementById("response-box");
const button = chatBotResponse.querySelector("button");
appendSvg({ image: "assets/images/buttons/close.svg" }, button);
button.addEventListener("click", () => {
  chatBotResponse.style.display = "none";
});
