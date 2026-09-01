# Validation record

Runtime candidate commit: `e62a6b598082a8eae1be286c525732dad7734bea`

Recorded: 2026-09-01

GitHub Actions: [Validate run 33493313596](https://github.com/CharlesMish/n1536/actions/runs/33493313596)

The runtime candidate passed every repository and production-build browser gate. The hosted
Cloudflare version-preview gate remains deliberately open, so the custom domain and Workshop link
must remain unmodified.

## Completed gates

- [x] `npm run validate`: 12/12 Node tests, Vite 8.2.2 production build, and a five-file deployed-asset/CSP scan.
- [x] Exact nearest-neighbor distances compared point-by-point with an independent exhaustive oracle for initial seed `4217` and 16 consecutive reseeds.
- [x] Known old-hash regression at the tenth reseed, seed `83407`: point 44 nearest-neighbor chord `0.13822014503553082`; exact population NN CV `0.5176592298355536`.
- [x] Canonical Sobol origin and first eight points, exact nested `128 / 512 / 1536` prefixes, and dyadic-net occupancy checks for 128 and 512.
- [x] Twelve consecutive browser `New random` interactions through seed `99245`, including seed `83407`, with the expected displayed CV after every click; reload restored seed `4217` and Fibonacci.
- [x] Desktop Chromium at `1440 × 900`, WebGL2: three methods, Paper/UV, spacing, order walk, reseed, keyboard controls, pointer drag, and plate hover/focus inspection.
- [x] Desktop Chromium at `1440 × 900`, forced Canvas2D: fallback selection, endpoint data, Paper/UV, spacing, order walk, and pointer drag.
- [x] Mobile Chromium at `390 × 844` and `844 × 390`: reachable controls, touch-capable drag path, no document overflow, no tested control overlap, and compact plate behavior.
- [x] Reduced motion: media preference present before navigation, no method morph, no idle rotation path, and the explicit order walk advancing by discrete integer steps.
- [x] Production build served with the copied `_headers` policy. Navigation asserted `default-src 'self'`, same-origin script/style/connect directives, and `frame-ancestors 'none'`, with no `unsafe-inline`, `unsafe-eval`, external scheme, or wildcard.
- [x] Every browser lane finished with zero CSP violation events, console warnings/errors, uncaught page errors, failed requests, HTTP error responses, or cross-origin HTTP requests.
- [x] Passing screenshots for desktop WebGL2, forced Canvas2D, portrait, landscape, and reduced motion were inspected. A short-landscape plate/title collision found during that inspection was removed and the complete matrix rerun.

## Pending hosted gate

- [ ] Upload an authenticated Cloudflare version preview with `npx wrangler versions upload --preview-alias v02-review --strict`.
- [ ] Re-run the same browser assertions against that stable HTTPS preview and inspect the actual response headers.
- [ ] After review, attach and verify `same-n.cmish.dev`; this repository currently defines no route and `workers_dev` remains disabled.
- [ ] Only after the intended live URL passes should a separate cmish.dev PR add the Workshop href.

The review environment had no Cloudflare API credential, and its dashboard session was stopped by a
repeating human-verification challenge. No deployment, custom-domain route, merge, Workshop-link
change, or production promotion was attempted.
