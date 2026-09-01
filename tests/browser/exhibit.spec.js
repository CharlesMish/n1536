import { expect, test } from "@playwright/test";

const EXHIBIT_ORIGIN = "http://127.0.0.1:4173";
const INITIAL_SEED = 4217;
const RESEED_STEP = 7919;
const EXPECTED_RESEEDS = [
  [12136, "52.0%"],
  [20055, "54.2%"],
  [27974, "51.3%"],
  [35893, "53.0%"],
  [43812, "51.5%"],
  [51731, "52.0%"],
  [59650, "53.8%"],
  [67569, "52.2%"],
  [75488, "52.5%"],
  [83407, "51.8%"],
  [91326, "50.9%"],
  [99245, "55.3%"],
];

async function installPageMonitor(page) {
  const findings = {
    console: [],
    pageErrors: [],
    requestFailures: [],
    responseErrors: [],
    crossOriginRequests: [],
  };

  await page.addInitScript(() => {
    globalThis.__sameNCspViolations = [];
    document.addEventListener("securitypolicyviolation", (event) => {
      globalThis.__sameNCspViolations.push({
        blockedURI: event.blockedURI,
        directive: event.effectiveDirective,
        disposition: event.disposition,
      });
    });
  });

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      findings.console.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => findings.pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown failure";
    findings.requestFailures.push(`${request.method()} ${request.url()}: ${reason}`);
  });
  page.on("response", (response) => {
    if (!response.ok()) {
      findings.responseErrors.push(`${response.status()} ${response.url()}`);
    }
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if ((url.protocol === "http:" || url.protocol === "https:") && url.origin !== EXHIBIT_ORIGIN) {
      findings.crossOriginRequests.push(`${request.method()} ${url.href}`);
    }
  });

  return findings;
}

async function forceCanvas2D(page) {
  await page.addInitScript(() => {
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    globalThis.__sameNBlockedWebgl2Contexts = 0;

    HTMLCanvasElement.prototype.getContext = function getContext(type, ...options) {
      if (type === "webgl2") {
        globalThis.__sameNBlockedWebgl2Contexts += 1;
        throw new Error("WebGL2 intentionally disabled by browser validation");
      }
      return originalGetContext.call(this, type, ...options);
    };
  });
}

function expectStrictCsp(response) {
  expect(response, "navigation should return a response").not.toBeNull();
  expect(response.ok(), "the exhibit document should load successfully").toBe(true);

  const csp = response.headers()["content-security-policy"];
  expect(csp, "the hosted response should include a CSP header").toBeTruthy();
  expect(csp).toContain("default-src 'self'");
  expect(csp).toContain("connect-src 'self'");
  expect(csp).toContain("script-src 'self'");
  expect(csp).toContain("style-src 'self'");
  expect(csp).toContain("frame-ancestors 'none'");
  expect(csp).not.toMatch(/unsafe-inline|unsafe-eval|https?:|\*/i);
}

async function openExhibit(page, expectedRenderer) {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expectStrictCsp(response);

  const app = page.locator("#app");
  const canvas = page.locator("#field");
  await expect(canvas).toHaveAttribute("data-frame-ready", "true", {
    timeout: 30_000,
  });
  await expect(canvas).toHaveAttribute("data-renderer", expectedRenderer);
  await expect(page.locator("#loader")).toHaveAttribute("aria-hidden", "true");
  await expect(page.locator("#fallback")).toBeHidden();
  await expect(page.getByRole("heading", { level: 1, name: "SAME N" })).toBeVisible();
  await expect(page.getByText("Same count. Different claims.")).toBeVisible();
  await expect(app).toHaveAttribute("data-seed", String(INITIAL_SEED));
  await expect(app).toHaveAttribute("data-method", "fibonacci");
  await page.waitForLoadState("networkidle");

  return { app, canvas };
}

