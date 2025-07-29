(() => {
  // Prevent multiple instances
  if (window.customPopupWidget) return;
  window.customPopupWidget = true;
  const IMG_DIR = "./assets/images/buttons/";
  // Common stylesheet text
  const styleText = `
    :host {
      --font: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      --background: #f5f5f5;
      --border-radius: 10px;
      --scrollbar-width: 3px;
    }
    @media (prefers-color-scheme: dark) {
      :host {
        --background: #262624;
      }
    }
    :host([data-theme="light"]) {
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
    :host([data-theme="dark"]) {
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
      resize: none;
      outline: none;
      display: inline-block;
      text-align: left;
      max-height: 200px;
      user-select: text;
      pointer-events: auto;
    }
    .invert {
      filter: none;
    }
    :host([data-theme="dark"]) .invert {
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

  // Create the minimized widget (initial state)
  const minimized = document.createElement("div");
  minimized.id = "custom-popup-minimized";
  const minimizedShadow = minimized.attachShadow({ mode: "open" });

  // Add styles to minimized shadow root
  const minimizedStyles = document.createElement("style");
  minimizedStyles.textContent =
    styleText +
    `
    :host {
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
      background: var(--background);
      color: var(--text-color);
      font-family: var(--font);
    }
    img {
      width: 16px;
      height: 16px;
    }
  `;
  minimizedShadow.appendChild(minimizedStyles);
  const minimizedImg = document.createElement("img");
  minimizedImg.src = chrome.runtime.getURL("./assets/images/icon/icon16.png");
  minimizedImg.alt = "Minimized icon";
  minimizedShadow.appendChild(minimizedImg);
  document.body.appendChild(minimized);

  // Create the expanded widget with shadow DOM
  const widget = document.createElement("div");
  widget.id = "custom-popup-widget";
  widget.dataset.theme =
    window.matchMedia &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  const widgetShadow = widget.attachShadow({ mode: "open" });

  // Add styles to widget shadow root
  const widgetStyles = document.createElement("style");
  widgetStyles.textContent =
    styleText +
    `
    :host {
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
      background: var(--background);
      color: var(--text-color);
      font-family: var(--font);
    }
  `;
  widgetShadow.appendChild(widgetStyles);

  const fragment = document.createDocumentFragment();

  // Container
  const container = document.createElement("div");
  container.style.cssText = "padding: 16px;";

  // Top button row
  const topRow = document.createElement("div");
  topRow.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  `;

  // Button group
  const buttonGroup = document.createElement("div");
  buttonGroup.style.cssText = "display: flex; gap: 8px;";

  // Minimize button
  const btnMinimize = document.createElement("button");
  btnMinimize.id = "widget-minimize";
  const minImg = document.createElement("img");
  minImg.src = chrome.runtime.getURL(`${IMG_DIR}mini.svg`);
  btnMinimize.appendChild(minImg);

  // Close button
  const btnClose = document.createElement("button");
  btnClose.id = "widget-close";
  const closeImg = document.createElement("img");
  closeImg.src = chrome.runtime.getURL(`${IMG_DIR}close.svg`);
  btnClose.appendChild(closeImg);

  // Grab text button
  const btnGrab = document.createElement("button");
  btnGrab.id = "grab-text-btn";
  const grabImg = document.createElement("img");
  grabImg.src = chrome.runtime.getURL(`${IMG_DIR}picker.svg`);
  btnGrab.appendChild(grabImg);

  // Eye button
  const btnEye = document.createElement("button");
  btnEye.id = "eye-btn";
  const eyeImg = document.createElement("img");
  eyeImg.src = chrome.runtime.getURL(`${IMG_DIR}eye.svg`);
  btnEye.appendChild(eyeImg);

  // Zapper button
  const btnZap = document.createElement("button");
  btnZap.id = "zapper-btn";
  const zapImg = document.createElement("img");
  zapImg.src = chrome.runtime.getURL(`${IMG_DIR}zapper.svg`);
  btnZap.appendChild(zapImg);

  // query button
  const btnQuery = document.createElement("button");
  btnQuery.id = "query-btn";

  const curImg = document.createElement("img");
  curImg.src = chrome.runtime.getURL(`${IMG_DIR}cursor.svg`);
  btnQuery.appendChild(curImg);

  // reload query button
  const btnReload = document.createElement("button");
  btnReload.id = "reload-btn";

  const relImg = document.createElement("img");
  relImg.src = chrome.runtime.getURL(`${IMG_DIR}selector.svg`);
  btnReload.appendChild(relImg);

  // Assemble buttons
  [btnMinimize, btnClose, btnGrab, btnEye, btnQuery, btnReload, btnZap].forEach(
    (btn) => {
      btn.style.cssText += "width: 32px; height: 32px;";
      const img = btn.querySelector("img");
      img.classList.add("invert");
      img.style.cssText = "width: 14px; height: 14px;";
      buttonGroup.appendChild(btn);
    }
  );
  topRow.appendChild(buttonGroup);
  btnEye.addEventListener("click", () => {
    visibleOnly = !visibleOnly;
    btnEye.querySelector("img").src = chrome.runtime.getURL(
      `${IMG_DIR}${visibleOnly ? `eye` : `noeye`}.svg`
    );
  });

  // Text area container
  const extractedArea = document.createElement("div");
  extractedArea.id = "extracted-text-area";

  // Inner styled box
  const innerDiv = document.createElement("div");
  innerDiv.style.cssText = `
    background: var(--item-bg);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius);
    padding: 8px;
    box-shadow: 0 2px 4px var(--shadow-color);
    text-align: center;
  `;

  // Textarea
  const textarea = document.createElement("textarea");
  textarea.id = "extracted-text";
  // Prevent mousedown events on textarea from bubbling to widget
  textarea.addEventListener("mousedown", (e) => {
    e.stopPropagation();
  });
  innerDiv.appendChild(textarea);
  btnQuery.addEventListener("click", () => {
    const query = window.prompt("document.querySelector('')", "");
    if (query) {
      const element = document.querySelector(query);
      if (element) {
        btnQuery.title = query;
        textarea.value = getVisibleText(element);
      } else {
        btnQuery.title = ""
        textarea.value = "";
      }
      textarea.focus();
    }
  });
  btnReload.addEventListener("click", () => {
    // reload the query data from btn query
    const query = btnQuery.title?.trim() || "";
    if (query.length > 0) {
      const element = document.querySelector(query);
      if (element) {
        textarea.value = getVisibleText(element);
      } else {
        btnQuery.click();
      }
      textarea.focus();
    } else {
      btnQuery.click();
    }
  });

  // AI list container
  const ai_list = document.createElement("div");
  ai_list.id = "ai-list";
  ai_list.style.cssText = `
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    padding-right: 4px;
    margin-top: 8px;
  `;

  // Assemble all
  extractedArea.appendChild(innerDiv);
  extractedArea.appendChild(ai_list);

  container.appendChild(topRow);
  container.appendChild(extractedArea);
  fragment.appendChild(container);
  widgetShadow.appendChild(fragment);

  // Add widget to page
  document.body.appendChild(widget);

  // Widget state
  let isGrabMode = false;
  let visibleOnly = true;
  let originalCursor = "";
  let hoverOverlay = null;
  let aiList = [];
  let minPos = { top: 20, right: 20 };

  // Load AI list and prompts
  async function loadAIList() {
    try {
      const response = await fetch(chrome.runtime.getURL("ai-list.json"));
      if (!response.ok) throw new Error("Failed to load AI list");
      const data = await response.json();
      aiList = data["ai-list"];
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

    textarea.focus(); // Focus textarea when widget is expanded
  });

  // Close widget
  btnClose.addEventListener("click", () => {
    cleanup();
    widget.remove();
    minimized.remove();
    delete window.customPopupWidget;
  });

  // Minimize widget
  btnMinimize.addEventListener("click", () => {
    cleanup();
    widget.style.display = "none";
    minimized.style.display = "flex";
    minimized.style.top = `${widget.style.top}`;
    minimized.style.right = `${widget.style.right}`;
  });

  // Grab text functionality
  btnGrab.addEventListener("click", () => {
    if (isGrabMode) {
      stopGrabMode();
    } else {
      startGrabMode();
    }
  });

  // Zapper functionality
  btnZap.addEventListener("click", () => {
    if (isZapperMode) {
      stopZapperMode();
    } else {
      startZapperMode();
    }
  });

  let isZapperMode = false;

  function startZapperMode() {
    stopGrabMode();
    isZapperMode = true;
    originalCursor = document.body.style.cursor;
    document.body.style.cursor = "pointer";

    btnZap.style.background = "var(--active-bg)";
    btnZap.style.borderColor = "var(--active-color)";
    btnZap.style.boxShadow = "0 0 5px var(--active-color)";
    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleZapperClick, true);
  }

  function stopZapperMode() {
    isZapperMode = false;
    document.body.style.cursor = originalCursor;
    btnZap.style.background = "var(--item-bg)";
    btnZap.style.borderColor = "var(--border-color)";
    btnZap.style.boxShadow = "none";

    cleanup();
  }

  function handleZapperClick(e) {
    if (
      !isZapperMode ||
      e
        .composedPath()
        .some((el) => el === widget || el.id === "custom-popup-widget")
    ) {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    const target = e.target;
    if (target && target.parentNode) {
      target.parentNode.removeChild(target);
    }

    stopZapperMode();
  }

  function startGrabMode() {
    stopZapperMode();
    isGrabMode = true;
    originalCursor = document.body.style.cursor;
    document.body.style.cursor = "crosshair";
    btnGrab.style.background = "var(--active-bg)";
    btnGrab.style.borderColor = "var(--active-color)";
    btnGrab.style.boxShadow = "0 0 5px var(--active-color)";

    document.addEventListener("mouseover", handleMouseOver, true);
    document.addEventListener("mouseout", handleMouseOut, true);
    document.addEventListener("click", handleElementClick, true);
  }

  function stopGrabMode() {
    isGrabMode = false;
    document.body.style.cursor = originalCursor;
    btnGrab.style.background = "var(--item-bg)";
    btnGrab.style.borderColor = "var(--border-color)";
    btnGrab.style.boxShadow = "none";

    cleanup();
  }

  function cleanup() {
    if (hoverOverlay) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
    document.removeEventListener("mouseover", handleMouseOver, true);
    document.removeEventListener("mouseout", handleMouseOut, true);
    document.removeEventListener("click", handleElementClick, true);
    document.removeEventListener("click", handleZapperClick, true);
  }

  function handleMouseOver(e) {
    if (
      (!isGrabMode && !isZapperMode) ||
      e
        .composedPath()
        .some((el) => el === widget || el.id === "custom-popup-widget")
    )
      return;

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
    if (!isGrabMode && !isZapperMode) return;

    if (
      hoverOverlay &&
      (!e.relatedTarget ||
        !e.relatedTarget.composedPath ||
        !e.relatedTarget
          .composedPath()
          .some((el) => el === widget || el.id === "custom-popup-widget"))
    ) {
      hoverOverlay.remove();
      hoverOverlay = null;
    }
  }

  // Helper function to check if an element is visible
  function isElementVisible(el) {
    if (!el) return false;
    if (!visibleOnly) return true;

    // If the node is not an Element (e.g., it's a Text node),
    // its visibility is determined by its parent Element.
    // We assume it's "visible" at its own level for the purpose of this check,
    // and rely on the parent check below to filter out truly hidden text.
    if (el.nodeType !== Node.ELEMENT_NODE) {
      return true;
    }

    // Check for display: none, visibility: hidden, or opacity: 0
    const style = window.getComputedStyle(el);
    if (
      style.display === "none" ||
      style.visibility === "hidden" ||
      parseFloat(style.opacity) === 0
    ) {
      return false;
    }

    // Check if the element has no dimensions (e.g., empty div, hidden by layout)
    if (el.offsetWidth === 0 && el.offsetHeight === 0) {
      return false;
    }

    // Recursively check parent elements for visibility. If any parent is hidden, the element is also considered hidden.
    let current = el.parentElement;
    while (current) {
      const parentStyle = window.getComputedStyle(current);
      if (
        parentStyle.display === "none" ||
        parentStyle.visibility === "hidden" ||
        parseFloat(parentStyle.opacity) === 0
      ) {
        return false;
      }
      current = current.parentElement;
    }

    return true;
  }

  // New helper function to recursively collect all visible text from an element and its visible descendants
  function getVisibleText(el) {
    // If the element itself is not visible, or doesn't exist, return an empty string.
    // This check now correctly handles Element nodes and passes Text nodes through.
    if (!el || !isElementVisible(el)) {
      return "";
    }

    let textParts = [];

    // If it's a text node, add its value directly if not just whitespace
    if (el.nodeType === Node.TEXT_NODE) {
      const text = el.nodeValue?.trim();
      if (text) {
        textParts.push(text);
      }
    } else if (el.nodeType === Node.ELEMENT_NODE) {
      // If it's an input or textarea element, get its value
      if (el.tagName === "INPUT" || el.tagName === "TEXTAREA") {
        const value = el.value?.trim();
        if (value) {
          textParts.push(value);
        }
      } else if (!(el.tagName === "STYLE" || el.tagName === "SCRIPT")) {
        // For other element types, iterate through its child nodes
        // This ensures we process direct text content and recursively process visible child elements
        for (const childNode of el.childNodes) {
          // Recursively call getVisibleText for each child node, so long it is not a script
          const childVisibleText = getVisibleText(childNode);
          if (childVisibleText) {
            textParts.push(childVisibleText);
          }
        }
      }
    }

    // Join all collected text parts with a single space
    return textParts.join(" ");
  }

  function handleElementClick(e) {
    // Check if grab mode is active and if the click is not on the widget itself
    if (
      !isGrabMode ||
      e
        .composedPath()
        .some((el) => el === widget || el.id === "custom-popup-widget")
    ) {
      return;
    }

    // Prevent default browser behavior and stop event propagation
    e.preventDefault();
    e.stopPropagation();

    const element = e.target;
    // Use the new getVisibleText function to extract all visible text from the clicked element and its children
    let textContent = getVisibleText(element);

    // Append the extracted text to the textarea, adding a space separator if needed
    if (textContent) {
      // Ensure there's a space if content already exists, then trim extra spaces
      textarea.value = `${textarea.value.trim()} ${textContent}`.trim();
    }

    // Make the extracted text area visible
    extractedArea.style.display = "block";

    // Focus the textarea to indicate it is editable
    textarea.focus();

    // Stop grab mode after an element is clicked and text is extracted
    stopGrabMode();
  }

  async function showAISuggestions() {
    const aiArea = widgetShadow.getElementById("ai-list");
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
        const prompt = textarea.value;
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
    // Check if the event originated from the textarea or a button
    const isTextareaOrButton = e.composedPath().some((el) => {
      return (
        (el.tagName && el.tagName.toLowerCase() === "textarea") ||
        (el.tagName && el.tagName.toLowerCase() === "button") ||
        isGrabMode
      );
    });
    if (isTextareaOrButton) return;

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
