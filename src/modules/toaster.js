export function showToast(message, title = null) {
  const toasterContainer = document.getElementById("toaster-container");
  const toast = document.createElement("div");
  toast.classList.add("toast");
  const messageSpan = document.createElement("span");
  const h1 = document.createElement("h1");
  h1.textContent = title;
  messageSpan.classList.add("toast-message");
  messageSpan.textContent = message;
  if (title) toast.appendChild(h1);
  toast.append(messageSpan);
  toasterContainer.appendChild(toast);

  // Remove the toast after a certain duration
  setTimeout(() => {
    toasterContainer.innerHTML = "";
  }, 10000); // Adjust the duration as needed
}