async function expectNoViewportOverflow(page) {
  const layout = await page.evaluate(() => {
    const selectors = [
      ".study-header",
      ".theme-switch",
      ".method-reading",
      ".method-nav",
      ".study-tools",
      ".use-plate",
    ];
    const visibleRects = selectors.flatMap((selector) => {
      const element = document.querySelector(selector);
      if (!element || element.getClientRects().length === 0) return [];
      const rect = element.getBoundingClientRect();
      return [{ selector, left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom }];
    });

    return {
      innerWidth: window.innerWidth,
      innerHeight: window.innerHeight,
      scrollWidth: document.documentElement.scrollWidth,
      scrollHeight: document.documentElement.scrollHeight,
      visibleRects,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.innerWidth + 1);
  expect(layout.scrollHeight).toBeLessThanOrEqual(layout.innerHeight + 1);
  for (const rect of layout.visibleRects) {
    expect(rect.left, `${rect.selector} should stay inside the left edge`).toBeGreaterThanOrEqual(-1);
    expect(rect.top, `${rect.selector} should stay inside the top edge`).toBeGreaterThanOrEqual(-1);
    expect(rect.right, `${rect.selector} should stay inside the right edge`).toBeLessThanOrEqual(
      layout.innerWidth + 1,
    );
    expect(rect.bottom, `${rect.selector} should stay inside the bottom edge`).toBeLessThanOrEqual(
      layout.innerHeight + 1,
    );
  }
}

async function expectBottomControlsDoNotOverlap(page) {
  const boxes = await page.evaluate(() => {
    const read = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    return {
      reading: read(".method-reading"),
      tools: read(".study-tools"),
      navigation: read(".method-nav"),
    };
  });

  const overlaps = (first, second) =>
    first.left < second.right - 1 &&
    first.right > second.left + 1 &&
    first.top < second.bottom - 1 &&
    first.bottom > second.top + 1;

  expect(overlaps(boxes.reading, boxes.tools)).toBe(false);
  expect(overlaps(boxes.tools, boxes.navigation)).toBe(false);
}

async function attachScreenshot(page, testInfo, label) {
  const filename = `${testInfo.project.name}-${label}.png`;
  const path = testInfo.outputPath(filename);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(label, { path, contentType: "image/png" });
}

async function dragSphere(page, delta = { x: 130, y: -70 }) {
  const stage = page.locator("#stage");
  const stageBox = await stage.boundingBox();
  expect(stageBox).not.toBeNull();
  const dragStart = {
    x: stageBox.x + stageBox.width * 0.52,
    y: stageBox.y + stageBox.height * 0.48,
  };

  await page.mouse.move(dragStart.x, dragStart.y);
  await page.mouse.down();
  await expect(stage).toHaveAttribute("data-dragging", "true");
  await page.mouse.move(dragStart.x + delta.x, dragStart.y + delta.y, { steps: 6 });
  await page.mouse.up();
  await expect(stage).not.toHaveAttribute("data-dragging", "true");
}

async function expectCleanPage(page, findings) {
  const cspViolations = await page.evaluate(() => globalThis.__sameNCspViolations ?? []);
  expect(cspViolations, "no runtime CSP directive should be violated").toEqual([]);
  expect(findings.console, "console warnings and errors should be absent").toEqual([]);
  expect(findings.pageErrors, "uncaught page errors should be absent").toEqual([]);
  expect(findings.requestFailures, "failed requests should be absent").toEqual([]);
  expect(findings.responseErrors, "HTTP error responses should be absent").toEqual([]);
  expect(findings.crossOriginRequests, "all HTTP requests should remain same-origin").toEqual([]);
}

test("@desktop WebGL2 exhibit supports the authored controls and sphere drag", async ({ page }, testInfo) => {
  const findings = await installPageMonitor(page);
  const { app } = await openExhibit(page, "webgl2");

  await expect(page.locator(".method-nav button")).toHaveCount(3);
  await page.getByRole("button", { name: /Sobol/ }).click();
  await expect(app).toHaveAttribute("data-method", "sobol");
  await expect(page.locator("#methodClaim")).toHaveText("Prefix coverage");
  await expect(page.locator("#methodNote")).toContainText("128 and 512 prefixes");

  await page.locator("#themeBtn").click();
  await expect(app).toHaveAttribute("data-theme", "paper");
  await expect(page.locator("#themeBtn")).toHaveAttribute("aria-label", "Switch to UV presentation");

  await page.locator("#spacingBtn").click();
  await expect(page.locator("#spacingBtn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#spacingKey")).toHaveAttribute("aria-hidden", "false");

  const initialOrder = await app.getAttribute("data-order");
  await page.locator("#walkBtn").click();
  await expect(page.locator("#walkBtn")).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#walkStat")).toBeVisible();
  await expect.poll(() => app.getAttribute("data-order")).not.toBe(initialOrder);
  await page.locator("#walkBtn").click();

  const plate = page.locator("#usePlate");
  const stage = page.locator("#stage");
  await plate.hover();
  await expect(plate).toHaveClass(/is-inspecting/);
  await expect(stage).toHaveClass(/is-reading-plate/);
  expect(await page.locator("#field").evaluate((canvas) => canvas.style.clipPath)).not.toBe("");
  await page.mouse.move(720, 420);
  await expect(plate).not.toHaveClass(/is-inspecting/);
  await expect(stage).not.toHaveClass(/is-reading-plate/);

  await plate.focus();
  await expect(plate).toHaveClass(/is-inspecting/);
  await expect(stage).toHaveClass(/is-reading-plate/);
  await page.keyboard.press("Tab");
  await expect(plate).not.toHaveClass(/is-inspecting/);
  await expect(stage).not.toHaveClass(/is-reading-plate/);

  await dragSphere(page);

  await page.keyboard.press("3");
  await expect(app).toHaveAttribute("data-method", "fibonacci");
  await page.keyboard.press("t");
  await expect(app).toHaveAttribute("data-theme", "uv");

  await expectNoViewportOverflow(page);
  await attachScreenshot(page, testInfo, "controls-and-drag");
  await expectCleanPage(page, findings);
});

test("@desktop twelve New random interactions stay deterministic and responsive", async ({ page }, testInfo) => {
  const findings = await installPageMonitor(page);
  const { app } = await openExhibit(page, "webgl2");
  const observedSeeds = [];

  for (let reseed = 1; reseed <= EXPECTED_RESEEDS.length; reseed += 1) {
    const [expectedSeed, expectedCv] = EXPECTED_RESEEDS[reseed - 1];
    expect(expectedSeed).toBe((INITIAL_SEED + RESEED_STEP * reseed) >>> 0);
    await page.locator("#reseedBtn").click();
    await expect(app).toHaveAttribute("data-seed", String(expectedSeed));
    await expect(app).toHaveAttribute("data-method", "random");
    await expect(page.locator("#methodSeed")).toHaveText(String(expectedSeed).padStart(5, "0"));
    await expect(page.locator("#methodCv")).toHaveText(expectedCv);
    observedSeeds.push(Number(await app.getAttribute("data-seed")));
  }

  expect(observedSeeds).toEqual(EXPECTED_RESEEDS.map(([seed]) => seed));
  expect(observedSeeds).toContain(83407);
  await expectNoViewportOverflow(page);
  await attachScreenshot(page, testInfo, "after-twelve-reseeds");
  await expectCleanPage(page, findings);

  const reloadResponse = await page.reload({ waitUntil: "domcontentloaded" });
  expectStrictCsp(reloadResponse);
  await expect(page.locator("#field")).toHaveAttribute("data-frame-ready", "true", {
    timeout: 30_000,
  });
  await expect(app).toHaveAttribute("data-seed", String(INITIAL_SEED));
  await expect(app).toHaveAttribute("data-method", "fibonacci");
  await expect(page.locator("#methodName")).toHaveText("Fibonacci");
  await expectCleanPage(page, findings);
});

test("@canvas2d forced Canvas2D preserves data and inspection controls", async ({ page }, testInfo) => {
  await forceCanvas2D(page);
  const findings = await installPageMonitor(page);
  const { app, canvas } = await openExhibit(page, "canvas2d");

  expect(await page.evaluate(() => globalThis.__sameNBlockedWebgl2Contexts)).toBeGreaterThan(0);
  await expect(canvas).toHaveAttribute("data-webgl2-fallback", "initialization-failed");
  await page.getByRole("button", { name: /Random/ }).click();
  await expect(app).toHaveAttribute("data-method", "random");
  await page.locator("#spacingBtn").click();
  await expect(page.locator("#spacingBtn")).toHaveAttribute("aria-pressed", "true");
  await page.locator("#walkBtn").click();
  await expect(page.locator("#walkStat")).toBeVisible();
  const firstOrder = await app.getAttribute("data-order");
  await expect.poll(() => app.getAttribute("data-order")).not.toBe(firstOrder);
  await page.locator("#themeBtn").click();
  await expect(app).toHaveAttribute("data-theme", "paper");
  await dragSphere(page);

  await expectNoViewportOverflow(page);
  await attachScreenshot(page, testInfo, "forced-canvas2d");
  await expectCleanPage(page, findings);
});

test("@mobile portrait and landscape retain reachable, non-overlapping controls", async ({ page }, testInfo) => {
  const findings = await installPageMonitor(page);
  const { app } = await openExhibit(page, "webgl2");

  if (page.viewportSize().width <= 700) {
    await expect(page.locator("#usePlate")).toBeHidden();
  } else {
    await expect(page.locator("#usePlate")).toBeVisible();
  }
  if (page.viewportSize().width <= 420) {
    await expect(page.locator("#paperLabel")).toBeHidden();
    await expect(page.locator("#uvLabel")).toBeHidden();
  } else {
    await expect(page.locator("#paperLabel")).toBeVisible();
    await expect(page.locator("#uvLabel")).toBeVisible();
  }
  await expect(page.locator(".drag-note")).toBeHidden();
  await expect(page.locator(".method-nav button")).toHaveCount(3);
  for (const method of ["Random", "Sobol", "Fibonacci"]) {
    await expect(page.getByRole("button", { name: new RegExp(method) })).toBeVisible();
  }
  await expect(page.locator("#spacingBtn")).toBeVisible();
  await expect(page.locator("#walkBtn")).toBeVisible();
  await expect(page.locator("#reseedBtn")).toBeVisible();

  await page.getByRole("button", { name: /Sobol/ }).click();
  await expect(app).toHaveAttribute("data-method", "sobol");
  await page.locator("#spacingBtn").click();
  await expect(page.locator("#spacingBtn")).toHaveAttribute("aria-pressed", "true");
  const firstOrder = await app.getAttribute("data-order");
  await page.locator("#walkBtn").click();
  await expect(page.locator("#walkStat")).toBeVisible();
  await expect.poll(() => app.getAttribute("data-order")).not.toBe(firstOrder);
  await page.locator("#walkBtn").click();
  await page.locator("#themeBtn").click();
  await expect(app).toHaveAttribute("data-theme", "paper");
  await dragSphere(page, { x: 64, y: -36 });

  await expectNoViewportOverflow(page);
  await expectBottomControlsDoNotOverlap(page);
  await attachScreenshot(page, testInfo, "responsive-layout");
  await expectCleanPage(page, findings);
});

test("@reduced reduced motion removes morphs while keeping order inspection available", async ({ page }, testInfo) => {
  const findings = await installPageMonitor(page);
  // Apply this explicitly before navigation as well as through the project
  // context. This keeps the assertion stable if a Chromium/Playwright pairing
  // drops the context-level media preference while launching SwiftShader.
  await page.emulateMedia({ reducedMotion: "reduce" });
  expect(
    await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches),
  ).toBe(true);
  const { app } = await openExhibit(page, "webgl2");

  await expect(app).toHaveAttribute("data-reduced-motion", "true");
  await page.getByRole("button", { name: /Random/ }).click();
  await expect(app).toHaveAttribute("data-method", "random");
  await expect(app).toHaveAttribute("data-transitioning", "false");
  await page.getByRole("button", { name: /Sobol/ }).click();
  await expect(app).toHaveAttribute("data-method", "sobol");
  await expect(app).toHaveAttribute("data-transitioning", "false");

  const initialOrder = await app.getAttribute("data-order");
  await page.locator("#walkBtn").click();
  await expect(page.locator("#walkBtn")).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => app.getAttribute("data-order"), { timeout: 2_000 }).not.toBe(initialOrder);
  const reducedOrder = Number(await app.getAttribute("data-order"));
  expect(Number.isInteger(reducedOrder)).toBe(true);
  expect(reducedOrder).toBeGreaterThan(0);
  expect(reducedOrder).toBeLessThan(1536);

  await expectNoViewportOverflow(page);
  await attachScreenshot(page, testInfo, "reduced-motion-order");
  await expectCleanPage(page, findings);
});
