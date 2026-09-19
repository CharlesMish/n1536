// Anscombe's quartet, transcribed without alteration from R's datasets source:
// https://svn.r-project.org/R/trunk/src/library/datasets/data/anscombe.R
// F. J. Anscombe (1973), Graphs in Statistical Analysis, 27(1), 17–21.
const commonX = [10, 8, 13, 9, 11, 14, 6, 4, 12, 7, 5];
const columns = [
  [commonX, [8.04, 6.95, 7.58, 8.81, 8.33, 9.96, 7.24, 4.26, 10.84, 4.82, 5.68]],
  [commonX, [9.14, 8.14, 8.74, 8.77, 9.26, 8.10, 6.13, 3.10, 9.13, 7.26, 4.74]],
  [commonX, [7.46, 6.77, 12.74, 7.11, 7.81, 8.84, 6.08, 5.39, 8.15, 6.42, 5.73]],
  [[8, 8, 8, 8, 8, 8, 8, 19, 8, 8, 8], [6.58, 5.76, 7.71, 8.84, 8.47, 7.04, 5.25, 12.50, 5.56, 7.91, 6.89]],
];
export const DATASETS = Object.freeze(columns.map(([xs, ys], index) => Object.freeze({
  id: ['I', 'II', 'III', 'IV'][index],
  points: Object.freeze(xs.map((x, row) => Object.freeze({ row: row + 1, x, y: ys[row] }))),
})));

/** Ordinary least squares with an intercept; sample variances use n − 1. */
export function statistics(points) {
  if (!Array.isArray(points) || points.length < 2 || points.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) {
    throw new RangeError('At least two finite points are required.');
  }
  const n = points.length;
  const meanX = points.reduce((sum, p) => sum + p.x, 0) / n;
  const meanY = points.reduce((sum, p) => sum + p.y, 0) / n;
  const sxx = points.reduce((sum, p) => sum + (p.x - meanX) ** 2, 0);
  const syy = points.reduce((sum, p) => sum + (p.y - meanY) ** 2, 0);
  const sxy = points.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
  if (sxx === 0 || syy === 0) throw new RangeError('Both coordinates need nonzero variance.');
  const slope = sxy / sxx;
  const intercept = meanY - slope * meanX;
  const fitted = points.map(p => intercept + slope * p.x);
  const residuals = points.map((p, i) => p.y - fitted[i]);
  const sse = residuals.reduce((sum, value) => sum + value ** 2, 0);
  return { n, meanX, meanY, varianceX: sxx / (n - 1), varianceY: syy / (n - 1),
    correlation: sxy / Math.sqrt(sxx * syy), slope, intercept, fitted, residuals,
    sse, rSquared: 1 - sse / syy };
}

// Precision is part of the exhibit's contract, not inferred from an exact-equality claim.
export const SUMMARY_FIELDS = Object.freeze([
  { key: 'meanX', label: 'Mean x', digits: 2 },
  { key: 'meanY', label: 'Mean y', digits: 2 },
  { key: 'varianceX', label: 'Sample variance x', digits: 2 },
  { key: 'varianceY', label: 'Sample variance y', digits: 1 },
  { key: 'correlation', label: 'Correlation r', digits: 2 },
  { key: 'intercept', label: 'Line intercept', digits: 2 },
  { key: 'slope', label: 'Line slope', digits: 2 },
].map(Object.freeze));

export function roundedSummary(stats) {
  return Object.fromEntries(SUMMARY_FIELDS.map(({ key, digits }) => [key, stats[key].toFixed(digits)]));
}

export const STATS = Object.freeze(DATASETS.map(dataset => Object.freeze(statistics(dataset.points))));

/** Shared values are computed and certified across all four, never substituted. */
export function sharedSummary(allStats = STATS) {
  if (allStats.length === 0) throw new RangeError('A comparison needs at least one dataset.');
  const rounded = allStats.map(roundedSummary);
  return Object.fromEntries(SUMMARY_FIELDS.map(({ key }) => [key,
    rounded.every(values => values[key] === rounded[0][key]) ? rounded[0][key] : null]));
}
