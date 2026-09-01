import { SOBOL_DISPLAY_PREFIXES } from "./sampling.js";

const TAU = Math.PI * 2;

export const SOBOL_PLATE_PREFIXES = SOBOL_DISPLAY_PREFIXES;

export function projectEqualAreaDisk(x, y, z) {
  const scale = Math.sqrt(
    2 / (1 + Math.max(-0.9992, Math.min(0.9992, y))),
  );
  return [scale * x, scale * z];
}

function drawRegistrationDisk(context, disk, rule, guide) {
  context.beginPath();
  context.arc(disk.x, disk.y, disk.radius, 0, TAU);
  context.strokeStyle = rule;
  context.lineWidth = 1;
  context.stroke();

  context.beginPath();
  context.moveTo(disk.x - disk.radius, disk.y);
  context.lineTo(disk.x + disk.radius, disk.y);
  context.moveTo(disk.x, disk.y - disk.radius);
  context.lineTo(disk.x, disk.y + disk.radius);
  context.strokeStyle = guide;
  context.lineWidth = 0.6;
  context.stroke();
}

function drawProjectedPoints(
  context,
  positions,
  disk,
  color,
  alpha,
  pointSize,
  { start = 0, end = positions.length / 3 } = {},
) {
  context.fillStyle = color;
  context.globalAlpha = alpha;

  for (let index = start; index < end; index += 1) {
    const [diskX, diskY] = projectEqualAreaDisk(
      positions[index * 3],
      positions[index * 3 + 1],
      positions[index * 3 + 2],
    );
    const x = disk.x + (diskX / 2) * disk.radius * 0.92;
    const y = disk.y + (diskY / 2) * disk.radius * 0.92;
    context.fillRect(x, y, pointSize, pointSize);
  }

  context.globalAlpha = 1;
}

function drawNearestNeighborHistogram(
  context,
  distances,
  bounds,
  fill,
  label,
) {
  context.strokeStyle = bounds.rule;
  context.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);

  const bins = Array.from({ length: 18 }, () => 0);
  let maximumDistance = 0;
  for (const distance of distances) {
    maximumDistance = Math.max(maximumDistance, distance);
  }
  maximumDistance = Math.max(maximumDistance, 1e-6);

  for (const distance of distances) {
    const bin = Math.min(
      bins.length - 1,
      Math.floor((distance / maximumDistance) * bins.length),
    );
    bins[bin] += 1;
  }

  const maximumBin = Math.max(...bins, 1);
  const binWidth = bounds.width / bins.length;
  context.fillStyle = fill;

  bins.forEach((count, index) => {
    const height = (count / maximumBin) * (bounds.height - 8);
    context.fillRect(
      bounds.x + index * binWidth + 1,
      bounds.y + bounds.height - height - 1,
      Math.max(1, binWidth - 2),
      height,
    );
  });

  context.fillStyle = label.color;
  context.font = "9px ui-monospace, monospace";
  context.fillText(label.text, bounds.x, bounds.y - 6);
}

function drawSobolPrefixes(context, dataset, square, colors) {
  const pointCount = dataset.uv.length / 2;
  const prefix128 = Math.min(SOBOL_PLATE_PREFIXES[0], pointCount);
  const prefix512 = Math.min(SOBOL_PLATE_PREFIXES[1], pointCount);
  const ranges = [
    { start: 0, end: prefix128, fill: colors.guide, alpha: 0.35, size: 1.2 },
    {
      start: prefix128,
      end: prefix512,
      fill: colors.summary,
      alpha: 0.45,
      size: 1.3,
    },
    {
      start: prefix512,
      end: pointCount,
      fill: colors.accent,
      alpha: 0.9,
      size: 1.6,
    },
  ];

  // Ranges are disjoint so the 1,536-point layer cannot paint over and hide
  // the two early prefixes. Together they still draw the complete sequence.
  ranges.forEach(({ start, end, fill, alpha, size }) => {
    context.fillStyle = fill;
    context.globalAlpha = alpha;

    for (let index = start; index < end; index += 1) {
      const u = dataset.uv[index * 2];
      const v = dataset.uv[index * 2 + 1];
      const x = square.x + u * square.size;
      const y = square.y + v * square.size;
      context.fillRect(x, y, size, size);
    }
  });

  context.globalAlpha = 1;
  context.strokeStyle = colors.rule;
  context.strokeRect(square.x, square.y, square.size, square.size);
}

