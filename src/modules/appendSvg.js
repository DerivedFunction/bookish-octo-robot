import { setupTooltip } from "./tooltip.js";

export function appendSvg(object, container, gap = null, replace = true) {
  fetch(object.image)
    .then((response) => response.text())
    .then((svgContent) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const svg = svgDoc.querySelector("svg");
      if (svg) {
        // Use provided size or default to 20px
        const size = object.size || "20px";
        svg.setAttribute("width", size);
        svg.setAttribute("height", size);
        svg.style.width = size;
        svg.style.height = size;
        if (gap) container.style.gap = gap;
        if (replace) {
          const currentIcon = container.querySelector("svg");
          if (currentIcon && currentIcon.outerHTML !== svg.outerHTML) {
            container.replaceChild(svg, currentIcon); // Replace existing icon
          } else {
            container.appendChild(svg); // Append new icon
          }
        } else {
          container.insertBefore(svg, container.firstChild); // Insert icon before text
        }
        if (object.description) {
          setupTooltip(svg, () => svg.matches(":hover"), object.description);
        }
      }
    })
    .catch((error) => console.error("Error loading SVG:", error));
}
