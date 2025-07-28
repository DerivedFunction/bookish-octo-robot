(() => {
  // Prevent multiple instances
  if (window.customPopupWidget) return;
  window.customPopupWidget = true;

  // Create the minimized widget (initial state)
  const minimized = document.createElement("div");
  minimized.id = "custom-popup-minimized";
  minimized.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 50px;
        height: 50px;
        background: linear-gradient(135deg, #b0b0b0 0%, #808080 100%);
        border-radius: 50%;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
    `;
  minimized.innerHTML = `<img src="${chrome.runtime.getURL(
    "./assets/images/icon/icon32.png"
  )}"></img>`;
  document.body.appendChild(minimized);

  // Create the expanded widget
  const widget = document.createElement("div");
  widget.id = "custom-popup-widget";

  // Widget styles
  widget.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 300px;
        background: linear-gradient(135deg, #b0b0b0 0%, #808080 100%);
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        z-index: 10000;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: #333;
        transition: all 0.3s ease;
        border: 1px solid rgba(255, 255, 255, 0.1);
        display: none;
    `;

  // Widget HTML content
  widget.innerHTML = `
        <div style="padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; gap: 8px;">
                    <button id="widget-minimize" style="
                        background: rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(0, 0, 0, 0.2);
                        border-radius: 6px;
                        width: 32px;
                        height: 32px;
                        color: #333;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 12px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(0,0,0,0.2)'" onmouseout="this.style.background='rgba(0,0,0,0.1)'">−</button>
                    <button id="widget-close" style="
                        background: rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(0, 0, 0, 0.2);
                        border-radius: 6px;
                        width: 32px;
                        height: 32px;
                        color: #333;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        font-size: 16px;
                        transition: background 0.2s;
                    " onmouseover="this.style.background='rgba(0,0,0,0.2)'" onmouseout="this.style.background='rgba(0,0,0,0.1)'">×</button>
                    <button id="grab-text-btn" style="
                        background: rgba(0, 0, 0, 0.1);
                        border: 1px solid rgba(0, 0, 0, 0.2);
                        border-radius: 6px;
                        width: 32px;
                        height: 32px;
                        color: #333;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        transition: background 0.2s;
                    ">
                        <img src="${chrome.runtime.getURL(
                          "./assets/images/buttons/picker.svg"
                        )}" style="width: 20px; height: 20px;">
                    </button>
                </div>
            </div>
            
            <div id="extracted-text-area">
                <div style="background: #f5f5f5; border-radius: 12px; padding: 8px; border: 1px solid #ccc;">
                    <textarea id="extracted-text" style="
                        width: 100%;
                        height: 60px;
                        background: transparent;
                        border: none;
                        padding: 8px;
                        color: #333;
                        font-size: 12px;
                        font-family: monospace;
                        resize: vertical;
                        margin-bottom: 12px;
                        box-sizing: border-box;
                        outline: none;
                    "></textarea>
                </div>
                
                <div id="ai-list" style="
                    display: flex;
                    gap: 8px;
                    flex-wrap: wrap;
                    padding-right: 4px;
                ">
                </div>
            </div>
        </div>
    `;

  // Add widget to page
  document.body.appendChild(widget);

  // Widget state
  let isGrabMode = false;
  let originalCursor = "";
  let hoverOverlay = null;
  let aiList = [];
  let prompts = [];

  // Load AI list and prompts
  async function loadAIList() {
    try {
      const response = await fetch(chrome.runtime.getURL("ai-list.json"));
      if (!response.ok) throw new Error("Failed to load AI list");
      const data = await response.json();
      aiList = data["ai-list"];
      prompts = data["prompts"];
    } catch (error) {
      console.error("Error loading AI list:", error);
    }
  }

  // Initialize by loading AI list and showing suggestions
  loadAIList().then(() => {
    showAISuggestions();
  });

  // Show expanded widget when minimized is clicked
  minimized.addEventListener("click", () => {
    minimized.style.display = "none";
    widget.style.display = "block";
  });

  // Close widget
  document.getElementById("widget-close").addEventListener("click", () => {
    cleanup();
    widget.remove();
    minimized.remove();
    delete window.customPopupWidget;
  });

  // Minimize widget
  document.getElementById("widget-minimize").addEventListener("click", () => {
    cleanup();
    widget.style.display = "none";
    minimized.style.display = "flex";
  });

  // Grab text functionality
  document.getElementById("grab-text-btn").addEventListener("click", () => {
    if (isGrabMode) {
      stopGrabMode();
    } else {
      startGrabMode();
    }
  });

  function startGrabMode() {
    isGrabMode = true;
    originalCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";

    const grabBtn = document.getElementById("grab-text-btn");
    grabBtn.style.background = "rgba(200, 200, 200, 0.9)";
    grabBtn.style.borderColor = "#4CAF50";
    grabBtn.style.boxShadow = "0 0 5px #4CAF50";

    // Add event listeners for element selection
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleElementClick, true);
  }

  function stopGrabMode() {
    isGrabMode = false;
    document.body.style.cursor = originalCursor;

    const grabBtn = document.getElementById("grab-text-btn");
    grabBtn.style.background = "rgba(0, 0, 0, 0.1)";
    grabBtn.style.borderColor = "rgba(0, 0, 0, 0.2)";
    grabBtn.style.boxShadow = "none";

    cleanup();
  }

  function cleanup() {
    // Remove event listeners
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleElementClick, true);

    // Remove hover overlay
    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
  }

  function handleMouseOver(e) {
    if (!isGrabMode || e.target.closest("#custom-popup-widget")) return;

    // Remove existing overlay
    if (hoverOverlay) {
      hoverOverlay.remove();
    }

    // Create hover overlay
    const rect = e.target.getBoundingClientRect();
    hoverOverlay = document.createElement("div");
    hoverOverlay.style.cssText = `
            position: fixed;
            top: ${rect.top}px;
            left: ${rect.left}px;
            width: ${rect.width}px;
            height: ${rect.height}px;
            background: rgba(128, 128, 128, 0.3);
            border: 2px solid #808080;
            pointer-events: none;
            z-index: 9999;
            border-radius: 4px;
        `;
    document.body.appendChild(hoverOverlay);
  }

  function handleMouseOut(e) {
    if (!isGrabMode) return;

    if (hoverOverlay && !e.relatedTarget?.closest("#custom-popup-widget")) {
      // Keep overlay when moving to widget
    }
  }

  function handleElementClick(e) {
    if (!isGrabMode || e.target.closest("#custom-popup-widget")) return;

    e.preventDefault();
    e.stopPropagation();

    // Extract text content
    const element = e.target;
    let textContent = element.textContent?.trim() || "";

    // If no text content, try to get useful attributes
    if (!textContent) {
      const alt = element.getAttribute("alt");
      const title = element.getAttribute("title");
      const placeholder = element.getAttribute("placeholder");
      const value = element.value;

      textContent = alt || title || placeholder || value || "[No text content]";
    }

    // Display extracted text
    document.getElementById("extracted-text").value = textContent;
    document.getElementById("extracted-text-area").style.display = "block";
    // Show AI suggestions
    showAISuggestions();

    // Stop grab mode
    stopGrabMode();
  }

  async function showAISuggestions() {
    const aiArea = document.getElementById("ai-list");
    aiArea.innerHTML = "";

    // Add AI chat options
    aiList.forEach((ai) => {
      const button = document.createElement("button");
      button.style.cssText = `
        background: rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(0, 0, 0, 0.2);
        border-radius: 6px;
        padding: 8px;
        color: #333;
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s;
      `;

      const img = document.createElement("img");
      img.src = chrome.runtime.getURL(ai.image);
      img.style.cssText = `
        width: 16px;
        height: 16px;
        border-radius: 4px;
      `;

      button.appendChild(img);

      button.addEventListener("mouseover", () => {
        button.style.background = "rgba(0, 0, 0, 0.2)";
      });

      button.addEventListener("mouseout", () => {
        button.style.background = "rgba(0, 0, 0, 0.1)";
      });
      button.addEventListener("click", async () => {
        curAI = ai;
        const prompt = document.getElementById("extracted-text").value;
        chrome.runtime.sendMessage({
          message: "newPrompt",
          prompt: prompt,
          ai: curAI,
        });
      });
      aiArea.appendChild(button);
    });
  }

  // Make minimized widget draggable
  let isDraggingMin = false;
  let startXMin, startYMin, startLeftMin, startTopMin;

  minimized.addEventListener("mousedown", (e) => {
    isDraggingMin = true;
    startXMin = e.clientX;
    startYMin = e.clientY;
    startLeftMin = parseInt(window.getComputedStyle(minimized).right);
    startTopMin = parseInt(window.getComputedStyle(minimized).top);

    minimized.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingMin) return;

    const deltaX = startXMin - e.clientX;
    const deltaY = e.clientY - startYMin;

    minimized.style.right = startLeftMin + deltaX + "px";
    minimized.style.top = startTopMin + deltaY + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isDraggingMin) {
      isDraggingMin = false;
      minimized.style.cursor = "pointer";
    }
  });

  // Make widget draggable
  let isDragging = false;
  let startX, startY, startLeft, startTop;

  widget.addEventListener("mousedown", (e) => {
    if (
      e.target.tagName === "BUTTON" ||
      e.target.tagName === "TEXTAREA" ||
      isGrabMode
    )
      return;

    isDragging = true;
    startX = e.clientX;
    startY = e.clientY;
    startLeft = parseInt(window.getComputedStyle(widget).right);
    startTop = parseInt(window.getComputedStyle(widget).top);

    widget.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = startX - e.clientX;
    deltaY = e.clientY - startY;

    widget.style.right = startLeft + deltaX + "px";
    widget.style.top = startTop + deltaY + "px";
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      widget.style.cursor = "default";
    }
  });

  // Add hover effects
  minimized.addEventListener("mouseenter", () => {
    minimized.style.transform = "scale(1.1)";
  });

  minimized.addEventListener("mouseleave", () => {
    minimized.style.transform = "scale(1)";
  });

  console.log("Text Grabber widget loaded successfully!");
})();
let curAI;
