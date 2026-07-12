document.querySelectorAll("[data-copy]").forEach((button) => {
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.classList.add("copied");
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.classList.remove("copied");
        button.textContent = "Copy commands";
      }, 1200);
    } catch {
      button.classList.remove("copied");
    }
  });
});
