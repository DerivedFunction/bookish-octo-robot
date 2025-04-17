import { weatherField } from "./weather.js";
import { nameInput } from "./nameInput.js";
import { appendSvg } from "./appendSvg.js";
import { loadJsonData, needPerm } from "../app.js";
import {
  getPermissions,
  getPermissionStatus,
  getSearchEngineList,
  removePermissions,
} from "./searchEngine.js";
export const optionBtn = document.getElementById("options-button");
optionBtn.addEventListener("click", () => {
  sidebar.style.display = "block";
  nameInput.value = localStorage.getItem("name") || "";
  let x = JSON.parse(localStorage.getItem("location"));
  weatherField.value = x ? x.inputValue : "";
});
const sidebar = document.getElementById("sidebar");
const exp_sidebar = document.getElementById("scripts-sidebar");
document.addEventListener("click", (e) => {
  if (!sidebar.contains(e.target) && !optionBtn.contains(e.target)) {
    sidebar.style.display = "none";
  }
  if (!exp_sidebar.contains(e.target) && !scriptsBtn.contains(e.target)) {
    exp_sidebar.style.display = "none";
  }
});
const closeBtn = document.getElementById("close-options");
closeBtn.addEventListener("click", () => {
  sidebar.style.display = "none";
});
const closeScriptBtn = document.getElementById("close-scripts");
closeScriptBtn.addEventListener("click", () => {
  exp_sidebar.style.display = "none";
});
const scriptsBtn = document.getElementById("scripts-button");
scriptsBtn.addEventListener("click", async () => {
  exp_sidebar.style.display = "block";
  const aiList = await getSearchEngineList(); // or cache it if you want
  await refreshCurrentEnabled(aiList);
});
const requiredList = document.getElementById("required-scripts-ai");
const imageList = document.getElementById("ai-image-support");
const scriptsList = document.getElementById("ai-experimental-support");
const enableAll = document.getElementById("enable-all-scripts");

const revokeAll = document.getElementById("revoke-all-scripts");
revokeAll.addEventListener("click", async () => {
  await removePermissions(true);
  currentEnabled.innerHTML = "";
});
async function addToCurrentEnabled(ai) {
  const exists = [...currentEnabled.querySelectorAll("button")].some(
    (btn) => btn.value === ai.name
  );
  if (!exists) {
    const hasScripts = await getPermissionStatus(ai.name);
    if (hasScripts)
      currentEnabled.appendChild(createPermissionButton(ai, false));
  }
}
const currentEnabled = document.getElementById("ai-experimental-enabled");
function createPermissionButton(ai, enable = true) {
  const button = document.createElement("button");
  button.value = ai.name;
  appendSvg(
    {
      image: ai.image,
      description: `${enable ? "Enable" : "Disable"} Permissions for ${
        ai.name
      }`,
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
async function refreshCurrentEnabled(aiList) {
  currentEnabled.innerHTML = ""; // clear old buttons
  for (const ai of aiList) {
    if (ai.experimental) {
      const hasScripts = await getPermissionStatus(ai.name);
      if (hasScripts) {
        currentEnabled.appendChild(createPermissionButton(ai, false));
      }
    }
  }
}
const advancedList = document.getElementById("ai-advanced-support");
document.addEventListener("DOMContentLoaded", async () => {
  appendSvg({ image: "assets/images/buttons/options.svg" }, optionBtn);
  appendSvg({ image: "assets/images/buttons/unlocked.svg" }, scriptsBtn);
  const aiList = await getSearchEngineList();
  needPerm.forEach((aiName) => {
    const button = document.createElement("button");
    appendSvg(
      {
        image: `/assets/images/ai/${aiName.toLowerCase()}.svg`,
        description: `Enable Permissions for ${aiName}`,
      },
      button,
      null,
      false,
      true
    );
    button.addEventListener("click", async () => {
      await getPermissions({
        name: aiName,
      });
      const hasScripts = await getPermissionStatus(aiName);
      if (hasScripts) {
        const ai = aiList.find((a) => a.name === aiName);
        if (ai) addToCurrentEnabled(ai);
      }
    });
    requiredList.appendChild(button);
  });

  aiList.forEach(async (ai) => {
    if (ai.fileImage) {
      imageList.appendChild(createPermissionButton(ai));
    }
    if (ai.experimental) {
      scriptsList.appendChild(createPermissionButton(ai));
      const hasScripts = await getPermissionStatus(ai.name);
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
        refreshCurrentEnabled(aiList);
      }
    } catch (err) {
      console.log(err);
    }
  });
});
