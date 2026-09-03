import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  applyThemePresentation,
  hideLoader,
  isCompactPlateViewport,
  shouldIgnoreGlobalShortcut,
  showFallback,
} from "../src/shell.js";

function fakeClassList(initial = []) {
  const values = new Set(initial);
  return {
    add: (value) => values.add(value),
    contains: (value) => values.has(value),
    remove: (value) => values.delete(value),
    toggle(value, force) {
      if (force) values.add(value);
      else values.delete(value);
    },
  };
}

function fakeElement(classes = []) {
  const attributes = new Map();
  return {
    attributes,
    classList: fakeClassList(classes),
    dataset: {},
    setAttribute(name, value) {
      attributes.set(name, value);
    },
  };
}

function shortcutEvent(overrides = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    metaKey: false,
    repeat: false,
    target: { isContentEditable: false, closest: () => null },
    ...overrides,
  };
}

function relativeLuminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((value) => Number.parseInt(value, 16) / 255)
    .map((value) =>
      value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
    );
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrastRatio(first, second) {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

test("theme presentation preserves study identity and exposes current state", () => {
  const app = fakeElement(["same-study", "same-n", "theme-uv"]);
  const button = fakeElement();
  const paperLabel = fakeElement();
  const uvLabel = fakeElement(["is-active"]);

  applyThemePresentation({ app, button, paperLabel, uvLabel, theme: "paper" });

  assert.equal(app.classList.contains("same-study"), true);
  assert.equal(app.classList.contains("same-n"), true);
  assert.equal(app.classList.contains("theme-paper"), true);
  assert.equal(app.classList.contains("theme-uv"), false);
  assert.equal(app.dataset.theme, "paper");
  assert.equal(button.attributes.get("aria-label"), "Switch to UV presentation");
  assert.equal(paperLabel.classList.contains("is-active"), true);
  assert.equal(uvLabel.classList.contains("is-active"), false);
});

test("global shortcuts reject repeats, modifiers, and text entry without breaking buttons", () => {
  assert.equal(shouldIgnoreGlobalShortcut(shortcutEvent()), false);
  assert.equal(shouldIgnoreGlobalShortcut(shortcutEvent({ repeat: true })), true);
  assert.equal(
    shouldIgnoreGlobalShortcut(shortcutEvent({ repeat: true }), { allowRepeat: true }),
    false,
  );
  assert.equal(shouldIgnoreGlobalShortcut(shortcutEvent({ ctrlKey: true })), true);
  assert.equal(
    shouldIgnoreGlobalShortcut(
      shortcutEvent({ target: { isContentEditable: true, closest: () => null } }),
    ),
    true,
  );
  assert.equal(
    shouldIgnoreGlobalShortcut(
      shortcutEvent({ target: { isContentEditable: false, closest: () => ({}) } }),
    ),
    true,
  );
  assert.equal(
    shouldIgnoreGlobalShortcut(
      shortcutEvent({
        target: { isContentEditable: false, closest: () => null },
      }),
    ),
    false,
  );
});

test("compact inspection breakpoint covers phone and short-landscape shells", () => {
  assert.equal(isCompactPlateViewport(390, 844), true);
  assert.equal(isCompactPlateViewport(844, 390), true);
  assert.equal(isCompactPlateViewport(568, 320), true);
  assert.equal(isCompactPlateViewport(700, 1000), true);
  assert.equal(isCompactPlateViewport(701, 1000), false);
  assert.equal(isCompactPlateViewport(1440, 900), false);
});

test("loader and fallback lifecycle clear busy state and use the single live channel", () => {
  const stage = fakeElement();
  const loader = fakeElement();
  loader.closest = () => stage;
  hideLoader(loader);
  assert.equal(loader.classList.contains("is-hidden"), true);
  assert.equal(loader.attributes.get("aria-hidden"), "true");
  assert.equal(stage.attributes.get("aria-busy"), "false");

  const detailElement = { textContent: "" };
  const fallback = {
    hidden: true,
    closest: () => stage,
    querySelector(selector) {
      if (selector === "[data-fallback-detail]") return detailElement;
      if (selector === "p") return { textContent: "The field could not be drawn." };
      return null;
    },
  };
  const liveRegion = { textContent: "" };
  showFallback(fallback, "Canvas is unavailable.", liveRegion);
  assert.equal(fallback.hidden, false);
  assert.equal(detailElement.textContent, "Canvas is unavailable.");
  assert.equal(
    liveRegion.textContent,
    "The field could not be drawn. Canvas is unavailable.",
  );
  assert.equal(stage.attributes.get("aria-busy"), "false");
});

test("Paper faint text token clears 4.5:1 on field and plate surfaces", async () => {
  const css = await readFile(new URL("../src/styles.css", import.meta.url), "utf8");
  const paperBlock = css.match(/\.same-study\.theme-paper\s*\{([\s\S]*?)\n\}/)?.[1];
  assert.ok(paperBlock, "Paper theme block is present");
  const faint = paperBlock.match(/--ink-faint:\s*(#[0-9a-f]{6})/i)?.[1];
  const field = paperBlock.match(/--field:\s*(#[0-9a-f]{6})/i)?.[1];
  const panel = paperBlock.match(/--panel:\s*(#[0-9a-f]{6})/i)?.[1];
  assert.ok(faint && field && panel, "Paper contrast tokens are explicit hex colors");
  assert.ok(contrastRatio(faint, field) >= 4.5);
  assert.ok(contrastRatio(faint, panel) >= 4.5);
});
