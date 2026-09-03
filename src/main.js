import {
  INITIAL_RANDOM_SEED,
  POINT_COUNT,
  SPHERE_RADIUS,
  createFixedSamplingDatasets,
  createSamplingDatasets,
  nextRandomSeed,
} from "./sampling.js";
import {
  createPreferredRenderer,
  createRotationMatrix,
  matrix4,
} from "./renderers.js";
import { drawUsePlate } from "./plate.js";
import {
  applyThemePresentation,
  hideLoader,
  isCompactPlateViewport,
  requiredElement,
  setPressedState,
  shouldIgnoreGlobalShortcut,
  showFallback,
} from "./shell.js";

const METHODS = Object.freeze({
  random: {
    index: "01",
    name: "Random",
    claim: "Independent-draw model",
    note:
      "Seeded pseudorandom surface draws. Close pairs and open patches are expected in a finite field.",
    plateTitle: "Fig. 01 — resampled field",
    plateKey: "equal-area disk",
    plateCaption: "Two other seeds sit under the live set.",
    plateSide: "seeded draws",
  },
  sobol: {
    index: "02",
    name: "Sobol",
    claim: "Prefix coverage",
    note:
      "A canonical low-discrepancy square, wrapped with equal area. The 128 and 512 prefixes remain nested.",
    plateTitle: "Fig. 02 — generating square",
    plateKey: "unit square + disk",
    plateCaption: "128 / 512 / 1,536. Square origin (0,0) sits on a pole.",
    plateSide: "origin → pole",
  },
  fibonacci: {
    index: "03",
    name: "Fibonacci",
    claim: "Fixed instrument",
    note:
      "A lattice organized by the golden angle. The set is the thing you keep.",
    plateTitle: "Fig. 03 — lattice print",
    plateKey: "equal-area disk",
    plateCaption: "A single N, evenly seated.",
    plateSide: "spiral order",
  },
});

function afterTwoFrames() {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  });
}

function easeInOutQuint(value) {
  return value < 0.5
    ? 16 * value ** 5
    : 1 - (-2 * value + 2) ** 5 / 2;
}

function sphericalMixInto(destination, source, target, amount) {
  for (let index = 0; index < destination.length; index += 3) {
    const ax = source[index];
    const ay = source[index + 1];
    const az = source[index + 2];
    const bx = target[index];
    const by = target[index + 1];
    const bz = target[index + 2];
    const cosine = Math.max(
      -0.9995,
      Math.min(0.9995, ax * bx + ay * by + az * bz),
    );

    let x;
    let y;
    let z;

    if (cosine > 0.9975) {
      x = ax + (bx - ax) * amount;
      y = ay + (by - ay) * amount;
      z = az + (bz - az) * amount;
    } else {
      const angle = Math.acos(cosine);
      const denominator = Math.sin(angle);
      const sourceWeight = Math.sin((1 - amount) * angle) / denominator;
      const targetWeight = Math.sin(amount * angle) / denominator;
      x = ax * sourceWeight + bx * targetWeight;
      y = ay * sourceWeight + by * targetWeight;
      z = az * sourceWeight + bz * targetWeight;
    }

    const length = Math.hypot(x, y, z) || 1;
    destination[index] = x / length;
    destination[index + 1] = y / length;
    destination[index + 2] = z / length;
  }
}

function formatOrder(value) {
  const index = ((Math.floor(value) % POINT_COUNT) + POINT_COUNT) % POINT_COUNT;
  return `${String(index + 1).padStart(4, "0")} / ${POINT_COUNT}`;
}

function isInteractiveTarget(target) {
  return Boolean(
    target.closest?.(
      ".use-plate, .method-nav, .study-tools, .theme-switch, .field-fallback",
    ),
  );
}

function normalize(vector) {
  const length = Math.hypot(vector[0], vector[1], vector[2]) || 1;
  vector[0] /= length;
  vector[1] /= length;
  vector[2] /= length;
}

