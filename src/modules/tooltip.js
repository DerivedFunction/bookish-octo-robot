import { query } from "./query.js";

const tooltip = document.getElementById("tooltip");
export function setupTooltip(element, condition = () => true, message = null) {
  const hideTooltip = () => {
    tooltip.style.display = "none";
  };

  element.addEventListener("mouseover", () => {
    if (!condition()) return;
    const rect = element.getBoundingClientRect();
    tooltip.style.left = `${rect.left + window.scrollX}px`;
    tooltip.style.top = `${rect.top + window.scrollY - 30}px`;
    tooltip.textContent = message
      ? message
      : element.getAttribute("data-tooltip");
    tooltip.style.display = "block";
  });

  element.addEventListener("mouseout", hideTooltip);
  document.addEventListener("keydown", () => {
    hideTooltip();
  });
  document.addEventListener("click", hideTooltip);
}
