import test from 'node:test';
import assert from 'node:assert/strict';
import { DATASETS, STATS, SUMMARY_FIELDS, statistics, roundedSummary, sharedSummary } from '../public/series/assets/same-fit-model.js';

const close = (actual, expected, tolerance = 1e-10) => assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} differs from ${expected}`);

test('published quartet retains all 44 source observations and row identities', () => {
  // Independent row-major transcription from R's src/library/datasets/data/anscombe.R.
  const rows = [
    [10, 8, 8.04, 9.14, 7.46, 6.58], [8, 8, 6.95, 8.14, 6.77, 5.76],
    [13, 8, 7.58, 8.74, 12.74, 7.71], [9, 8, 8.81, 8.77, 7.11, 8.84],
    [11, 8, 8.33, 9.26, 7.81, 8.47], [14, 8, 9.96, 8.10, 8.84, 7.04],
    [6, 8, 7.24, 6.13, 6.08, 5.25], [4, 19, 4.26, 3.10, 5.39, 12.50],
    [12, 8, 10.84, 9.13, 8.15, 5.56], [7, 8, 4.82, 7.26, 6.42, 7.91],
    [5, 8, 5.68, 4.74, 5.73, 6.89],
  ];
  assert.equal(DATASETS.length, 4);
  DATASETS.forEach((dataset, index) => {
    assert.equal(dataset.points.length, 11);
    rows.forEach((values, i) => assert.deepEqual(dataset.points[i], {
      row: i + 1, x: values[index === 3 ? 1 : 0], y: values[index + 2],
    }));
  });
  assert.equal(DATASETS[3].points.filter(point => point.x === 8).length, 10);
});

test('computed fits satisfy both OLS normal equations and centered decomposition', () => {
  DATASETS.forEach((dataset, index) => {
    const stats = STATS[index], points = dataset.points;
    close(stats.residuals.reduce((a, b) => a + b, 0), 0);
    close(stats.residuals.reduce((sum, r, i) => sum + points[i].x * r, 0), 0);
    close(stats.varianceX, 11);
    close(stats.meanX, 9);
    close(stats.rSquared, stats.correlation ** 2);
    const explained = stats.fitted.reduce((sum, fitted) => sum + (fitted - stats.meanY) ** 2, 0);
    close(explained + stats.sse, 10 * stats.varianceY);
    points.forEach((point, i) => close(stats.fitted[i] + stats.residuals[i], point.y));
    // Perturbations of either coefficient must not improve the least-squares objective.
    for (const [da, db] of [[0.1, 0], [-0.1, 0], [0, 0.01], [0, -0.01], [-0.1, 0.01]]) {
      const perturbed = points.reduce((sum, p) => sum + (p.y - stats.intercept - da - (stats.slope + db) * p.x) ** 2, 0);
      assert.ok(perturbed > stats.sse);
    }
  });
});

test('exact decimal source sums independently determine each fitted coefficient', () => {
  // Integer-cent arithmetic gives exact source sums, independent of centered-sum OLS.
  const expectedSumY100 = [8251, 8251, 8250, 8251];
  const expectedSumXY100 = [79760, 79759, 79747, 79758];
  DATASETS.forEach((dataset, i) => {
    const sumY100 = dataset.points.reduce((sum, p) => sum + Math.round(100 * p.y), 0);
    const sumXY100 = dataset.points.reduce((sum, p) => sum + p.x * Math.round(100 * p.y), 0);
    assert.equal(sumY100, expectedSumY100[i]);
    assert.equal(sumXY100, expectedSumXY100[i]);
    const slope = (11 * sumXY100 - 99 * sumY100) / (100 * (11 * 1001 - 99 * 99));
    close(STATS[i].slope, slope);
    close(STATS[i].intercept, sumY100 / 1100 - 9 * slope);
  });
});

test('declared rounded summaries agree while actual coefficients and variances differ', () => {
  assert.deepEqual(sharedSummary(), { meanX: '9.00', meanY: '7.50', varianceX: '11.00', varianceY: '4.1', correlation: '0.82', intercept: '3.00', slope: '0.50' });
  for (const stats of STATS) assert.deepEqual(roundedSummary(stats), sharedSummary());
  assert.equal(SUMMARY_FIELDS.find(field => field.key === 'varianceY').digits, 1);
  assert.deepEqual(STATS.map(stats => stats.varianceY.toFixed(2)), ['4.13', '4.13', '4.12', '4.12']);
  assert.equal(new Set(STATS.map(stats => stats.slope)).size, 4);
  const changed = STATS.map(stats => ({ ...stats }));
  changed[0].slope = 0.8;
  assert.equal(sharedSummary(changed).slope, null, 'The summary must expose broken agreement rather than hard-code it.');
});

test('distinct residual patterns remain and all points fit the fixed view limits', () => {
  // II bends: residuals at both x extremes are negative, near the middle positive.
  const ii = DATASETS[1].points;
  for (const x of [4, 14]) assert.ok(STATS[1].residuals[ii.findIndex(p => p.x === x)] < -1.8);
  assert.ok(STATS[1].residuals[ii.findIndex(p => p.x === 9)] > 1);
  assert.ok(STATS[2].residuals[2] > 3);
  close(STATS[3].residuals[7], 0);
  DATASETS.forEach((dataset, i) => dataset.points.forEach((p, j) => {
    assert.ok(p.x >= 0 && p.x <= 20 && p.y >= 0 && p.y <= 15);
    assert.ok(Math.abs(STATS[i].residuals[j]) <= 4);
  }));
});

test('statistics rejects non-finite or degenerate input instead of inventing a fit', () => {
  for (const points of [[], [{ x: 1, y: 2 }], [{ x: 1, y: 2 }, { x: 1, y: 3 }],
    [{ x: 1, y: 2 }, { x: 2, y: 2 }], [{ x: 1, y: 2 }, { x: NaN, y: 4 }]]) assert.throws(() => statistics(points), RangeError);
  assert.throws(() => sharedSummary([]), RangeError);
});
