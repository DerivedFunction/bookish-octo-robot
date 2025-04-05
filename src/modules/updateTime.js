export const timeFormat = document.getElementById("time-format");
timeFormat.addEventListener("change", (e) => {
  const format = e.target.value;
  if (format === "hide") {
    localStorage.removeItem("time-format");
  } else {
    localStorage.setItem("time-format", format);
  }
  updateTime();
});
export function updateTime() {
  const timeElement = document.getElementById("time");
  let format = localStorage.getItem("time-format");
  if (format === null) {
    timeElement.textContent = "";
    return;
  }
  if (!timeElement) return;

  const now = new Date();
  const hours = now.getHours().toString().padStart(2, "0");
  let curHour = hours;
  const minutes = now.getMinutes().toString().padStart(2, "0");
  if (format === "12") {
    curHour = hours % 12 || 12;
  }
  timeElement.textContent = `${curHour}:${minutes}${
    format == "12" ? (hours >= 12 ? "PM" : "AM") : ""
  }`;
}
document.addEventListener("DOMContentLoaded", () => {
  updateTime();
  const storedTimeFormat = localStorage.getItem("time-format");
  if (storedTimeFormat) {
    timeFormat.querySelectorAll("input").forEach((option) => {
      if (option.value === storedTimeFormat) {
        option.checked = true;
      }
    });
  } else {
    timeFormat.querySelector("input").checked = true;
  }
  document.getElementById("reset").addEventListener("click", async () => {
    localStorage.removeItem("time-format");
    timeFormat.querySelectorAll("input").forEach((option) => {
      option.checked = false;
    });
    updateTime();
  });
  updateTime();
  setInterval(updateTime, 5000);
});
