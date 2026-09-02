# Claims and limitations

This document fixes the scientific and presentation boundary for SAME N v0.2.

## Shared construction

Every method produces exactly 1,536 Float32 points on the unit sphere. The display scales the unit vectors by a common radius. Random and Sobol begin as `(u, v)` pairs in the unit square; both use

```text
y = 1 - 2v
radial = sqrt(1 - y²)
azimuth = 2πu
(x, y, z) = (cos(azimuth) · radial, y, sin(azimuth) · radial)
```

This mapping is equal-area with respect to the uniform square coordinates and spherical surface measure. It is not distance-preserving.

## Random

The initial seed is `4217`. `New random` advances the unsigned 32-bit seed by `7919` and uses Mulberry32 to create two pseudorandom coordinates per point.

“Independent-draw model” describes the construction being approximated. The implementation is deterministic pseudorandom computation, not a claim of physical entropy, cryptographic randomness, or proof of unbiased finite-sample coverage.

## Sobol

The exhibit uses the conventional unscrambled first two Sobol dimensions and includes the canonical zero point. Its first points are:

```text
(0, 0)
(1/2, 1/2)
(3/4, 1/4)
(1/4, 3/4)
(3/8, 3/8)
(7/8, 7/8)
(5/8, 1/8)
(1/8, 5/8)
```

The 128- and 512-point plates are exact nested prefixes of the displayed 1,536-point sequence. The powers of two are useful dyadic nets. The final 1,536-point prefix is not itself a power-of-two net.

“Prefix coverage” is deliberately bounded to the deterministic low-discrepancy construction and these visible prefixes. The exhibit does not claim optimal spherical covering, universal discrepancy dominance, or superior integration for every integrand.

## Fibonacci

The Fibonacci set uses

```text
yᵢ = 1 - 2(i + 1/2) / N
azimuthᵢ = i · π(3 - √5)
```

for `i = 0 … N - 1`. Because `yᵢ` depends on the final `N`, this implementation is a fixed-size instrument rather than a nested prefix family across different counts.

## Exact nearest-neighbor statistic

For each displayed point, the implementation exhaustively compares every other point and records the minimum Euclidean chord distance. For `N = 1,536`, that is `N(N - 1)/2 = 1,178,880` unordered pairs.

The displayed `NN CV` is the population coefficient of variation of those 1,536 distances. It describes variation in one local-spacing statistic. It does not measure the largest empty cap, spherical covering radius, discrepancy, integration error, spectral properties, blue-noise quality, or the fitness of a method for an unspecified task.

The spacing color uses a planar equal-area triangular-spacing reference:

```text
sqrt(8π / (√3 N))
```

The overlay is clipped and nonlinear. “Below local spacing reference” is a visual inspection cue, not a classification of bad points or a proof of an ideal spherical arrangement.

## Presentation correspondence

The three point arrays do not share point identities. For legible animation, each endpoint is independently sorted using a shared longitude/equal-area-coordinate spatial key. Equal presentation ranks are paired and great-circle interpolation is used during the visual transition.

The resulting arcs are not optimal transport, a minimum-cost assignment, mathematical point correspondence, a simulation, or generation history. Statistics are calculated only at the method endpoints and are not interpreted along the morph.

## Rendering fallback

WebGL2 and Canvas2D consume the same typed arrays and exact statistics. Canvas2D approximates the depth, lighting, and point appearance of the primary renderer. A visual difference between rendering paths is not a difference in the sampling methods.
