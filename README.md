# SAME N

**Same count. Different claims.**

SAME N is a full-screen visual exhibit of three ways to place the same number of points on a sphere: seeded pseudorandom surface draws, a canonical two-dimensional Sobol prefix mapped with equal area, and a fixed-size spherical Fibonacci lattice. The exhibit keeps `N = 1,536` constant so the methods can be inspected without pretending that they make the same promise.

The intended public home is `https://same-n.cmish.dev/`. This branch is a review candidate only: its Cloudflare configuration exposes version previews but deliberately contains no production route.

## Exhibit controls

- Select **Random**, **Sobol**, or **Fibonacci**.
- Toggle **Paper / UV** surfaces.
- Toggle **Spacing** to inspect a local nearest-neighbor overlay.
- Toggle **Order** to walk each method's generation order.
- Use **New random** to advance the deterministic seed by `7,919`.
- Drag the field to rotate the sphere; pointer position moves the inspection light.
- Keyboard: `1`/`2`/`3` select methods, `P` toggles spacing, `O` toggles order, and `T` switches Paper/UV.

The initial random seed is `4217`. Reloading restores it.

## What the three labels mean

| Method | Exhibit claim | Bounded meaning |
| --- | --- | --- |
| Random | Independent-draw model | Mulberry32 supplies a deterministic pseudorandom approximation to independent uniform surface draws. Clumps and gaps are expected. It is reproducible, not a source of physical randomness. |
| Sobol | Prefix coverage | The canonical, unscrambled 2D Sobol sequence begins at `(0, 0)` and is mapped to the sphere with an equal-area transform. The plate exposes the nested 128- and 512-point prefixes. |
| Fibonacci | Fixed instrument | A fixed-size spherical lattice uses the golden angle and depends on the chosen `N`. It is not presented as a nested prefix construction across changing counts. |

The square-to-sphere map preserves surface measure. It does not preserve planar distance or establish every possible discrepancy, integration-error, covering-radius, or global-quality claim.

## Spacing statistic

`NN CV` is the population coefficient of variation of each point's nearest-neighbor Euclidean chord distance on the unit sphere:

```text
NN CV = population standard deviation(nearest-neighbor chord) / mean(nearest-neighbor chord)
```

All `1,178,880` unordered pairs are checked for `N = 1,536`; no fixed-neighborhood spatial-hash approximation is used. The colored overlay compares those exact local distances with a planar equal-area triangular-spacing reference and clips the result for display.

**NN CV is a local spacing statistic, not a universal quality ranking.** It does not, by itself, decide which method is “best.”

## Animation disclosure

Method-to-method animation is an exhibit device. Each endpoint is independently placed in a shared spatial presentation order and paired by presentation rank; points are then interpolated on the sphere.

**This is spatially arranged presentation correspondence, not mathematical point transport, optimal matching, sample history, or a generated trajectory between methods.**

## Rendering paths

The primary path is a dependency-free custom WebGL2 renderer. If WebGL2 cannot be created, the same datasets, statistics, controls, and ordering are drawn through Canvas2D. The fallback simplifies lighting and shell effects; it does not change the point-generation or spacing calculations.

Reduced-motion preferences remove method morphs and idle rotation. The explicit order walk remains available and advances discretely.

## Run and build

Requirements: Node.js 22.12 or newer.

```bash
npm install
npm run dev
```

Production build and full static validation:

```bash
npm run validate
npm run preview
```

The Vite build is written to `dist/`. Cloudflare Pages/Workers Static Assets reads `public/_headers` into that build and applies a same-origin policy with no `unsafe-inline` or `unsafe-eval`.

## Review-only Cloudflare upload

After `npm run validate` and authenticated Wrangler setup:

```bash
npx wrangler versions upload --preview-alias v02-review --strict
```

`wrangler.jsonc` sets `workers_dev` to `false`, enables version preview URLs explicitly, and contains no route for `same-n.cmish.dev`. Do not run `wrangler deploy` or promote a version as part of this review.

## Tests

The suite covers:

- canonical Sobol points and nested `128 / 512 / 1536` prefixes;
- exact nearest neighbors against an independent oracle for the initial seed and twelve consecutive reseeds;
- the known old-hash regression at seed `83407`;
- deterministic point generation and unit-sphere geometry;
- production-build CSP and same-origin asset checks.

See [docs/CLAIMS_AND_LIMITATIONS.md](docs/CLAIMS_AND_LIMITATIONS.md) and [docs/VALIDATION.md](docs/VALIDATION.md) for the publication boundary and recorded validation.

## Recovered artifacts

Only the two supplied self-contained builds survived. The original Cursor/Vite module source and the older standalone's embedded source commit could not be recovered from the empty repository, cmish.dev history, public branches, or accessible public repositories.

The files are preserved under `archive/` and are excluded from the Vite build. They are evidence, not deployable source: both contain inline executable code that conflicts with the hosted CSP. The larger earlier standalone is stored as four deterministic XZ parts so it remains practical to transfer through the repository API. Concatenation and decompression reproduce the uploaded bytes and checksum:

```bash
cat archive/same-n-standalone-v1.html.xz.part-* | xz -dc > same-n-standalone-v1.html
sha256sum same-n-standalone-v1.html
```

- `SAME-N-v0.2-candidate.html` — current visual candidate
- `same-n-standalone-v1.html.xz.part-00` through `part-03` — earlier React/Three.js standalone with the prior exact all-pairs spacing routine

Checksums are recorded in [archive/SHA256SUMS](archive/SHA256SUMS).
