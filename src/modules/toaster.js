export function showToast(message, type = "") {
  const toasterContainer = document.getElementById("toaster-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");

  if (type) {
    toast.classList.add(type);
  }

  let iconElement = null;
  if (type === "warning") {
    const iconSpan = document.createElement("span");
    iconSpan.classList.add("toast-icon");
    iconSpan.textContent = "⚠️"; // Or use an image element
    iconElement = iconSpan;
  } else if (type === "danger") {
    const iconSpan = document.createElement("span");
    iconSpan.classList.add("toast-icon");
    iconSpan.textContent = "🚨"; // Or use an image element
    iconElement = iconSpan;
  }

  const messageSpan = document.createElement("span");
  messageSpan.classList.add("toast-message");
  messageSpan.textContent = message;

  if (iconElement) {
    toast.append(iconElement, messageSpan);
  } else {
    toast.append(messageSpan);
  }

  toasterContainer.appendChild(toast);

  // Remove the toast after a certain duration
  setTimeout(() => {
    toasterContainer.innerHTML = "";
  }, 5000); // Adjust the duration as needed
}
