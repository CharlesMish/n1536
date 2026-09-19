import test from 'node:test';
import assert from 'node:assert/strict';
import { TARGET, MIRROR, PRINCIPAL_VARIANCES, BEST_PROPER_RMS, rotationMatrix, transform, placedSource, edgeLengths, centroid, rmsDistance, signedVolume, covariance, determinant, bestProperFit } from '../public/series/assets/same-distances-model.js';

function near(actual, expected, tolerance = 1e-11) { assert.ok(Math.abs(actual - expected) < tolerance, `${actual} ≠ ${expected}`); }

test('DISTANCES specimen has six distinct matching lengths and nonzero opposite volumes', () => {
  const lengths = edgeLengths(TARGET);
  lengths.forEach((length, i) => near(length, edgeLengths(MIRROR)[i]));
  assert.equal(new Set(lengths.map(value => value.toFixed(9))).size, 6);
  assert.ok(Math.abs(signedVolume(TARGET)) > 1);
  near(signedVolume(TARGET), -signedVolume(MIRROR));
  near(Math.abs(signedVolume(TARGET)), 8 / 3);
});

test('DISTANCES centered covariance proves the global proper-fit lower bound', () => {
  centroid(TARGET).forEach(value => near(value, 0));
  centroid(MIRROR).forEach(value => near(value, 0));
  const c = covariance(TARGET);
  c.forEach((row, i) => row.forEach((value, j) => near(value, i === j ? PRINCIPAL_VARIANCES[i] : 0)));
  // For B=R diag(1,1,-1), det(B)=-1 and tr(B)<=1. Thus RMS² =
  // 2 sum c_i(1-B_ii) >= 2 c_min(3-tr B) >= 4 c_min = 1.
  near(4 * Math.min(...PRINCIPAL_VARIANCES), 1);
  const fit = bestProperFit();
  near(fit.rms, 1);
  near(rmsDistance(fit.points, TARGET), fit.rms);
  near(determinant(rotationMatrix(fit.angles)), 1);
  assert.deepEqual(fit.translation, [0, 0, 0]);
});

test('DISTANCES proper rotations preserve distances and orientation and obey the certified bound', () => {
  let state = 1234567;
  const random = () => { state = (1664525 * state + 1013904223) >>> 0; return state / 2 ** 32; };
  for (let i = 0; i < 300; i++) {
    const angles = [0, 0, 0].map(() => random() * 360 - 180);
    const rotation = rotationMatrix(angles);
    const points = placedSource(angles);
    near(determinant(rotation), 1);
    near(signedVolume(points), signedVolume(MIRROR));
    edgeLengths(points).forEach((length, j) => near(length, edgeLengths(TARGET)[j]));
    assert.ok(rmsDistance(points, TARGET) >= BEST_PROPER_RMS - 1e-12);
    // Independent matrix-trace identity checks the full 3D objective.
    const trace = 4 * rotation[0][0] + rotation[1][1] - .25 * rotation[2][2];
    near(rmsDistance(points, TARGET) ** 2, 10.5 - 2 * trace);
    const translation = [1.2, -0.7, 2.3];
    const shifted = points.map(p => p.map((v, j) => v + translation[j]));
    near(rmsDistance(shifted, TARGET) ** 2, rmsDistance(points, TARGET) ** 2 + translation.reduce((s, v) => s + v * v, 0));
  }
});

test('DISTANCES allowing reflection aligns corresponding labels exactly', () => {
  const reflected = placedSource([0, 0, 0], true);
  near(rmsDistance(reflected, TARGET), 0);
  near(signedVolume(reflected), signedVolume(TARGET));
  MIRROR.forEach((p, i) => transform([[1, 0, 0], [0, 1, 0], [0, 0, -1]], p).forEach((v, j) => near(v, reflected[i][j])));
});
