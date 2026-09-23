# SAME — Field studies

The repository now includes the twenty-study SAME series at **`/series/`**, with its index, book of plates, and the latest additions: SAME SUM (study 19) and SAME REACTIONS (study 20), joining SAME DISTANCES, SAME RESIDUAL, and SAME FIT. SAME MOVES, SAME DIVERGENCE, SAME DEGREES, SAME IMPULSE, and SAME EIGENVALUES remain part of the collection. The maintained modular SAME N exhibit lives at **`/same-n.html`**; its header links back to the series. The series N entry redirects to that implementation, preserving its newer shell and accessibility work.

Run `npm run dev` and open `/series/index.html`, or build with `npm run validate`. The expanded studies live in `public/series/`: each page has external same-origin styles and scripts, shared specimen image files, and external Volume workers. No inline-code CSP exception is required. See [the integration notes](docs/series/INTEGRATION.md) and [editorial rationale](docs/series/EDITORIAL_NOTES.md).

The collection is configured for Cloudflare Workers Static Assets. See the hosting settings below.

The studies open as interactive specimens: choose a case in the bottom rail, inspect its response, and open **Read the study** for equations, source data, and audits. SAME FIT retains all four Anscombe datasets; the other updated exhibits use three authored cases. The index and book remain available from each study.

---

# SAME N

**Same count. Different claims.**

SAME N is a full-screen visual exhibit of three ways to place the same number of points on a sphere: seeded pseudorandom surface draws, a canonical two-dimensional Sobol prefix mapped with equal area, and a fixed-size spherical Fibonacci lattice. The exhibit keeps `N = 1,536` constant so the methods can be inspected without pretending that they make the same promise.

The suggested public home for the collection is `https://same.cmish.dev/`. Workers serves the built collection directly; a Custom Domain can be attached in the Cloudflare dashboard.

## Exhibit controls

- Select **Random**, **Sobol**, or **Fibonacci**.
- Toggle **Paper / UV** surfaces.
- Toggle **Spacing** to inspect a local nearest-neighbor overlay.
- Toggle **Order** to walk each method's generation order.
- Use **New random** to advance the deterministic seed by `7,919`.
- Drag the field to rotate the sphere; pointer position moves the inspection light.
- On compact screens, use **Inspect** to open and close the figure plate.
- Keyboard: `1`/`2`/`3` select methods, `P` toggles spacing, `O` toggles order, and `T` switches Paper/UV.
- When the sphere has keyboard focus, the arrow keys rotate it.

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

## SAME series shell

The hosted source separates the reusable exhibit shell from SAME N's scientific implementation:

- `src/styles.css` — shared Paper/UV chrome, responsive layout, inspection disclosure, and accessibility states;
- `src/shell.js` — shared theme, loader, pressed-state, compact-plate, and shortcut helpers;
- `src/study-n.css` plus the remaining `src/` modules — SAME N controls, sampling, plates, and renderers.

This boundary is intentionally narrow. Future SAME studies can reuse the shell while keeping their scientific kernels, claims, tests, and transition semantics independently reviewable. See [docs/SERIES_SHELL.md](docs/SERIES_SHELL.md).

## Run and build

Requirements: Node.js 22.12 or newer.

```bash
npm ci --include=dev
npm run dev
```

Production build and full static validation:

```bash
npm run validate
npm run preview
```

The Vite build is written to `dist/`. Cloudflare Pages/Workers Static Assets reads `public/_headers` into that build and applies a same-origin policy (including same-origin workers for Volume) with no `unsafe-inline` or `unsafe-eval`.

## Cloudflare Workers hosting

Connect this repository to the existing Worker in **Settings > Build**:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | Repository root |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Non-production branch deploy command | `npx wrangler versions upload` |
| Build variable | `NODE_VERSION=22.16.0` (or a compatible newer Node release) |

For checks before each deployment, use `npm run validate` as the build command; it already includes the build. Install development dependencies, since they contain Vite and Wrangler. Workers reads the output directory `./dist` from `wrangler.jsonc`; there is no separate Pages output-directory setting.

The configured Worker name is `same-n`. Use that Worker in the dashboard, or change `name` in `wrangler.jsonc` to match your existing Worker before deploying. `workers_dev: true` enables its public workers.dev address, and `preview_urls: true` keeps version previews available. Custom domains are managed in **Settings > Domains & Routes**; attach `same.cmish.dev` to this Worker if it is not already attached. No domain is automatically claimed by this repository configuration. The internal Worker name can stay `same-n` while the public address is `same.cmish.dev`; keep the old domain attached as an alias if existing links should continue to work.

The homepage `/` redirects to `/series/` for all twenty studies. Browse `/series/plates.html` for the book and `/same-n.html` for SAME N. Host the whole `dist` directory at the domain root so absolute asset links resolve. Keep `assets.html_handling` set to `auto-trailing-slash`: directory indexes need their trailing slash so relative styles, scripts, images, and links resolve inside `/series/`.

For a manual deployment after authenticated Wrangler setup:

```bash
npm ci --include=dev
npm run validate
npx wrangler deploy
```

To upload only a review version, use `npx wrangler versions upload` instead of the final command. Deploying or merging into a connected production branch can publish the site; opening a pull request does not itself promote a Worker version.

The existing `public/_headers` keeps the strict same-origin CSP, blocks iframe embedding, and includes `X-Robots-Tag: noindex, nofollow`. The site remains browsable and shareable; remove that last header when search indexing is desired.

Cloudflare references: [Workers Builds settings](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/) and [Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/).

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
