const tooltip = document.getElementById("tooltip");
import { t } from "./locales.js";

export function setupTooltip(element, condition = () => true, message = null) {
  const hideTooltip = () => {
    // don't hide if the mouse is on the tooltip
    if (!tooltip.matches(":hover")) tooltip.style.display = "none";
  };

  element.addEventListener("mouseover", () => {
    if (!condition()) return;
    const rect = element.getBoundingClientRect();
    const tooltipWidth = tooltip.offsetWidth;
    const viewportWidth = window.innerWidth;
    const padding = 20; // Space from screen edges

    // Default: above element (original behavior)
    let left = rect.left + window.scrollX;
    let top = rect.top + window.scrollY - 30;

    // Adjust if tooltip is too close to edges
    if (top < padding) {
      // Place below
      top = rect.bottom + window.scrollY + 5;
    }
    if (left < padding) {
      // Shift right
      left = padding;
    } else if (left + tooltipWidth > viewportWidth - padding) {
      // Shift left
      left = viewportWidth - tooltipWidth - padding;
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.textContent = message
      ? t(message)
      : t(element.getAttribute("data-tooltip"));
    tooltip.style.display = "block";
  });

  element.addEventListener("mouseout", hideTooltip);
  document.addEventListener("keydown", () => {
    hideTooltip();
  });
  document.addEventListener("click", hideTooltip);
}
