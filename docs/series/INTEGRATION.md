# Integration into n1536 — 2026-09-08

The accepted ten-study archive is now integrated under `/series/`. The repository's newer modular SAME N remains at `/`; `/series/same-n.html` redirects to it. Its header returns to the collection. We deliberately preserve the hardened renderer, compact inspection disclosure, keyboard controls, and source/test boundary rather than replacing them with the earlier standalone N.

## Source layout

- `public/series/*.html`: index, book, nine studies, and the N redirect.
- `public/series/assets/*.css`: external authored styles.
- `public/series/assets/*.js`: scientific kernels, rendering/control code, and explanation helpers, preserving their original script order.
- `volume-*.worker.js`: exactly the expanded solver worker strings from the input, now served from the same origin.
- `specimen-*.png`: deduplicated raster specimens extracted from the original SVG data URLs.
- `scripts/verify-series.cjs`: the 38 checks adapted to read external scripts.
- `archive/same-series-expanded.zip`: byte-preserved source package; excluded from the deployed build.

The collection retains its existing authored layouts. The original N uses the newer shared shell; the imported studies retain their own isolated styles and explanation helpers. Consolidating those shells is separate from this content integration.

## Hosting and CSP

Vite copies `public/series` unchanged into `dist/series`. All scripts, styles, icons and images are same-origin resources. Static style attributes became external CSS classes. Dynamic bar widths are set through CSSOM from the native numeric rates; trajectory/category colors use classes. Volume creates same-origin workers instead of Blob workers. The response policy changes `worker-src 'none'` to `worker-src 'self'`; it does not allow inline code, eval, Blob workers, data images, or remote dependencies. The original N page's stricter worker-denying meta policy remains in place.

Cloudflare configuration and production routes are unchanged. No Wrangler deployment is part of this update.

## Validation

`npm run validate` runs the existing unit suite, all 38 series checks, the build, and static/CSP checks for the root and all twelve collection pages. The hosted checks require each referenced script and stylesheet to exist, reject inline styles and scripts, and verify external image/worker handling.

CI browser coverage adds series navigation, page initialization under the real response CSP, initial state, Average regrouping and bars, LAW play/restart, and Volume worker completion on the desktop WebGL2 project. The existing eight-project SAME N browser matrix is retained.

Earlier editorial and repair reports are historical records of the standalone editions. Their file-layout and validation descriptions do not supersede this integration note.
