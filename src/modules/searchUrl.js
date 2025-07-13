import { appendImg } from "./appendImage.js";
import { setupTooltip } from "./tooltip.js";
import { getSearchEngineList } from "./searchEngine.js";
import { t } from "./locales.js";
const urlBtn = document.querySelector("#search-button");
const urlsideBar = document.querySelector("#url-sidebar");
const urlBtnsList = document.getElementById("url-buttons");
const urlField = document.getElementById("searchUrls");
const defaultField = document.getElementById("defaultUrls");
const omni = document.getElementById("omniboxCmd");
async function appendList() {
  const searchEngines = await getSearchEngineList();
  const fragment = document.createDocumentFragment();

  searchEngines.forEach((ai) => {
    const button = document.createElement("button");
    appendImg(
      {
        image: ai.image,
      },
      button,
      null,
      true,
      true
    );
    button.addEventListener("click", () => {
      // make this button the active state
      urlBtnsList.querySelectorAll("button").forEach((btn) => {
        btn.classList.remove("active");
      });
      button.classList.add("active");
      let url = ai.home ?? ai.url;
      // remove all parameters
      url = url.split("?")[0];
      urlField.querySelector("input").value = `${url}?prompt=`;
      defaultField.querySelector("input").value = ai.needsPerm ? "" : ai.url;
      omni.querySelector(
        "input"
      ).value = `tb @${ai.omnibox[0]} ; tb @${ai.omnibox[1]}`;
    });
    fragment.appendChild(button);
  });

  urlBtnsList.replaceChildren(fragment);
}

document.addEventListener("DOMContentLoaded", () => {
  appendImg({ image: "assets/images/buttons/search.svg" }, urlBtn);
  setupTooltip(urlBtn);
  urlBtn.addEventListener("click", () => {
    urlsideBar.style.display = "block";
    urlsideBar.querySelector("h1").textContent = t("tooltip_search_engine");
    urlsideBar.querySelector("p").textContent = t("url_info");
    omni.querySelector("label").textContent = t("omni_label");
    omni.querySelector("span").textContent = t("omni_desc");

    urlField.querySelector("label").textContent = t("exp_label");
    urlField.querySelector("span").textContent = t("exp_desc");

    defaultField.querySelector("label").textContent = t("def_label");
    defaultField.querySelector("span").textContent = t("def_desc");
    document.querySelector("#learn_more").textContent = t("learn_more");
  });
  appendList();
});
document.addEventListener("click", (e) => {
  if (!urlsideBar.contains(e.target) && !urlBtn.contains(e.target)) {
    urlsideBar.style.display = "none";
  }
});
