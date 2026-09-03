const EDITABLE_SHORTCUT_TARGETS =
  "input, textarea, select, [contenteditable='true'], [contenteditable='plaintext-only']";

export function requiredElement(id, root = document) {
  const element = root.getElementById(id);
  if (!element) throw new Error(`Required exhibit element #${id} is missing`);
  return element;
}

export function hideLoader(loader) {
  loader.classList.add("is-hidden");
  loader.setAttribute("aria-hidden", "true");
  loader.closest?.(".field-stage")?.setAttribute("aria-busy", "false");
}

export function showFallback(fallback, detail, liveRegion) {
  fallback.hidden = false;
  fallback.closest?.(".field-stage")?.setAttribute("aria-busy", "false");
  const detailElement = fallback.querySelector("[data-fallback-detail]");
  if (detailElement && detail) detailElement.textContent = detail;
  if (liveRegion) {
    const heading = fallback.querySelector("p")?.textContent?.trim();
    liveRegion.textContent = [heading, detail].filter(Boolean).join(" ");
  }
}

export function shouldIgnoreGlobalShortcut(event, { allowRepeat = false } = {}) {
  if (
    event.defaultPrevented ||
    (event.repeat && !allowRepeat) ||
    event.altKey ||
    event.ctrlKey ||
    event.metaKey
  ) {
    return true;
  }

  const target = event.target;
  if (!target) return false;
  if (target.isContentEditable) return true;
  return Boolean(target.closest?.(EDITABLE_SHORTCUT_TARGETS));
}

export function setPressedState(button, active) {
  button.classList.toggle("is-active", active);
  button.setAttribute("aria-pressed", String(active));
}

export function applyThemePresentation({
  app,
  button,
  paperLabel,
  uvLabel,
  theme,
}) {
  if (theme !== "paper" && theme !== "uv") {
    throw new Error(`Unsupported presentation theme: ${theme}`);
  }

  app.classList.toggle("theme-paper", theme === "paper");
  app.classList.toggle("theme-uv", theme === "uv");
  app.dataset.theme = theme;
  paperLabel.classList.toggle("is-active", theme === "paper");
  uvLabel.classList.toggle("is-active", theme === "uv");
  button.setAttribute(
    "aria-label",
    `Switch to ${theme === "uv" ? "Paper" : "UV"} presentation`,
  );
}

export function isCompactPlateViewport(width, height) {
  return width <= 700 || (width <= 900 && height <= 500);
}
