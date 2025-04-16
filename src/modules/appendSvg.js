import { setupTooltip } from "./tooltip.js";

export function appendSvg(
  object,
  container,
  gap = null,
  replace = true,
  asImg = false
) {
  // Use provided size or default to 20px
  const size = object.size || "20px";

  if (asImg) {
    const img = document.createElement("img");
    img.src = object.image;
    img.width = parseInt(size);
    img.height = parseInt(size);
    img.style.width = size;
    img.style.height = size;
    img.alt = object.description || "icon";

    if (gap) container.style.gap = gap;

    if (replace) {
      const currentIcon = container.querySelector("img");
      if (currentIcon && currentIcon.src !== img.src) {
        container.replaceChild(img, currentIcon);
      } else if (!currentIcon) {
        container.appendChild(img);
      }
    } else {
      container.insertBefore(img, container.firstChild);
    }

    if (object.description) {
      setupTooltip(img, () => img.matches(":hover"), object.description);
    }
  } else {
    fetch(object.image)
      .then((response) => response.text())
      .then((svgContent) => {
        const parser = new DOMParser();
        const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
        const svg = svgDoc.querySelector("svg");

        if (svg) {
          svg.setAttribute("width", size);
          svg.setAttribute("height", size);
          svg.style.width = size;
          svg.style.height = size;

          if (gap) container.style.gap = gap;

          if (replace) {
            const currentIcon = container.querySelector("svg");
            if (currentIcon && currentIcon.outerHTML !== svg.outerHTML) {
              container.replaceChild(svg, currentIcon);
            } else if (!currentIcon) {
              container.appendChild(svg);
            }
          } else {
            container.insertBefore(svg, container.firstChild);
          }

          if (object.description) {
            setupTooltip(svg, () => svg.matches(":hover"), object.description);
          }
        }
      })
      .catch((error) => console.error("Error loading SVG:", error));
  }
}
