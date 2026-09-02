export const POINT_COUNT = 1536;
export const SPHERE_RADIUS = 1.58;
export const INITIAL_RANDOM_SEED = 4217;
export const RANDOM_RESEED_STEP = 7919;
export const SOBOL_DISPLAY_PREFIXES = Object.freeze([128, 512]);

const TAU = Math.PI * 2;
const UINT32_SCALE = 2 ** 32;
const CROWDING_SPAN = 0.62;

export function nextRandomSeed(seed) {
  return (seed + RANDOM_RESEED_STEP) >>> 0;
}

export function mulberry32(seed) {
  let state = seed >>> 0;

  return () => {
    state = (state + 1831565813) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / UINT32_SCALE;
  };
}

export function equalAreaSphere(u, v) {
  const y = 1 - 2 * v;
  const radial = Math.sqrt(Math.max(0, 1 - y * y));
  const theta = TAU * u;
  return [Math.cos(theta) * radial, y, Math.sin(theta) * radial];
}

export function randomSphere(count, seed) {
  const random = mulberry32(seed);
  const positions = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);

  for (let index = 0; index < count; index += 1) {
    const u = random();
    const v = random();
    const point = equalAreaSphere(u, v);

    uv[index * 2] = u;
    uv[index * 2 + 1] = v;
    positions[index * 3] = point[0];
    positions[index * 3 + 1] = point[1];
    positions[index * 3 + 2] = point[2];
  }

  return { positions, uv };
}

function createSobolDirections() {
  const directionX = new Uint32Array(33);
  const directionY = new Uint32Array(33);

  for (let bit = 1; bit <= 32; bit += 1) {
    directionX[bit] = 2 ** (32 - bit);
  }

  directionY[1] = 2147483648;
  for (let bit = 2; bit <= 32; bit += 1) {
    directionY[bit] =
      (directionY[bit - 1] ^ (directionY[bit - 1] >>> 1)) >>> 0;
  }

  return { directionX, directionY };
}

export function sobolSphere(count) {
  const { directionX, directionY } = createSobolDirections();
  const positions = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  let x = 0;
  let y = 0;

  for (let index = 0; index < count; index += 1) {
    // Point zero is part of the canonical Sobol sequence. Advance only after
    // emitting the current state so prefix claims refer to the true prefix.
    const u = x / UINT32_SCALE;
    const v = y / UINT32_SCALE;
    const point = equalAreaSphere(u, v);

    uv[index * 2] = u;
    uv[index * 2 + 1] = v;
    positions[index * 3] = point[0];
    positions[index * 3 + 1] = point[1];
    positions[index * 3 + 2] = point[2];

    let value = index;
    let direction = 1;
    while ((value & 1) === 1) {
      value >>>= 1;
      direction += 1;
    }

    x = (x ^ directionX[direction]) >>> 0;
    y = (y ^ directionY[direction]) >>> 0;
  }

  return { positions, uv };
}

export function fibonacciSphere(count) {
  const positions = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  for (let index = 0; index < count; index += 1) {
    const y = 1 - ((index + 0.5) / count) * 2;
    const radial = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * index;

    positions[index * 3] = Math.cos(theta) * radial;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(theta) * radial;
    uv[index * 2] = ((theta / TAU) % 1 + 1) % 1;
    uv[index * 2 + 1] = (1 - y) * 0.5;
  }

  return { positions, uv };
}

function spreadBits10(value) {
  let bits = value & 1023;
  bits = (bits | (bits << 16)) & 50331903;
  bits = (bits | (bits << 8)) & 50393103;
  bits = (bits | (bits << 4)) & 51130563;
  bits = (bits | (bits << 2)) & 153391689;
  return bits;
}

export function sphericalMortonOrder(positions) {
  const count = positions.length / 3;
  const entries = new Array(count);

  for (let index = 0; index < count; index += 1) {
    const x = positions[index * 3];
    const y = positions[index * 3 + 1];
    const z = positions[index * 3 + 2];
    const longitude = (Math.atan2(z, x) + TAU) % TAU;
    const u = Math.min(1023, Math.floor((longitude / TAU) * 1024));
    const v = Math.min(1023, Math.floor(((1 - y) * 0.5) * 1024));

    entries[index] = {
      index,
      key: spreadBits10(u) | (spreadBits10(v) << 1),
    };
  }

  entries.sort((left, right) => left.key - right.key || left.index - right.index);

  const ordered = new Float32Array(positions.length);
  const order = new Uint16Array(count);

  for (let destination = 0; destination < count; destination += 1) {
    const source = entries[destination].index;
    order[destination] = source;
    ordered[destination * 3] = positions[source * 3];
    ordered[destination * 3 + 1] = positions[source * 3 + 1];
    ordered[destination * 3 + 2] = positions[source * 3 + 2];
  }

  return { ordered, order };
}