async function initializeExhibit() {
  const app = requiredElement("app");
  const stage = requiredElement("stage");
  let canvas = requiredElement("field");
  const plate = requiredElement("plate");
  const usePlate = requiredElement("usePlate");
  const loader = requiredElement("loader");
  const fallback = requiredElement("fallback");
  const themeButton = requiredElement("themeBtn");
  const spacingButton = requiredElement("spacingBtn");
  const spacingKey = requiredElement("spacingKey");
  const walkButton = requiredElement("walkBtn");
  const walkKey = requiredElement("walkKey");
  const walkStat = requiredElement("walkStat");
  const walkValue = requiredElement("walkVal");
  const inspectButton = requiredElement("inspectBtn");
  const reseedButton = requiredElement("reseedBtn");
  const liveRegion = requiredElement("live");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let currentMethod = "fibonacci";
  let theme = "uv";
  let spacing = false;
  let walking = false;
  let walkHead = 0;
  let previousWalkIndex = 0;
  let lastReducedWalkTick = 0;
  let randomSeed = INITIAL_RANDOM_SEED;

  const fixedDatasets = createFixedSamplingDatasets(POINT_COUNT);
  let datasets = createSamplingDatasets(
    POINT_COUNT,
    randomSeed,
    fixedDatasets,
  );

  const preferred = createPreferredRenderer(canvas, {
    pointCount: POINT_COUNT,
    sphereRadius: SPHERE_RADIUS,
  });
  canvas = preferred.canvas;
  const renderer = preferred.renderer;

  let sourcePositions = new Float32Array(datasets.fibonacci.positions);
  let targetPositions = new Float32Array(datasets.fibonacci.positions);
  let sourceCrowding = new Float32Array(datasets.fibonacci.crowding);
  let targetCrowding = new Float32Array(datasets.fibonacci.crowding);
  let sourceSequence = new Float32Array(datasets.fibonacci.sequence);
  let targetSequence = new Float32Array(datasets.fibonacci.sequence);
  const temporaryPositions = new Float32Array(sourcePositions.length);
  const temporaryCrowding = new Float32Array(sourceCrowding.length);

  const transition = {
    active: false,
    startedAt: 0,
    duration: 2600,
    mix: 0,
    pulse: 0,
  };

  function updateStateAttributes() {
    app.dataset.method = currentMethod;
    app.dataset.seed = String(randomSeed);
    app.dataset.theme = theme;
    app.dataset.transitioning = String(transition.active);
    app.dataset.reducedMotion = String(reducedMotion.matches);
  }

  function uploadPoints() {
    renderer.uploadPoints(
      sourcePositions,
      targetPositions,
      sourceCrowding,
      targetCrowding,
      sourceSequence,
      targetSequence,
    );
  }

  uploadPoints();
  updateStateAttributes();

  function bakeCurrentTransition() {
    if (!transition.active || transition.mix <= 0) return;

    sphericalMixInto(
      temporaryPositions,
      sourcePositions,
      targetPositions,
      transition.mix,
    );
    for (let index = 0; index < temporaryCrowding.length; index += 1) {
      temporaryCrowding[index] =
        sourceCrowding[index] +
        (targetCrowding[index] - sourceCrowding[index]) * transition.mix;
    }
    sourcePositions.set(temporaryPositions);
    sourceCrowding.set(temporaryCrowding);
  }

  function transitionTo(dataset, immediate = false) {
    bakeCurrentTransition();
    targetPositions.set(dataset.positions);
    targetCrowding.set(dataset.crowding);
    targetSequence.set(dataset.sequence);

    if (immediate || reducedMotion.matches) {
      sourcePositions.set(dataset.positions);
      sourceCrowding.set(dataset.crowding);
      sourceSequence.set(dataset.sequence);
      transition.active = false;
      transition.mix = 0;
      transition.pulse = 0;
    } else {
      transition.active = true;
      transition.startedAt = performance.now();
      transition.mix = 0;
      transition.pulse = 0;
    }

    uploadPoints();
    updateStateAttributes();
  }

  function redrawPlate() {
    drawUsePlate(plate, {
      theme,
      method: currentMethod,
      datasets,
      walk: walking,
      walkHead,
    });
  }

  function updateOrderValue() {
    walkValue.textContent = formatOrder(walkHead);
    app.dataset.order = String(
      ((Math.floor(walkHead) % POINT_COUNT) + POINT_COUNT) % POINT_COUNT,
    );
  }

  function updateReading() {
    const metadata = METHODS[currentMethod];
    const dataset = datasets[currentMethod];
    const percent = (dataset.nearestNeighborCv * 100).toFixed(1);

    requiredElement("methodIndex").textContent = metadata.index;
    requiredElement("methodName").textContent = metadata.name;
    requiredElement("methodClaim").textContent = metadata.claim;
    requiredElement("methodNote").textContent = metadata.note;
    requiredElement("methodCv").textContent = `${percent}%`;
    requiredElement("methodSeed").textContent =
      currentMethod === "random" ? String(randomSeed).padStart(5, "0") : "fixed";
    requiredElement("plateTitle").textContent = metadata.plateTitle;
    requiredElement("plateKey").textContent = metadata.plateKey;
    requiredElement("plateCaption").textContent = metadata.plateCaption;
    requiredElement("plateSide").textContent = metadata.plateSide;

    for (const button of document.querySelectorAll(".method-nav button")) {
      const selected = button.dataset.method === currentMethod;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    }

    const orderAnnouncement = walking
      ? ` Walking generation order ${formatOrder(walkHead)}.`
      : "";
    liveRegion.textContent =
      `${metadata.name} selected. ${metadata.claim}. ` +
      `Nearest-neighbor CV ${percent} percent; this is a local spacing statistic.` +
      orderAnnouncement;

    updateStateAttributes();
    redrawPlate();
  }

  function selectMethod(method) {
    if (!METHODS[method] || method === currentMethod) return;
    currentMethod = method;
    transitionTo(datasets[currentMethod]);
    updateReading();
  }

  function setTheme(nextTheme, { announce = true } = {}) {
    theme = nextTheme;
    applyThemePresentation({
      app,
      button: themeButton,
      paperLabel: requiredElement("paperLabel"),
      uvLabel: requiredElement("uvLabel"),
      theme,
    });
    updateStateAttributes();
    redrawPlate();
    if (announce) {
      liveRegion.textContent = `${theme === "paper" ? "Paper" : "UV"} presentation.`;
    }
  }

  function setSpacing(nextSpacing) {
    spacing = nextSpacing;
    setPressedState(spacingButton, spacing);
    spacingKey.classList.toggle("is-visible", spacing);
    spacingKey.setAttribute("aria-hidden", String(!spacing));
    liveRegion.textContent = `Spacing inspection ${spacing ? "on" : "off"}.`;
  }

  function setWalking(nextWalking) {
    walking = nextWalking;
    setPressedState(walkButton, walking);
    walkKey.classList.toggle("is-visible", walking);
    walkKey.setAttribute("aria-hidden", String(!walking));
    walkStat.hidden = !walking;
    if (walking) lastReducedWalkTick = performance.now();
    previousWalkIndex =
      ((Math.floor(walkHead) % POINT_COUNT) + POINT_COUNT) % POINT_COUNT;
    updateOrderValue();
    redrawPlate();
    liveRegion.textContent = walking
      ? `Walking generation order ${formatOrder(walkHead)}.`
      : "Generation walk paused.";
  }

  themeButton.addEventListener("click", () => {
    setTheme(theme === "uv" ? "paper" : "uv");
  });

  for (const button of document.querySelectorAll(".method-nav button")) {
    button.addEventListener("click", () => selectMethod(button.dataset.method));
  }

  spacingButton.addEventListener("click", () => setSpacing(!spacing));
  walkButton.addEventListener("click", () => setWalking(!walking));
  reseedButton.addEventListener("click", () => {
    randomSeed = nextRandomSeed(randomSeed);
    datasets = createSamplingDatasets(POINT_COUNT, randomSeed, fixedDatasets);
    currentMethod = "random";
    transitionTo(datasets.random);
    updateReading();
  });

  reducedMotion.addEventListener?.("change", () => {
    if (reducedMotion.matches && transition.active) {
      sourcePositions.set(targetPositions);
      sourceCrowding.set(targetCrowding);
      sourceSequence.set(targetSequence);
      transition.active = false;
      transition.mix = 0;
      transition.pulse = 0;
      uploadPoints();
    }
    if (reducedMotion.matches) {
      rotationVelocityX = 0;
      rotationVelocityY = 0;
    }
    updateStateAttributes();
  });

  let width = 1;
  let height = 1;
  let pixelRatio = 1;
  let pointScale = 32;
  let mobilePlateOpen = false;
  let updatePlateClip = () => {};

  function resize() {
    const bounds = stage.getBoundingClientRect();
    width = Math.max(1, Math.round(bounds.width));
    height = Math.max(1, Math.round(bounds.height));
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.75);
    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    renderer.resize(canvas.width, canvas.height);
    pointScale = Math.max(22, Math.min(36, Math.min(width, height) * 0.042)) *
      pixelRatio;
    if (!isCompactPlateViewport(width, height) && mobilePlateOpen) {
      setMobilePlate(false);
    }
    updatePlateClip();
  }

  const stageResizeObserver = new ResizeObserver(resize);
  stageResizeObserver.observe(stage);
  resize();

  updatePlateClip = () => {
    if (!stage.classList.contains("is-reading-plate")) {
      canvas.style.removeProperty("clip-path");
      return;
    }

    const stageBounds = stage.getBoundingClientRect();
    const plateBounds = usePlate.getBoundingClientRect();
    const left = plateBounds.left - stageBounds.left;
    const top = plateBounds.top - stageBounds.top;
    canvas.style.clipPath =
      `path(evenodd, "M0 0H${stageBounds.width}V${stageBounds.height}H0Z` +
      `M${left} ${top}H${left + plateBounds.width}V${top + plateBounds.height}` +
      `H${left}Z")`;
  };

  function setPlateInspection(active) {
    usePlate.classList.toggle("is-inspecting", active);
    stage.classList.toggle("is-reading-plate", active);
    updatePlateClip();
  }

  let plateHovered = false;
  let plateFocused = false;

  function syncPlateInspection() {
    setPlateInspection(plateHovered || plateFocused || mobilePlateOpen);
  }

  function setMobilePlate(open) {
    mobilePlateOpen = open && isCompactPlateViewport(width, height);
    usePlate.classList.toggle("is-mobile-open", mobilePlateOpen);
    setPressedState(inspectButton, mobilePlateOpen);
    inspectButton.setAttribute("aria-expanded", String(mobilePlateOpen));
    syncPlateInspection();
    liveRegion.textContent = `Inspection plate ${mobilePlateOpen ? "opened" : "closed"}.`;
  }

  inspectButton.addEventListener("click", () => setMobilePlate(!mobilePlateOpen));
  usePlate.addEventListener("pointerenter", () => {
    plateHovered = true;
    syncPlateInspection();
  });
  usePlate.addEventListener("pointerleave", () => {
    plateHovered = false;
    syncPlateInspection();
  });
  usePlate.addEventListener("focusin", () => {
    plateFocused = true;
    syncPlateInspection();
  });
  usePlate.addEventListener("focusout", (event) => {
    if (!usePlate.contains(event.relatedTarget)) {
      plateFocused = false;
      syncPlateInspection();
    }
  });

  const plateResizeObserver = new ResizeObserver(updatePlateClip);
  plateResizeObserver.observe(usePlate);

  let rotationX = -0.14;
  let rotationY = 0.34;
  let rotationVelocityX = 0;
  let rotationVelocityY = 0;
  let dragging = false;
  let previousPointerX = 0;
  let previousPointerY = 0;
  let previousPointerTime = 0;
  let activePointerId = null;
  const light = [-0.32, 0.48, 0.82];
  const targetLight = [-0.32, 0.48, 0.82];

  stage.addEventListener("pointerdown", (event) => {
    if (
      event.button !== 0 ||
      event.isPrimary === false ||
      activePointerId !== null ||
      isInteractiveTarget(event.target)
    ) {
      return;
    }
    canvas.focus({ preventScroll: true });
    dragging = true;
    activePointerId = event.pointerId;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    previousPointerTime = performance.now();
    rotationVelocityX = 0;
    rotationVelocityY = 0;
    stage.setPointerCapture(event.pointerId);
    stage.dataset.dragging = "true";
  });

  stage.addEventListener("pointermove", (event) => {
    if (event.isPrimary === false) return;
    const bounds = canvas.getBoundingClientRect();
    targetLight[0] =
      ((event.clientX - bounds.left) / Math.max(1, bounds.width) * 2 - 1) * 0.55;
    targetLight[1] =
      -((event.clientY - bounds.top) / Math.max(1, bounds.height) * 2 - 1) * 0.55;
    targetLight[2] = 1;
    normalize(targetLight);

    if (!dragging || event.pointerId !== activePointerId) return;
    event.preventDefault();
    const now = performance.now();
    const elapsed = Math.max(8, now - previousPointerTime);
    const deltaX = event.clientX - previousPointerX;
    const deltaY = event.clientY - previousPointerY;
    const moveY = deltaX * 0.0048;
    const moveX = deltaY * 0.0042;
    rotationY += moveY;
    rotationX = Math.max(-1.05, Math.min(1.05, rotationX + moveX));
    rotationVelocityY = moveY / elapsed * 16;
    rotationVelocityX = moveX / elapsed * 16;
    previousPointerX = event.clientX;
    previousPointerY = event.clientY;
    previousPointerTime = now;
  });

  function endPointer(event) {
    if (!dragging || event.pointerId !== activePointerId) return;
    dragging = false;
    if (stage.hasPointerCapture(event.pointerId)) {
      stage.releasePointerCapture(event.pointerId);
    }
    activePointerId = null;
    delete stage.dataset.dragging;
    if (reducedMotion.matches) {
      rotationVelocityX = 0;
      rotationVelocityY = 0;
    }
  }

  stage.addEventListener("pointerup", endPointer);
  stage.addEventListener("pointercancel", endPointer);

  window.addEventListener("keydown", (event) => {
    const canvasFocused = document.activeElement === canvas;
    const repeatableCanvasArrow = canvasFocused && event.key.startsWith("Arrow");
    if (shouldIgnoreGlobalShortcut(event, { allowRepeat: repeatableCanvasArrow })) return;

    const key = event.key.toLowerCase();
    let handled = true;

    if (event.key === "1") selectMethod("random");
    else if (event.key === "2") selectMethod("sobol");
    else if (event.key === "3") selectMethod("fibonacci");
    else if (key === "p") setSpacing(!spacing);
    else if (key === "o") setWalking(!walking);
    else if (key === "t") setTheme(theme === "uv" ? "paper" : "uv");
    else if (canvasFocused && event.key === "ArrowLeft") {
      rotationY -= 0.12;
      rotationVelocityX = 0;
      rotationVelocityY = 0;
      if (!event.repeat) liveRegion.textContent = "Sphere rotated left.";
    } else if (canvasFocused && event.key === "ArrowRight") {
      rotationY += 0.12;
      rotationVelocityX = 0;
      rotationVelocityY = 0;
      if (!event.repeat) liveRegion.textContent = "Sphere rotated right.";
    } else if (canvasFocused && event.key === "ArrowUp") {
      rotationX = Math.max(-1.05, rotationX - 0.1);
      rotationVelocityX = 0;
      rotationVelocityY = 0;
      if (!event.repeat) liveRegion.textContent = "Sphere rotated up.";
    } else if (canvasFocused && event.key === "ArrowDown") {
      rotationX = Math.min(1.05, rotationX + 0.1);
      rotationVelocityX = 0;
      rotationVelocityY = 0;
      if (!event.repeat) liveRegion.textContent = "Sphere rotated down.";
    } else if (event.key === "Escape" && mobilePlateOpen) {
      setMobilePlate(false);
    } else {
      handled = false;
    }

    if (handled) event.preventDefault();
  });

  function advanceWalk(now, delta) {
    if (!walking) return false;
    const previous = previousWalkIndex;

    if (reducedMotion.matches) {
      if (now - lastReducedWalkTick >= 140) {
        walkHead = (Math.floor(walkHead) + 1) % POINT_COUNT;
        lastReducedWalkTick = now;
      }
    } else {
      walkHead = (walkHead + delta / 22) % POINT_COUNT;
    }

    previousWalkIndex =
      ((Math.floor(walkHead) % POINT_COUNT) + POINT_COUNT) % POINT_COUNT;
    return previousWalkIndex !== previous;
  }

  let previousFrame = performance.now();
  let firstFrame = true;
  let animationFrame = 0;

  function drawFrame(now) {
    try {
      const delta = Math.min(40, Math.max(0, now - previousFrame));
      previousFrame = now;

      if (transition.active) {
        const linear = Math.min(1, (now - transition.startedAt) / transition.duration);
        transition.mix = easeInOutQuint(linear);
        transition.pulse = Math.sin(Math.PI * linear);

        if (linear >= 1) {
          sourcePositions.set(targetPositions);
          sourceCrowding.set(targetCrowding);
          sourceSequence.set(targetSequence);
          transition.active = false;
          transition.mix = 0;
          transition.pulse = 0;
          uploadPoints();
          updateStateAttributes();
        }
      }

      if (advanceWalk(now, delta)) {
        updateOrderValue();
        redrawPlate();
      }

      if (!dragging && !reducedMotion.matches) {
        rotationY += rotationVelocityY + delta * 0.000018;
        rotationX = Math.max(
          -1.05,
          Math.min(1.05, rotationX + rotationVelocityX),
        );
        const damping = 0.91 ** (delta / 16.67);
        rotationVelocityX *= damping;
        rotationVelocityY *= damping;
      }

      const lightAmount = Math.min(1, delta * 0.0045);
      light[0] += (targetLight[0] - light[0]) * lightAmount;
      light[1] += (targetLight[1] - light[1]) * lightAmount;
      light[2] += (targetLight[2] - light[2]) * lightAmount;

      const aspect = width / height;
      const verticalFov = 34 * Math.PI / 180;
      const horizontalFov = 2 * Math.atan(Math.tan(verticalFov / 2) * aspect);
      const cameraDistance =
        SPHERE_RADIUS / Math.sin(Math.min(verticalFov, horizontalFov) / 2) * 1.13;
      const projection = matrix4.perspective(verticalFov, aspect, 0.1, 100);
      const view = matrix4.lookAt(
        [0, 0, cameraDistance],
        [0, 0, 0],
        [0, 1, 0],
      );
      const model = createRotationMatrix(rotationX, rotationY, -0.035);

      renderer.draw({
        projection,
        view,
        model,
        light,
        mix: transition.mix,
        pulse: transition.pulse,
        spacing,
        theme,
        pointScale,
        walk: walking,
        walkHead,
        walkTrail: 16,
        sourcePositions,
        targetPositions,
        sourceCrowding,
        targetCrowding,
        sourceSequence,
        targetSequence,
        width,
        height,
        pixelRatio,
      });

      if (firstFrame) {
        firstFrame = false;
        hideLoader(loader);
        canvas.dataset.renderer = renderer.kind;
        canvas.dataset.frameReady = "true";
        if (preferred.fallbackReason) {
          canvas.dataset.webgl2Fallback = "initialization-failed";
        }
      }
    } catch (error) {
      console.error(error);
      hideLoader(loader);
      showFallback(
        fallback,
        error instanceof Error ? error.message : "The field failed while drawing.",
        liveRegion,
      );
      return;
    }

    animationFrame = requestAnimationFrame(drawFrame);
  }

  window.addEventListener(
    "pagehide",
    () => {
      cancelAnimationFrame(animationFrame);
      stageResizeObserver.disconnect();
      plateResizeObserver.disconnect();
      renderer.dispose();
    },
    { once: true },
  );

  updateOrderValue();
  updateReading();
  setTheme(theme, { announce: false });
  animationFrame = requestAnimationFrame(drawFrame);
}

async function start() {
  const loader = requiredElement("loader");
  const fallback = requiredElement("fallback");
  const liveRegion = requiredElement("live");

  try {
    await afterTwoFrames();
    await initializeExhibit();
  } catch (error) {
    console.error(error);
    hideLoader(loader);
    showFallback(
      fallback,
      error instanceof Error ? error.message : "The field failed to form.",
      liveRegion,
    );
  }
}

start();
