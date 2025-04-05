export function appendSvg(object, container, gap = null, replace = true) {
  fetch(object.image)
    .then((response) => response.text())
    .then((svgContent) => {
      const parser = new DOMParser();
      const svgDoc = parser.parseFromString(svgContent, "image/svg+xml");
      const svg = svgDoc.querySelector("svg");
      if (svg) {
        svg.setAttribute("width", "20");
        svg.setAttribute("height", "20");
        svg.style.width = "20px";
        svg.style.height = "20px";
        if (gap) container.style.gap = gap;
        if (replace) {
          // check if the current icon is the same as the new one
          const currentIcon = container.querySelector("svg");
          if (currentIcon && currentIcon.outerHTML !== svg.outerHTML) {
            container.replaceChild(svg, currentIcon); // Replace existing icon
          } else {
            container.appendChild(svg); // Append new icon
          }
        } else {
          container.insertBefore(svg, container.firstChild); // Insert icon before text
        }
      }
    })
    .catch((error) => console.error("Error loading SVG:", error));
}