export function measureSpacing(positions) {
  if (!ArrayBuffer.isView(positions) && !Array.isArray(positions)) {
    throw new TypeError("positions must be an array or typed array");
  }
  if (positions.length % 3 !== 0 || positions.length < 6) {
    throw new RangeError("positions must contain at least two xyz points");
  }

  const count = positions.length / 3;
  const nearestSquared = new Float64Array(count);
  nearestSquared.fill(Number.POSITIVE_INFINITY);

  // N is fixed at 1536 in the exhibit. Exhaustively visiting every unordered
  // pair is comfortably bounded here and guarantees an exact nearest neighbor
  // for every seed, unlike a fixed-neighborhood spatial-hash query.
  for (let left = 0; left < count; left += 1) {
    const leftX = positions[left * 3];
    const leftY = positions[left * 3 + 1];
    const leftZ = positions[left * 3 + 2];

    for (let right = left + 1; right < count; right += 1) {
      const deltaX = leftX - positions[right * 3];
      const deltaY = leftY - positions[right * 3 + 1];
      const deltaZ = leftZ - positions[right * 3 + 2];
      const distanceSquared =
        deltaX * deltaX + deltaY * deltaY + deltaZ * deltaZ;

      if (distanceSquared < nearestSquared[left]) {
        nearestSquared[left] = distanceSquared;
      }
      if (distanceSquared < nearestSquared[right]) {
        nearestSquared[right] = distanceSquared;
      }
    }
  }

  const distances = new Float64Array(count);
  let sum = 0;
  let minimum = Number.POSITIVE_INFINITY;

  for (let index = 0; index < count; index += 1) {
    const distance = Math.sqrt(nearestSquared[index]);
    distances[index] = distance;
    sum += distance;
    minimum = Math.min(minimum, distance);
  }

  const mean = sum / count;
  let variance = 0;
  for (const distance of distances) {
    variance += (distance - mean) ** 2;
  }
  variance /= count;

  const spacingReference = Math.sqrt((8 * Math.PI) / (Math.sqrt(3) * count));
  const crowding = new Float32Array(count);
  for (let index = 0; index < count; index += 1) {
    crowding[index] = Math.max(
      0,
      Math.min(
        1,
        (spacingReference - distances[index]) /
          (spacingReference * CROWDING_SPAN),
      ),
    );
  }

  return {
    crowding,
    distances,
    nearestNeighborCv: Math.sqrt(variance) / mean,
    nearestNeighborMean: mean,
    nearestNeighborMin: minimum,
  };
}

export function makeDataset(samples) {
  const { ordered, order } = sphericalMortonOrder(samples.positions);
  const spacing = measureSpacing(ordered);
  const crowdingRaw = new Float32Array(order.length);
  const sequence = new Float32Array(order.length);

  for (let destination = 0; destination < order.length; destination += 1) {
    const source = order[destination];
    crowdingRaw[source] = spacing.crowding[destination];
    sequence[destination] = source;
  }

  return {
    positions: ordered,
    crowding: spacing.crowding,
    sequence,
    raw: samples.positions,
    uv: samples.uv,
    crowdingRaw,
    distances: spacing.distances,
    nearestNeighborCv: spacing.nearestNeighborCv,
    nearestNeighborMean: spacing.nearestNeighborMean,
    nearestNeighborMin: spacing.nearestNeighborMin,
  };
}

export function createFixedSamplingDatasets(count = POINT_COUNT) {
  return {
    sobol: makeDataset(sobolSphere(count)),
    fibonacci: makeDataset(fibonacciSphere(count)),
  };
}

export function createSamplingDatasets(
  count = POINT_COUNT,
  randomSeed = INITIAL_RANDOM_SEED,
  fixed = createFixedSamplingDatasets(count),
) {
  return {
    random: makeDataset(randomSphere(count, randomSeed)),
    sobol: fixed.sobol,
    fibonacci: fixed.fibonacci,
    ghosts: [
      randomSphere(count, (randomSeed + RANDOM_RESEED_STEP) >>> 0).positions,
      randomSphere(count, (randomSeed + 2 * RANDOM_RESEED_STEP) >>> 0).positions,
    ],
  };
}
