import assert from "node:assert/strict";
import test from "node:test";

import {
  INITIAL_RANDOM_SEED,
  POINT_COUNT,
  RANDOM_RESEED_STEP,
  SOBOL_DISPLAY_PREFIXES,
  SPHERE_RADIUS,
  fibonacciSphere,
  createFixedSamplingDatasets,
  makeDataset,
  measureSpacing,
  nextRandomSeed,
  randomSphere,
  sobolSphere,
} from "../src/sampling.js";

const TOLERANCE = 1e-12;

function exhaustiveNearestNeighborOracle(positions) {
  const count = positions.length / 3;
  const distances = new Float64Array(count);
  let sum = 0;
  let minimum = Number.POSITIVE_INFINITY;

  // This oracle deliberately differs from measureSpacing: it scans the entire
  // point set independently for each point and compares chord lengths directly
  // with Math.hypot instead of sharing squared distances between an unordered
  // pair. That makes it capable of detecting omitted candidate pairs.
  for (let left = 0; left < count; left += 1) {
    let nearest = Number.POSITIVE_INFINITY;

    for (let right = 0; right < count; right += 1) {
      if (right === left) continue;

      const distance = Math.hypot(
        positions[left * 3] - positions[right * 3],
        positions[left * 3 + 1] - positions[right * 3 + 1],
        positions[left * 3 + 2] - positions[right * 3 + 2],
      );
      nearest = Math.min(nearest, distance);
    }

    distances[left] = nearest;
    sum += nearest;
    minimum = Math.min(minimum, nearest);
  }

  const mean = sum / count;
  let variance = 0;
  for (const distance of distances) {
    variance += (distance - mean) ** 2;
  }
  variance /= count;

  return {
    distances,
    nearestNeighborCv: Math.sqrt(variance) / mean,
    nearestNeighborMean: mean,
    nearestNeighborMin: minimum,
  };
}

function assertApproximatelyEqual(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) <= TOLERANCE,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

test("exhibit constants preserve N, radius, deterministic seed, and prefixes", () => {
  assert.equal(POINT_COUNT, 1536);
  assert.equal(SPHERE_RADIUS, 1.58);
  assert.equal(INITIAL_RANDOM_SEED, 4217);
  assert.equal(RANDOM_RESEED_STEP, 7919);
  assert.deepEqual(SOBOL_DISPLAY_PREFIXES, [128, 512]);
  assert.ok(Object.isFrozen(SOBOL_DISPLAY_PREFIXES));
});

test("Sobol emits the canonical origin and canonical first eight 2D points", () => {
  const { positions, uv } = sobolSphere(8);
  const expected = [
    0, 0,
    0.5, 0.5,
    0.75, 0.25,
    0.25, 0.75,
    0.375, 0.375,
    0.875, 0.875,
    0.625, 0.125,
    0.125, 0.625,
  ];

  assert.deepEqual(Array.from(uv), expected);
  assert.deepEqual(Array.from(positions.slice(0, 3)), [0, 1, 0]);
});

test("Sobol 128 and 512 are exact nested dyadic prefixes", () => {
  const prefix128 = sobolSphere(128).uv;
  const prefix512 = sobolSphere(512).uv;
  const full = sobolSphere(POINT_COUNT).uv;

  assert.deepEqual(prefix128, prefix512.slice(0, prefix128.length));
  assert.deepEqual(prefix512, full.slice(0, prefix512.length));

  for (const [count, uv] of [
    [128, prefix128],
    [512, prefix512],
  ]) {
    const exponent = Math.log2(count);
    for (let xBits = 0; xBits <= exponent; xBits += 1) {
      const yBits = exponent - xBits;
      const occupied = new Set();

      for (let index = 0; index < count; index += 1) {
        const xCell = Math.floor(uv[index * 2] * 2 ** xBits);
        const yCell = Math.floor(uv[index * 2 + 1] * 2 ** yBits);
        occupied.add(`${xCell},${yCell}`);
      }

      assert.equal(
        occupied.size,
        count,
        `${count}-point prefix fills every ${xBits}+${yBits} dyadic cell once`,
      );
    }
  }
});

test("all three generators preserve their authored unit-sphere and UV shapes", () => {
  const samples = [
    randomSphere(POINT_COUNT, INITIAL_RANDOM_SEED),
    sobolSphere(POINT_COUNT),
    fibonacciSphere(POINT_COUNT),
  ];

  for (const sample of samples) {
    assert.equal(sample.positions.length, POINT_COUNT * 3);
    assert.equal(sample.uv.length, POINT_COUNT * 2);

    for (let index = 0; index < POINT_COUNT; index += 1) {
      const radius = Math.hypot(
        sample.positions[index * 3],
        sample.positions[index * 3 + 1],
        sample.positions[index * 3 + 2],
      );
      assert.ok(Math.abs(radius - 1) < 8e-8);
      assert.ok(sample.uv[index * 2] >= 0 && sample.uv[index * 2] < 1);
      assert.ok(sample.uv[index * 2 + 1] >= 0 && sample.uv[index * 2 + 1] <= 1);
    }
  }
});

