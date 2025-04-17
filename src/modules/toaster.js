export function showToast(message) {
  const toasterContainer = document.getElementById("toaster-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");
  const messageSpan = document.createElement("span");
  messageSpan.classList.add("toast-message");
  messageSpan.textContent = message;
  toast.append(messageSpan);
  toasterContainer.appendChild(toast);

  // Remove the toast after a certain duration
  setTimeout(() => {
    toasterContainer.innerHTML = "";
  }, 5000); // Adjust the duration as needed
}