function drawWalkHead(context, dataset, disk, square, colors, walkHead, method) {
  const pointCount = dataset.raw.length / 3;
  const index = ((Math.floor(walkHead) % pointCount) + pointCount) % pointCount;
  const [diskX, diskY] = projectEqualAreaDisk(
    dataset.raw[index * 3],
    dataset.raw[index * 3 + 1],
    dataset.raw[index * 3 + 2],
  );
  const x = disk.x + (diskX / 2) * disk.radius * 0.92;
  const y = disk.y + (diskY / 2) * disk.radius * 0.92;

  context.strokeStyle = colors.accent;
  context.fillStyle = colors.accent;
  context.lineWidth = 1.25;
  context.beginPath();
  context.arc(x, y, 5, 0, TAU);
  context.stroke();
  context.beginPath();
  context.arc(x, y, 1.5, 0, TAU);
  context.fill();

  if (method !== "sobol") return;

  const squareX = square.x + dataset.uv[index * 2] * square.size;
  const squareY = square.y + dataset.uv[index * 2 + 1] * square.size;
  context.beginPath();
  context.arc(squareX, squareY, 4.5, 0, TAU);
  context.stroke();
  context.beginPath();
  context.arc(squareX, squareY, 1.4, 0, TAU);
  context.fill();
}

/**
 * Draw the authored inspection plate. `datasets[method]` must provide `raw`,
 * `uv`, and exact nearest-neighbor `distances`; random datasets also provide
 * two ghost position arrays at `datasets.ghosts`.
 */
export function drawUsePlate(canvas, state) {
  const context = canvas.getContext("2d");
  if (!context) return;

  const width = canvas.width;
  const height = canvas.height;
  const isUv = state.theme === "uv";
  const colors = {
    background: isUv ? "#171329" : "#f5efe4",
    guide: isUv ? "rgba(141, 131, 178, 0.55)" : "rgba(148, 135, 123, 0.55)",
    accent: isUv ? "#b59bff" : "#9c3038",
    summary: isUv ? "#67d7c4" : "#1c6673",
    warm: isUv ? "#f2a65a" : "#b16d28",
    rule: isUv ? "rgba(77, 70, 114, 0.55)" : "rgba(128, 111, 100, 0.38)",
  };

  context.clearRect(0, 0, width, height);
  context.fillStyle = colors.background;
  context.fillRect(0, 0, width, height);

  const method = state.method;
  const dataset = state.datasets[method];
  if (!dataset) return;

  const pointCount = dataset.raw.length / 3;
  const disk = {
    x: method === "sobol" ? width * 0.27 : width * 0.34,
    y: height * 0.52,
    radius: height * 0.38,
  };
  const square = {
    x: width * 0.62,
    y: height * 0.16,
    size: height * 0.68,
  };

  drawRegistrationDisk(context, disk, colors.rule, colors.guide);

  if (method === "random") {
    const ghosts = state.datasets.ghosts ?? [];
    if (ghosts[0]) {
      drawProjectedPoints(context, ghosts[0], disk, colors.guide, 0.28, 1.2);
    }
    if (ghosts[1]) {
      drawProjectedPoints(context, ghosts[1], disk, colors.guide, 0.18, 1.2);
    }
    drawProjectedPoints(context, dataset.raw, disk, colors.accent, 0.82, 1.45);

    drawNearestNeighborHistogram(
      context,
      dataset.distances,
      {
        x: width * 0.66,
        y: height * 0.18,
        width: width * 0.28,
        height: height * 0.64,
        rule: colors.rule,
      },
      colors.warm,
      { color: colors.guide, text: "NN chord" },
    );
  } else if (method === "sobol") {
    drawSobolPrefixes(context, dataset, square, colors);
    drawProjectedPoints(context, dataset.raw, disk, colors.accent, 0.78, 1.25);
  } else {
    context.strokeStyle = isUv
      ? "rgba(103, 215, 196, 0.22)"
      : "rgba(28, 102, 115, 0.22)";
    context.lineWidth = 0.7;
    context.beginPath();

    for (let index = 0; index < pointCount; index += 1) {
      const [diskX, diskY] = projectEqualAreaDisk(
        dataset.raw[index * 3],
        dataset.raw[index * 3 + 1],
        dataset.raw[index * 3 + 2],
      );
      const x = disk.x + (diskX / 2) * disk.radius * 0.92;
      const y = disk.y + (diskY / 2) * disk.radius * 0.92;
      if (index === 0) context.moveTo(x, y);
      else context.lineTo(x, y);
    }
    context.stroke();

    drawProjectedPoints(context, dataset.raw, disk, colors.accent, 0.88, 1.4);
    drawNearestNeighborHistogram(
      context,
      dataset.distances,
      {
        x: width * 0.66,
        y: height * 0.18,
        width: width * 0.28,
        height: height * 0.64,
        rule: colors.rule,
      },
      colors.summary,
      { color: colors.guide, text: "NN chord" },
    );
  }

  context.fillStyle = colors.guide;
  context.font = "9px ui-monospace, monospace";
  context.fillText(method === "sobol" ? "disk" : "pressed sphere", 14, height - 10);

  if (state.walk) {
    drawWalkHead(
      context,
      dataset,
      disk,
      square,
      colors,
      state.walkHead,
      method,
    );
  }
}
