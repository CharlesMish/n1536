# Integration into n1536 — 2026-09-19

The eighteen-study collection is integrated under `/series/`, including the corrected Moves and Divergence pages and the new Distances, Residual, and Fit studies. The repository's newer modular SAME N remains at `/`; `/series/same-n.html` redirects to it. Its header returns to the collection. We deliberately preserve the hardened renderer, compact inspection disclosure, keyboard controls, and source/test boundary rather than replacing them with the earlier standalone N.

## Source layout

- `public/series/*.html`: index, book, seventeen studies, and the N redirect.
- `public/series/assets/*.css`: external authored styles.
- `public/series/assets/*.js`: scientific kernels, rendering/control code, and explanation helpers, preserving their original script order.
- `volume-*.worker.js`: exactly the expanded solver worker strings from the input, now served from the same origin.
- `specimen-*.png`: deduplicated raster specimens extracted from the original SVG data URLs.
- `specimen-*.svg`: shared vector specimens loaded lazily by the index and book. The three tiny raster-backed SVG wrappers stay inline so their PNG references remain visible.
- `scripts/verify-series.cjs`: series links, classic/module script syntax, catalog correspondence, and original numerical checks.
- `tests/series-*.test.js`: independent invariant, response, geometry, and statistics checks for the added studies.
- `archive/same-series-expanded.zip`: byte-preserved source package; excluded from the deployed build.

The collection retains its existing authored layouts. The original N uses the newer shared shell; the imported studies retain their own isolated styles and explanation helpers. Consolidating those shells is separate from this content integration.

## Hosting and CSP

Vite copies `public/series` unchanged into `dist/series`. All scripts, styles, icons and images are same-origin resources. Static style attributes became external CSS classes. Dynamic bar widths are set through CSSOM from the native numeric rates; trajectory/category colors use classes. Volume creates same-origin workers instead of Blob workers. The response policy changes `worker-src 'none'` to `worker-src 'self'`; it does not allow inline code, eval, Blob workers, data images, or remote dependencies. The original N page's stricter worker-denying meta policy remains in place.

Cloudflare configuration and production routes are unchanged. No Wrangler deployment is part of this update.

## Validation

`npm run validate` runs the existing unit suite, the series checks, the build, and static/CSP checks for the root and all twenty collection pages. The hosted checks require each referenced script, stylesheet, and image to exist, reject inline styles and scripts, and verify external image/worker handling.

CI browser coverage adds series navigation, page initialization under the real response CSP, initial state, Average regrouping and bars, LAW play/restart, and Volume worker completion on the desktop WebGL2 project. The existing eight-project SAME N browser matrix is retained.

Earlier editorial and repair reports are historical records of the standalone editions. Their file-layout and validation descriptions do not supersede this integration note.

The first CI browser run exposed the newly introduced N return link being captured by the scene drag handler. Interactive-target filtering now includes native links and form controls. Average grouping buttons also have explicit accessible names, so their names do not depend on spacing between the numeric span and label.

## Studies 11–15

| Study | Frozen contract | Variable |
| --- | --- | --- |
| Moves | Six move identities, lengths, scaled turns and their sum at a selected λ | Permutation; λ is an explicit control shared by all orders |
| Divergence | Analytic source field and outward flux through the same loop | Divergence-free additions to the flow |
| Degrees | Twelve labeled vertices, fixed positions, degree three at each vertex, eighteen edges | Adjacency and source-relative graph reachability |
| Impulse | One mass–spring–damper, starting rest, applied impulse 1 N·s within [0,3] s | Smooth force schedule and split-pulse spacing |
| Eigenvalues | Eigenvalues −1 and −2, starting vector (0,1), fixed coordinate units and Euclidean norm | Upper-triangular coupling k ∈ [0,12] |

The three new pages reuse LAW’s Paper/UV typography and layout with separate study-specific styles. Their pure model modules are shared by rendering, specimen generation and numerical tests. Degrees uses exact integer graph data and breadth-first distances. Impulse evaluates closed-form raised-cosine pulse responses, with a common residual-envelope measurement at 3 s. Eigenvalues uses the analytic exponential solution and checks all stationary candidates for the peak of its one fixed starting vector.

