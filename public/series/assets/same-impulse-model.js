/** SAME IMPULSE: exact response of one underdamped linear oscillator to smooth pulses. */
export const SYSTEM = Object.freeze({ m: 1, c: 0.3, k: Math.PI ** 2, impulse: 1, window: 3, duration: 8 });
export const ALPHA = SYSTEM.c / (2 * SYSTEM.m);
export const OMEGA_D = Math.sqrt(SYSTEM.k / SYSTEM.m - ALPHA ** 2);
export const SPACING = Object.freeze({ min: 0.6, max: 2.2, initial: 1, step: 0.01 });

export function histories(spacing = SPACING.initial) {
  if (!Number.isFinite(spacing) || spacing < SPACING.min - 1e-12 || spacing > SPACING.max + 1e-12) {
    throw new RangeError('Pulse spacing must be between 0.6 and 2.2 seconds.');
  }
  return [
    { id: 'early', name: 'Early pulse', letter: 'A', pulses: [{ start: 0.2, width: 0.6, impulse: 1 }] },
    { id: 'broad', name: 'Broad push', letter: 'B', pulses: [{ start: 0, width: 3, impulse: 1 }] },
    { id: 'pair', name: 'Two pulses', letter: 'C', pulses: [
      { start: 0.2, width: 0.6, impulse: 0.5 },
      { start: 0.2 + spacing, width: 0.6, impulse: 0.5 }
    ] }
  ];
}

export function pulseForce(pulse, time) {
  const u = time - pulse.start;
  if (u <= 0 || u >= pulse.width) return 0;
  return pulse.impulse / pulse.width * (1 - Math.cos(2 * Math.PI * u / pulse.width));
}

export function appliedForce(history, time) {
  return history.pulses.reduce((sum, pulse) => sum + pulseForce(pulse, time), 0);
}

export function accumulatedImpulse(history, time) {
  return history.pulses.reduce((sum, pulse) => {
    const u = Math.min(pulse.width, Math.max(0, time - pulse.start));
    return sum + pulse.impulse * (u / pulse.width - Math.sin(2 * Math.PI * u / pulse.width) / (2 * Math.PI));
  }, 0);
}

/** Exact homogeneous state transition; the displayed norm never rescales. */
export function freeState(x, v, elapsed) {
  const decay = Math.exp(-ALPHA * elapsed);
  const cos = Math.cos(OMEGA_D * elapsed), sin = Math.sin(OMEGA_D * elapsed);
  const b = (v + ALPHA * x) / OMEGA_D;
  const displacement = decay * (x * cos + b * sin);
  return { x: displacement, v: decay * OMEGA_D * (-x * sin + b * cos) - ALPHA * displacement };
}

/** Constant + cosine particular solution, with a homogeneous term enforcing rest at pulse start. */
export function pulseState(pulse, time) {
  if (time <= pulse.start) return { x: 0, v: 0 };
  const u = Math.min(time - pulse.start, pulse.width);
  const amplitude = pulse.impulse / pulse.width;
  const omega = 2 * Math.PI / pulse.width;
  const detuning = SYSTEM.k - SYSTEM.m * omega ** 2;
  const denominator = detuning ** 2 + (SYSTEM.c * omega) ** 2;
  const constant = amplitude / SYSTEM.k;
  const cosine = -amplitude * detuning / denominator;
  const sine = -amplitude * SYSTEM.c * omega / denominator;
  const initialCorrection = freeState(-constant - cosine, -sine * omega, u);
  const x = constant + cosine * Math.cos(omega * u) + sine * Math.sin(omega * u) + initialCorrection.x;
  const v = -cosine * omega * Math.sin(omega * u) + sine * omega * Math.cos(omega * u) + initialCorrection.v;
  return time - pulse.start > pulse.width ? freeState(x, v, time - pulse.start - pulse.width) : { x, v };
}

export function response(history, time) {
  return history.pulses.reduce((state, pulse) => {
    const next = pulseState(pulse, time);
    return { x: state.x + next.x, v: state.v + next.v };
  }, { x: 0, v: 0 });
}

export function residualAmplitude(history) {
  const { x, v } = response(history, SYSTEM.window);
  return Math.hypot(x, (v + ALPHA * x) / OMEGA_D);
}

/** Find displacement extrema by bracketing velocity roots, then bisecting. */
export function peakDisplacement(history, end = SYSTEM.duration) {
  let peak = Math.abs(response(history, 0).x), at = 0;
  let previousTime = 0, previousVelocity = 0;
  for (let i = 1; i <= 1600; i++) {
    const time = end * i / 1600;
    const state = response(history, time);
    if (Math.abs(state.x) > peak) { peak = Math.abs(state.x); at = time; }
    if (state.v * previousVelocity < 0) {
      let lo = previousTime, hi = time, flo = previousVelocity;
      for (let iteration = 0; iteration < 42; iteration++) {
        const mid = (lo + hi) / 2, value = response(history, mid).v;
        if (flo * value <= 0) hi = mid;
        else { lo = mid; flo = value; }
      }
      const root = (lo + hi) / 2, magnitude = Math.abs(response(history, root).x);
      if (magnitude > peak) { peak = magnitude; at = root; }
    }
    previousTime = time; previousVelocity = state.v;
  }
  return { magnitude: peak, time: at };
}
