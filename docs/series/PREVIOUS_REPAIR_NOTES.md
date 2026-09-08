# Repair notes

Repair date: 2026-09-05. Source: the supplied `same_series_fixed (5).zip`.

## SAME EARTH

- Corrected the projection name to Equal Earth and repaired the legacy `#mollweide` route.
- Replaced hardcoded globe measurements and bounding-box shape proxies with local differential area scale and principal-axis ratio. The globe uses orthographic foreshortening; Mercator uses its latitude-dependent scale; Equal Earth uses the derivatives of its actual projection formula.
- Split view names each projection's own measurements. Values are local, before independently fitting each map panel to the screen. A screen-size comparison is therefore not an area audit.
- Replaced seam ellipses with clipped disk polygons. Mercator respects its latitude cutoff; the globe clips disks at the horizon. Increased disk boundary sampling to 48 segments.
- Projection changes crossfade complete views. Measurements are withheld while the view changes. Fixed map extents prevent the projection from rescaling as it turns.
- Clarified the inspection plot's area-scale labels, enabled selection on the globe, synchronized split-button state, and stacked split maps on narrow screens.

## Series-wide presentation

- Preserved the existing visual identity, study sequence, frozen inputs, and standalone-file format.
- Added a visible **Read the study** dialog to every exhibit: preserved quantity, changing construction, suggested interaction, measurement definitions, selected-state snapshot, and construction notes. Volume's explanation follows its primary/appendix mode.
- Reflowed narrow screens into heading, canvas, controls, reading, and inspection figure. Retained explanatory text and figures instead of suppressing them. Enlarged controls and reading text and reduced continuously announced content.
- Corrected index keyboard handling so Enter activates the focused link, including the book of plates. Restored native link behavior and modifier-key handling.
- Replaced schematic overview/book illustrations with specimens computed from the exhibits: actual point placements, projected disks, finished density fields, native site rasters, occupied shadow sections, interpolants, paired samples, and Fourier reconstructions. Shared axes or grayscale are used where comparison requires them; Earth panels explicitly disclose independent fitting.

## Other targeted corrections

- **Volume:** corrected the inverted pending-state visibility and withheld finished-design readouts during density transitions. Both solver-worker source strings are byte-for-byte unchanged from the supplied archive.
- **Sites:** gave the checksum its own target so updates cannot overwrite the study heading; removed the conflicting identifier. Main statistics are withheld during metric transitions and restored at the endpoint.
- **Samples:** changed the natural-spline influence description from dying after a few intervals to decaying across intervals.
- **Marginals:** removed overlapping canvas-top annotations at narrow widths.
- **Magnitude:** clarified that the invariant is Fourier magnitude, not a real-space probability distribution.
- Updated exhibit versions and the index's matching version labels.

## Validation

The included dependency-free Node script passes 27 targeted checks: inline JavaScript parsing and local links for all ten pages; Equal Earth area and axis-ratio comparison against finite differences; known-angle orthographic/Mercator values; disk clipping over five seam orientations in both maps; nodal agreement of all three interpolants; marginal permutation/correlation checks; Fourier-magnitude and realness residuals; and canonical shadow-mask equality.

Equal Earth's largest area error in those checks is approximately 4.84e-10, with maximum relative axis-ratio error approximately 4.00e-10. These are sampled checks of the implemented formulas.

Executed the native Volume worker to completion for Carry, Conduct, and Share. The resulting mean densities were approximately 0.40000000, 0.40000000, and 0.40001309. The book's static designs come from these runs. Normalized Share mechanical and thermal compliance are approximately 1.27 and 1.59. The numerical optimization remains a local explanatory calculation.

Browser checks covered all eight revised exhibits, the overview and book; focused-link navigation; study dialogs; restored Sites endpoint readouts; Volume completion and appendix controls; Earth split view; and representative 390-pixel-wide layouts for Earth, Samples, and Marginals. The mobile checks used browser viewports, not physical-device testing.

## Scope and remaining limits

This is a repair and presentation pass, not an independent certification of every numerical method or every browser/device combination. Earth still renders finite sampled polygons and uses the supplied land bitmap; that bitmap has not been independently checked against geographic data. Volume's solvers and stopping criteria are unchanged. Static plate values describe their captured specimens; live Volume runs may differ slightly through floating-point execution. No deployment or publication was performed.
