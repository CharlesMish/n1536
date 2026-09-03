# SAME series shell contract

The shared shell carries the visual and interaction grammar that makes the studies a series. It
does not define a study's data, scientific claims, statistics, renderer, or transition semantics.

## Shared assets

- `src/styles.css` owns the Paper/UV tokens, full-screen field, registration, reading panel,
  inspection plate, tools, method navigation, loader/fallback, focus treatment, safe-area offsets,
  and compact layouts.
- `src/shell.js` owns small DOM-only helpers for required elements, theme presentation, pressed
  controls, loader/fallback lifecycle, compact-plate detection, and safe global-shortcut filtering.
- `src/study-n.css` contains only SAME N identity and control accents. Later studies should receive
  their own study stylesheet rather than adding study selectors to the shared file.

Every hosted study should use the `same-study` root class plus its study identity class. Theme
changes must preserve both classes.

## Interaction and accessibility requirements

- Keep one method-announcement live region. Loading uses `aria-busy`; an error fallback may use a
  status role only while it is visible.
- A canvas inspection surface needs a concise accessible name, associated instructions and
  limitations, a focus indicator, and a bounded keyboard equivalent for its primary pointer action.
- Global single-key shortcuts ignore modifier chords, key repeats, and editable fields. Arrow keys
  belong to the focused canvas rather than the whole page.
- The compact `Inspect` control exposes the plate when the permanent desktop plate cannot fit.
- The shell permits browser pinch zoom and reserves viewport safe areas. A study may further narrow
  touch behavior only on the surface that genuinely requires direct manipulation.
- Reduced motion changes presentation, not the scientific endpoint. A study must stop stale
  velocities and avoid idle rendering when no authored idle motion is present.

## Hosting boundary

Hosted pages use external same-origin CSS, JavaScript, and icons under the policy in
`public/_headers`. Do not add `unsafe-inline`, remote runtime dependencies, or inline style/script
blocks to accommodate a standalone candidate.

Self-contained supplied HTML files remain archival/review inputs. Port their scientific kernels
and authored presentation into maintainable source; do not deploy the monoliths directly.

## Deliberately outside this branch

Study-specific truth corrections remain separate review units. That includes Shadow volume and
mask wording, Samples spline-support and diagnostic wording, Marginals checksum/rank notation, and
Magnitude phase color/encoding. The shared shell must not conceal or pre-decide those changes.
