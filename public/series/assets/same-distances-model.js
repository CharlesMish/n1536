// All coordinates are authored from rational orthogonal factors; no fitted geometry.
export const LABELS = Object.freeze(['A', 'B', 'C', 'D']);
export const EDGES = Object.freeze([[0, 1], [0, 2], [0, 3], [1, 2], [1, 3], [2, 3]].map(Object.freeze));
const H = [[1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]];
const Q = [[3 / 13, -4 / 5, 36 / 65], [4 / 13, 3 / 5, 48 / 65], [-12 / 13, 0, 5 / 13]];
export const TARGET = Object.freeze(H.map(h => Object.freeze([2, 1, 0.5].map((scale, j) => scale * h.reduce((s, x, k) => s + x * Q[k][j], 0)))));
export const MIRROR = Object.freeze(TARGET.map(p => Object.freeze([p[0], p[1], -p[2]])));
export const PRINCIPAL_VARIANCES = Object.freeze([4, 1, 0.25]);
export const BEST_PROPER_RMS = 2 * Math.sqrt(PRINCIPAL_VARIANCES[2]);
export const INITIAL_ANGLES = Object.freeze([30, -35, 25]);

export function multiply(a, b) {
  return a.map(row => b[0].map((_, j) => row.reduce((s, x, k) => s + x * b[k][j], 0)));
}

export function transform(matrix, point) {
  return matrix.map(row => row.reduce((s, x, j) => s + x * point[j], 0));
}

// Native controls specify extrinsic x, then y, then z rotations, in degrees.
export function rotationMatrix([x, y, z]) {
  const [a, b, c] = [x, y, z].map(angle => angle * Math.PI / 180);
  const rx = [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const ry = [[Math.cos(b), 0, Math.sin(b)], [0, 1, 0], [-Math.sin(b), 0, Math.cos(b)]];
  const rz = [[Math.cos(c), -Math.sin(c), 0], [Math.sin(c), Math.cos(c), 0], [0, 0, 1]];
  return multiply(rz, multiply(ry, rx));
}

export function placedSource(angles, allowReflection = false) {
  const rotation = rotationMatrix(angles);
  return (allowReflection ? TARGET : MIRROR).map(point => transform(rotation, point));
}

export function edgeLengths(points) {
  return EDGES.map(([a, b]) => Math.hypot(...points[a].map((value, j) => value - points[b][j])));
}

export function centroid(points) {
  return [0, 1, 2].map(j => points.reduce((sum, point) => sum + point[j], 0) / points.length);
}

export function rmsDistance(a, b) {
  return Math.sqrt(a.reduce((sum, p, i) => sum + p.reduce((s, x, j) => s + (x - b[i][j]) ** 2, 0), 0) / a.length);
}

export function determinant(a) {
  return a[0][0] * (a[1][1] * a[2][2] - a[1][2] * a[2][1])
    - a[0][1] * (a[1][0] * a[2][2] - a[1][2] * a[2][0])
    + a[0][2] * (a[1][0] * a[2][1] - a[1][1] * a[2][0]);
}

// Label order A, B, C, D is fixed throughout the study.
export function signedVolume(points) {
  return determinant(points.slice(1).map(p => p.map((value, j) => value - points[0][j]))) / 6;
}

export function covariance(points) {
  const center = centroid(points);
  return [0, 1, 2].map(i => [0, 1, 2].map(j => points.reduce((sum, p) => sum + (p[i] - center[i]) * (p[j] - center[j]), 0) / points.length));
}

// In this authored principal frame, the smallest variance is on z. Reflecting
// that axis is the closest improper transform to the target. Since the source
// is already that reflection, identity is the globally best proper rotation.
export function bestProperFit() {
  return { angles: [0, 0, 0], translation: [0, 0, 0], rms: BEST_PROPER_RMS, points: MIRROR.map(p => [...p]) };
}

const subtract = (a, b) => a.map((value, i) => value - b[i]);
const dot = (a, b) => a.reduce((sum, value, i) => sum + value * b[i], 0);
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = a => a.map(value => value / Math.hypot(...a));

export function seatFaceABC() {
  const [a, b, c, d] = TARGET;
  const right = unit(subtract(c, a));
  const normal = unit(cross(subtract(b, a), subtract(c, a)));
  const height = dot(subtract(d, a), normal);
  // Reflecting the target across ABC fixes its first three vertices. Applied
  // to MIRROR this placement is the composition of two plane reflections,
  // hence a proper rotation plus translation, with the mirror's hand intact.
  const movingD = d.map((value, i) => value - 2 * height * normal[i]);
  const points = [a, b, c, movingD];
  // Look along AC's in-plane perpendicular, tipped just enough to show ABC.
  const depth = cross(right, normal);
  const tilt = 14 * Math.PI / 180;
  const up = normal.map((value, i) => value * Math.cos(tilt) + depth[i] * Math.sin(tilt));
  return { points, normal, camera: [right, up, cross(right, up)], gap: 2 * Math.abs(height) };
}
