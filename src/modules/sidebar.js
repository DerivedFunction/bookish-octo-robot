import { weatherField } from "./weather.js";
import { nameInput } from "./nameInput.js";
import { appendImg } from "./appendImage.js";
import { loadJsonData } from "../app.js";
import {
  getPermissions,
  getScriptStatus,
  getSearchEngineList,
  removePermissions,
} from "./searchEngine.js";
import { setupTooltip } from "./tooltip.js";
import { updateButtonIcon } from "./widget.js";
export const optionBtn = document.getElementById("options-button");
optionBtn.addEventListener("click", async () => {
  sidebar.style.display = "block";
  nameInput.value = localStorage.getItem("name") || "";
  let x = JSON.parse(localStorage.getItem("location"));
  weatherField.value = x ? x.inputValue : "";
});
export const sidebar = document.getElementById("sidebar");
export const exp_sidebar = document.getElementById("scripts-sidebar");
document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && !optionBtn.contains(e.target)) {
    sidebar.style.display = "none";
  }
  if (!exp_sidebar.contains(e.target) && !scriptsBtn.contains(e.target)) {
    exp_sidebar.style.display = "none";
  }
});
export const closeBtn = document.getElementById("close-options");
closeBtn.addEventListener("click", () => {
  sidebar.style.display = "none";
});
export const closeScriptBtn = document.getElementById("close-scripts");
closeScriptBtn.addEventListener("click", () => {
  exp_sidebar.style.display = "none";
});
const scriptsBtn = document.getElementById("scripts-button");
scriptsBtn.addEventListener("click", async () => {
  exp_sidebar.style.display = "block";

  await chrome.storage.local.get("unstable").then((e) => {
    console.log("unstable feature status", e?.unstable);
    unstable.checked = e?.unstable || false;
  });
  const aiList = await getSearchEngineList(); // or cache it if you want
  await refreshCurrentEnabled(aiList);
});

export const requiredList = document.getElementById("required-scripts-ai");
const imageList = document.getElementById("ai-image-support");
const scriptsList = document.getElementById("ai-experimental-support");
export const enableAll = document.getElementById("enable-all-scripts");

export const revokeAll = document.getElementById("revoke-all-scripts");
revokeAll.addEventListener("click", async () => {
  await removePermissions(true);
  currentEnabled.innerHTML = "";
});
async function addToCurrentEnabled(ai) {
  const exists = [...currentEnabled.querySelectorAll("button")].some(
    (btn) => btn.value === ai.name
  );
  if (!exists) {
    const hasScripts = await getScriptStatus(ai.name);
    if (hasScripts)
      currentEnabled.appendChild(createPermissionButton(ai, false));
  }
}
const currentEnabled = document.getElementById("ai-experimental-enabled");
function createPermissionButton(ai, enable = true) {
  const button = document.createElement("button");
  button.value = ai.name;
  appendImg(
    {
      image: ai.image,
    },
    button,
    null,
    false,
    true
  );
  button.addEventListener("click", async () => {
    if (enable) {
      await getPermissions(ai);
      addToCurrentEnabled(ai);
    } else {
      await removePermissions(false, ai.name);
      //remove the button from
      const buttons = currentEnabled.querySelectorAll("button");
      for (const btn of buttons) {
        if (btn.value === ai.name) {
          btn.remove();
          return;
        }
      }
    }
  });
  return button;
}
async function refreshCurrentEnabled(aiList, all = false) {
  currentEnabled.innerHTML = ""; // clear old buttons
  for (const ai of aiList) {
    if (ai.experimental) {
      const hasScripts = await getScriptStatus(ai.name);
      if (hasScripts || all) {
        currentEnabled.appendChild(createPermissionButton(ai, false));
      }
    }
  }
}
const advancedList = document.getElementById("ai-advanced-support");
const unstable = document.getElementById("unstable");
unstable.addEventListener("change", async () => {
  await chrome.storage.local.set({ unstable: unstable.checked });
  chrome.runtime.sendMessage({
    unstable: true,
    value: unstable.checked,
  });
});

const sliderBtn = document.getElementById("settings-slider");
const slider = document.querySelector("#slider");
let sliderNotVis = true; // Track state
sliderBtn.addEventListener("click", () => {
  const buttons = slider.querySelectorAll("button");
  buttons.forEach((btn, i) => {
    setTimeout(() => {
      if (sliderNotVis) {
        btn.classList.remove("slide-in");
        btn.classList.add("slide-out");
      } else {
        btn.classList.remove("slide-out");
        btn.classList.add("slide-in");
      }
    }, i * 100); // Staggered delay
  });
  sliderNotVis = !sliderNotVis; // Toggle the state
  updateButtonIcon();
});

document.addEventListener("DOMContentLoaded", async () => {
  appendImg({ image: "assets/images/buttons/options.svg" }, optionBtn);
  appendImg({ image: "assets/images/buttons/unlocked.svg" }, scriptsBtn);
  appendImg({ image: "assets/images/buttons/settings.svg" }, sliderBtn);
  [optionBtn, scriptsBtn, sliderBtn].forEach((btn) => {
    setupTooltip(btn);
  });
  const aiList = await getSearchEngineList();
  aiList.forEach(async (ai) => {
    if (ai.fileImage) {
      imageList.appendChild(createPermissionButton(ai));
    }
    if (ai.needsPerm) {
      requiredList.appendChild(createPermissionButton(ai));
    }
    if (ai.experimental) {
      scriptsList.appendChild(createPermissionButton(ai));
      const hasScripts = await getScriptStatus(ai.name);
      if (hasScripts) {
        addToCurrentEnabled(ai);
      }
    }
    if (ai.advanced) {
      advancedList.appendChild(createPermissionButton(ai));
    }
  });
  const { scripts: permScripts } = await loadJsonData("scripts");
  const full = permScripts.full;
  const scripts = permScripts.scriptConfigs;
  enableAll.addEventListener("click", async () => {
    try {
      const granted = await chrome.permissions.request(full.permissionsConfig);
      if (granted) {
        Object.entries(scripts).forEach(([name, config]) => {
          try {
            chrome.scripting.registerContentScripts([
              {
                id: name,
                matches: config.matches,
                js: config.js,
                runAt: "document_end",
                allFrames: true,
              },
            ]);
          } catch (err) {
            console.log("Script already exists", err);
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
    setTimeout(async () => {
      await refreshCurrentEnabled(aiList, true);
    }, 1000);
  });
});
