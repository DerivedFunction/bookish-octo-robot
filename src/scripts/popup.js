(() => {
  // Prevent multiple instances
  if (window.customPopupWidget) return;
  window.customPopupWidget = true;

  // Inject CSS for theme variables
  const style = document.createElement("style");
  style.textContent = `
    :root {
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --background: #f5f5f5;
      --border-radius: 10px;
      --scrollbar-width: 3px;
    }
    @media (prefers-color-scheme: dark) {
      :root {
        --background: #262624;
      }
    }
    [data-theme="light"] {
      --item-bg: #ffffff;
      --text-color: #333;
      --main-text-color: #000;
      --secondary-text-color: #666;
      --border-color: #ddd;
      --hover-bg: #e8e8e8;
      --active-bg: #d8d8d8;
      --shadow-color: rgba(0, 0, 0, 0.05);
      --shadow-hover: rgba(0, 0, 0, 0.1);
      --border-hover: #bbb;
      --accent-color: #000;
      --active-color: #3b82f6;
      --scrollbar-track: #f1f1f1;
      --scrollbar-thumb: #888;
      --scrollbar-thumb-hover: #555;
    }
    [data-theme="dark"] {
      --item-bg: #2d2d2d;
      --text-color: #e0e0e0;
      --main-text-color: #fff;
      --secondary-text-color: #aaa;
      --border-color: #444;
      --hover-bg: #383838;
      --active-bg: #252525;
      --shadow-color: rgba(0, 0, 0, 0.3);
      --shadow-hover: rgba(0, 0, 0, 0.5);
      --border-hover: #666;
      --accent-color: #fff;
      --active-color: #60a5fa;
      --scrollbar-track: #333;
      --scrollbar-thumb: #666;
      --scrollbar-thumb-hover: #999;
    }
    #custom-popup-widget, #custom-popup-minimized {
      font-family: var(--font);
      background: var(--background);
      color: var(--text-color);
    }
    button {
      padding: 6px 6px;
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      background: var(--item-bg);
      color: var(--text-color);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    button:hover {
      background: var(--hover-bg);
      border-color: var(--border-hover);
    }
    button:active {
      background: var(--active-bg);
    }
    #extracted-text-area div {
      background: var(--item-bg);
      border: 1px solid var(--border-color);
      border-radius: var(--border-radius);
      padding: 8px;
      box-shadow: 0 2px 4px var(--shadow-color);
      text-align: center;
    }
    #extracted-text {
      width: 90%;
      height: 60px;
      background: transparent;
      border: none;
      color: var(--text-color);
      font-family: var(--font);
      font-size: 12px;
      resize: vertical;
      outline: none;
      display: inline-block;
      text-align: left;
      max-height: 200px;
    }
    #grab-text-btn img {
      filter: none;
    }
    [data-theme="dark"] #grab-text-btn img {
      filter: invert(1);
    }
    ::-webkit-scrollbar {
      width: var(--scrollbar-width);
      height: var(--scrollbar-width);
    }
    ::-webkit-scrollbar-track {
      background: var(--scrollbar-track);
      border-radius: var(--scrollbar-width);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--scrollbar-thumb);
      border-radius: var(--scrollbar-width);
    }
    ::-webkit-scrollbar-thumb:hover {
      background: var(--scrollbar-thumb-hover);
    }
  `;
  document.head.appendChild(style);

  // Create the minimized widget (initial state)
  const minimized = document.createElement("div");
  minimized.id = "custom-popup-minimized";
  minimized.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        box-shadow: 0 4px 20px var(--shadow-color);
        z-index: 10000;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);
    `;
  minimized.innerHTML = `<img src="${chrome.runtime.getURL(
    "./assets/images/icon/icon32.png"
  )}">`;
  document.body.appendChild(minimized);

  // Create the expanded widget
  const widget = document.createElement("div");
  widget.id = "custom-popup-widget";
  widget.dataset.theme =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";

  // Widget styles
  widget.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        width: 350px;
        border-radius: var(--border-radius);
        box-shadow: 0 8px 32px var(--shadow-color);
        z-index: 10000;
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);
        display: none;
    `;

  // Widget HTML content
  widget.innerHTML = `
        <div style="padding: 16px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div style="display: flex; gap: 8px;">
                    <button id="widget-minimize" style="width: 32px; height: 32px; font-size: 12px;">−</button>
                    <button id="widget-close" style="width: 32px; height: 32px; font-size: 16px;">×</button>
                    <button id="grab-text-btn" style="width: 32px; height: 32px;">
                        <img src="${chrome.runtime.getURL(
                          "./assets/images/buttons/picker.svg"
                        )}" style="width: 20px; height: 20px;">
                    </button>
                </div>
            </div>
            <div id="extracted-text-area">
                <div>
                    <textarea id="extracted-text"></textarea>
                </div>
                <div id="ai-list" style="display: flex; gap: 8px; flex-wrap: wrap; padding-right: 4px; margin-top: 8px;"></div>
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
  let minPos = { top: 20, right: 20 };

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
    widget.style.top = `${minPos.top}px`;
    widget.style.right = `${minPos.right}px`;
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
    minimized.style.top = `${widget.style.top}`;
    minimized.style.right = `${widget.style.right}`;
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
    grabBtn.style.background = "var(--active-bg)";
    grabBtn.style.borderColor = "var(--active-color)";
    grabBtn.style.boxShadow = "0 0 5px var(--active-color)";

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleElementClick, true);
  }

  function stopGrabMode() {
    isGrabMode = false;
    document.body.style.cursor = originalCursor;

    const grabBtn = document.getElementById("grab-text-btn");
    grabBtn.style.background = "var(--item-bg)";
    grabBtn.style.borderColor = "var(--border-color)";
    grabBtn.style.boxShadow = "none";

    cleanup();
  }

  function cleanup() {
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleElementClick, true);

    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
  }

  function handleMouseOver(e) {
    if (!isGrabMode || e.target.closest("#custom-popup-widget")) return;

    if (hoverOverlay) {
      hoverOverlay.remove();
    }

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
    }
  }

  function handleElementClick(e) {
    if (!isGrabMode || e.target.closest("#custom-popup-widget")) return;

    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    let textContent = element.textContent?.trim() || "";

    if (!textContent) {
      const alt = element.getAttribute("alt");
      const title = element.getAttribute("title");
      const placeholder = element.getAttribute("placeholder");
      const value = element.value;
      textContent = alt || title || placeholder || value || "[No text content]";
    }

    document.getElementById("extracted-text").value = textContent;
    document.getElementById("extracted-text-area").style.display = "block";
    showAISuggestions();

    stopGrabMode();
  }

  async function showAISuggestions() {
    const aiArea = document.getElementById("ai-list");
    aiArea.innerHTML = "";

    aiList.forEach((ai) => {
      const button = document.createElement("button");
      button.style.cssText = `
        background: var(--item-bg);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        padding: 8px;
        color: var(--text-color);
        cursor: pointer;
        font-size: 13px;
        display: flex;
        align-items: center;
        gap: 8px;
        transition: all 0.2s ease;
      `;
      const img = document.createElement("img");
      img.src = chrome.runtime.getURL(ai.image);
      img.style.cssText = `width: 16px; height: 16px; border-radius: 4px;`;
      button.appendChild(img);

      button.addEventListener("mouseover", () => {
        button.style.background = "var(--hover-bg)";
      });
      button.addEventListener("mouseout", () => {
        button.style.background = "var(--item-bg)";
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
    startLeftMin = parseInt(window.getComputedStyle(minimized).right) || 20;
    startTopMin = parseInt(window.getComputedStyle(minimized).top) || 20;

    minimized.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDraggingMin) return;

    const deltaX = startXMin - e.clientX;
    const deltaY = e.clientY - startYMin;

    minPos.right = startLeftMin + deltaX;
    minPos.top = startTopMin + deltaY;
    minimized.style.right = `${minPos.right}px`;
    minimized.style.top = `${minPos.top}px`;
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
    startLeft = parseInt(window.getComputedStyle(widget).right) || minPos.right;
    startTop = parseInt(window.getComputedStyle(widget).top) || minPos.top;

    widget.style.cursor = "grabbing";
    e.preventDefault();
  });

  document.addEventListener("mousemove", (e) => {
    if (!isDragging) return;

    const deltaX = startX - e.clientX;
    const deltaY = e.clientY - startY;

    widget.style.right = `${startLeft + deltaX}px`;
    widget.style.top = `${startTop + deltaY}px`;
  });

  document.addEventListener("mouseup", () => {
    if (isDragging) {
      isDragging = false;
      widget.style.cursor = "default";
      minPos.right = parseInt(widget.style.right) || minPos.right;
      minPos.top = parseInt(widget.style.top) || minPos.top;
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
