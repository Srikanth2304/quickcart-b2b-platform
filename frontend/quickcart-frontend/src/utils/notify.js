export function showToast(message, type = "success") {
  if (!message) return;
  window.dispatchEvent(
    new CustomEvent("app-toast", {
      detail: { message, type },
    })
  );
}