Moves and Divergence retain their authored field layouts. Their CSS and icons are external, canvas shortcuts are scoped to focused inspection surfaces, paused studies stop idle rendering, and hidden pages stop playback. Moves exposes the turn-scale slider and measured heading residual. Divergence keeps its corrected potential, curl/flux formulas and backing-store-aware reading plate. Shadow also invalidates its draw cache on resize, preventing a cleared canvas from staying blank.

The index and book contain all eighteen entries as static HTML, so links and specimens remain available without JavaScript. Navigation enhancement is optional. Original vector specimens are shared assets instead of duplicated multi-megabyte JavaScript strings; catalog and book images load lazily. Existing raster-backed specimen wrappers remain inline because browsers block nested external images inside an SVG loaded as an image.

Browser coverage exercises the five additions with the real response CSP, native range/select keyboard controls, Paper/UV themes, reduced motion, and compact viewports. Numerical tests separate applied impulse from net momentum change and the selected-start eigenvalue peak from worst-case operator amplification.

### Recorded validation for studies 11–15

- `npm run validate`: 46 unit tests, 48 series checks, production build, and CSP/static checks for all 17 collection pages passed.
- Local Chromium 153 browser run: 36 checks passed across desktop, 320px portrait, 667px landscape, and reduced-motion projects. This includes existing studies, Volume workers, and catalog/book with JavaScript disabled.
- Each of the five added pages was also inspected at 375, 750, 1280 and 1920 px in both Paper and UV, with the real response CSP; no horizontal overflow or browser/CSP errors remained.
- The checked-in GitHub Actions matrix continues to use its pinned Playwright Chromium installation and runs all eight projects.

## Studies 16–18

| Study | Frozen contract | Variable |
| --- | --- | --- |
| Distances | Four labeled vertices and all six pairwise distances | Proper orientation; an explicit reflection changes handedness |
| Residual | A = diag(100,1), b = (100,0), Euclidean residual norm 1, κ₂(A) = 100 | Residual direction and the corresponding approximate solution |
| Fit | Four published 11-point Anscombe datasets and their matching summaries at declared rounding precision | Selected dataset, point inspection, and scatter/residual presentation |

Distances distinguishes the current three-dimensional alignment error from the proven global minimum over proper rotations and translations. A centered specimen with known principal covariance makes that minimum explicit; a reflection permits exact agreement. Fixed vertex labels and distance preservation do not depend on the projected screen drawing.

Residual keeps the entire linear system fixed. With r = b − A x̂, the solution error is x − x̂ = A⁻¹r. Its equal-unit panels show the fixed residual circle and the error ellipse; relative residual, relative error, directional amplification, and the condition-number bound remain separate quantities. It is an exact sensitivity construction, not a test of a numerical solver or a claim about roundoff.

Fit draws actual per-dataset least-squares lines and computes every statistic from the published decimal values. The shared summary declares its rounding precision; the numerical audit reveals the differences. All four datasets appear together with fixed axes, and residuals use each dataset’s own computed line. There is no fabricated exact equality or data morph.

All three use external same-origin modules and the established Paper/UV styles. Study 15 links onward to 16; the index, book, and no-JavaScript navigation include all eighteen entries. Production hosting remains a separate action.

### Validation for studies 16–18

The 61-test unit suite includes independent arithmetic checks for the new geometry, residual map, and published quartet. A separate review checked the geometry against an SVD solution, the residual construction against independent linear solves, and the quartet against R’s canonical data and independently computed least-squares statistics. It confirmed that the common sample variance of y needs one-decimal rounding: III and IV round to 4.12 at two decimals, while I and II round to 4.13.

All three pages were inspected at 375, 750, 1280, and 1920 px in both themes under the real CSP. Browser coverage exercises their primary actions, native keyboard controls, precision audit, and narrow/reduced-motion layouts. The root implementation and hosting policy are unchanged.

Recorded local validation: `npm run validate` passed all 61 unit tests, 54 series checks, the production build, and CSP/static checks for 20 collection pages. The 17 targeted Playwright checks passed on Chromium 153 across desktop, 320px portrait, 667px landscape, and reduced-motion projects. Catalog/book QA also passed with and without JavaScript at 375, 750, 1280, and 1920px. GitHub Actions retains the full eight-project browser matrix with its Playwright-installed Chromium.