test("the initial Random field is deterministic", () => {
  const first = randomSphere(POINT_COUNT, INITIAL_RANDOM_SEED);
  const second = randomSphere(POINT_COUNT, INITIAL_RANDOM_SEED);

  assert.deepEqual(first.positions, second.positions);
  assert.deepEqual(first.uv, second.uv);
  assert.notDeepEqual(
    first.positions,
    randomSphere(POINT_COUNT, nextRandomSeed(INITIAL_RANDOM_SEED)).positions,
  );
});

test("Morton presentation order retains generation-order and raw-spacing mappings", () => {
  const samples = randomSphere(128, INITIAL_RANDOM_SEED);
  const dataset = makeDataset(samples);

  assert.equal(dataset.raw, samples.positions);
  assert.equal(dataset.uv, samples.uv);

  for (let destination = 0; destination < dataset.sequence.length; destination += 1) {
    const source = dataset.sequence[destination];
    assert.equal(dataset.positions[destination * 3], samples.positions[source * 3]);
    assert.equal(
      dataset.positions[destination * 3 + 1],
      samples.positions[source * 3 + 1],
    );
    assert.equal(
      dataset.positions[destination * 3 + 2],
      samples.positions[source * 3 + 2],
    );
    assert.equal(dataset.crowdingRaw[source], dataset.crowding[destination]);
  }
});

test("exact nearest neighbors match an independent oracle across repeated New random seeds", () => {
  const seeds = [INITIAL_RANDOM_SEED];
  let seed = INITIAL_RANDOM_SEED;

  for (let reseed = 0; reseed < 16; reseed += 1) {
    seed = nextRandomSeed(seed);
    seeds.push(seed);
  }

  assert.equal(seeds.length, 17);
  assert.equal(seeds[10], 83407, "the known failing-later seed is the tenth reseed");

  for (const randomSeed of seeds) {
    const positions = randomSphere(POINT_COUNT, randomSeed).positions;
    const actual = measureSpacing(positions);
    const expected = exhaustiveNearestNeighborOracle(positions);

    assert.equal(actual.distances.length, POINT_COUNT);
    for (let index = 0; index < POINT_COUNT; index += 1) {
      assertApproximatelyEqual(
        actual.distances[index],
        expected.distances[index],
        `seed ${randomSeed}, point ${index}`,
      );
    }

    assertApproximatelyEqual(
      actual.nearestNeighborMean,
      expected.nearestNeighborMean,
      `seed ${randomSeed}, NN mean`,
    );
    assertApproximatelyEqual(
      actual.nearestNeighborMin,
      expected.nearestNeighborMin,
      `seed ${randomSeed}, NN minimum`,
    );
    assertApproximatelyEqual(
      actual.nearestNeighborCv,
      expected.nearestNeighborCv,
      `seed ${randomSeed}, NN CV`,
    );

    if (randomSeed === 83407) {
      assertApproximatelyEqual(
        actual.distances[44],
        0.13822014503553082,
        "seed 83407 point 44 regression distance",
      );
      assertApproximatelyEqual(
        actual.nearestNeighborCv,
        0.5176592298355536,
        "seed 83407 exact NN CV",
      );
    }
  }
});

test("fixed methods and exact spacing remain finite", () => {
  const fixed = createFixedSamplingDatasets();

  for (const [method, dataset] of Object.entries(fixed)) {
    assert.equal(dataset.distances.length, POINT_COUNT);
    assert.ok(dataset.distances.every(Number.isFinite), `${method} distances are finite`);
    assert.ok(Number.isFinite(dataset.nearestNeighborCv));
    assert.ok(Number.isFinite(dataset.nearestNeighborMean));
    assert.ok(Number.isFinite(dataset.nearestNeighborMin));
  }

  assertApproximatelyEqual(
    fixed.sobol.nearestNeighborCv,
    0.3691411868888873,
    "canonical Sobol NN CV",
  );
});

test("spacing measurement rejects malformed point arrays", () => {
  assert.throws(() => measureSpacing(null), TypeError);
  assert.throws(() => measureSpacing(new Float32Array(3)), RangeError);
  assert.throws(() => measureSpacing(new Float32Array(7)), RangeError);
});
