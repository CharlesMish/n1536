# Editorial revision — 2026-09-05

## My take on the critique

Claude identified a real pacing problem: the back half repeatedly takes an incomplete observation and reveals different compatible objects. I would change the rhythm and make each study's particular question explicit. I would not use “preimages” as the sole inclusion test. That category is broad enough to cover an aggregation example too, even though weighting is a distinct and useful mechanism to understand.

SAMPLES earns its place when it asks how an assumption determines the response to one changed measurement. A global polynomial, a natural cubic spline, and a periodic interpolant encode different forms of dependence. The influence functions make that visible. Knowing that several curves can pass through the same points is the opening observation, not the entire study.

I added LAW and AVERAGE because prediction from an initial state and weighting across groups add useful questions to this collection. All eight earlier studies remain. I changed the sequence, made the question beside each plate more specific, and expanded the book instead of deleting work to preserve an arbitrary length.

## The reading sequence

| New number | Study | Question | Previous number |
| --- | --- | --- | --- |
| 01 | N | What can a shared count promise? | 02 |
| 02 | SHADOW | What did the view discard? | 06 |
| 03 | EARTH | What did the projection change? | 03 |
| 04 | SITES | Who defined nearest? | 05 |
| 05 | SAMPLES | What does one measurement control? | 07 |
| 06 | VOLUME | What does better mean? | 04 |
| 07 | MARGINALS | What did the separate lists lose? | 08 |
| 08 | AVERAGE | Whose weights made the average? | New |
| 09 | MAGNITUDE | What did magnitude leave out? | 09 |
| 10 | LAW | What else does a prediction need? | New |

Existing exhibit filenames are unchanged. Book fragment numbers now refer to this new sequence. The unnumbered title page is called Title; it is not a missing or zero-numbered exhibit. The last four studies now alternate pairing, aggregation, phase, and dynamics.

## SAME LAW

The map is `(x, y) → (2x + y, x + y) mod 1`, represented on the rational grid with denominator `Q = 2^40`. The three starts differ in one coordinate by epsilon. Controls select epsilon equal to `2^-12`, `2^-24`, or `2^-40`; the update rule, domain, and underlying grid do not change.

The state update uses BigInt modular arithmetic. The inverse `(x − y, −x + 2y) mod Q` is exact, so distinct initial states cannot merge because of accumulated rounding. Screen coordinates and reported distances use floating point. The histories are shown as discrete dots, with a logarithmic distance plot underneath. No continuous path is asserted between the dots.

The finite grid necessarily has periodic orbits. This is a finite-time sensitivity exhibit, not a claim that an exact finite-state computer trajectory is aperiodic. It also does not call the rule the complete cause: an initial-value problem includes an initial state.

The exhibit opens paused at step 32 with the smallest separation. At this setting, B first reaches distance 0.1 from A at step 27, and C at step 28. Restart reveals how close the starts were. The threshold is a declared display criterion, not a universal limit of predictability.

The map's determinant is 1, and its eigenvalues are `(3 ± sqrt(5))/2`. These facts explain reversibility and the expanding/contracting directions before wrapping. Further reading: [Hall, Arnold's Cat Map: An Exposition](https://cdr.lib.unc.edu/concern/dissertations/f4752s63h).

## SAME AVERAGE

This study preserves more than the two printed averages: every one of 400 synthetic records keeps its ID, category, and binary outcome. A has 120 successes among 200 records; B has 80 among 200. Only the assignment to Group 1 or Group 2 changes.

| Grouping | Group 1: A, B | Group 2: A, B | Pooled: A, B |
| --- | --- | --- | --- |
| Agree | 80/100, 60/100 | 40/100, 20/100 | 120/200, 80/200 |
| Disappear | 105/140, 45/60 | 15/60, 35/140 | 120/200, 80/200 |
| Reverse | 112/160, 32/40 | 8/40, 48/160 | 120/200, 80/200 |

The displayed difference within each group is respectively +20, 0, and −10 percentage points for A minus B. The pooled difference stays +20 points. The rates, denominators, group weights, and weighted-average equations are visible together. The optional record view keeps each mark in one position and changes its group-indicating shape.

These group labels are deliberately constructed using outcomes. They are not an observed covariate, a causal explanation, or a recommended way to group real data. A pooled comparison and a within-group comparison answer different questions; the more detailed comparison is not automatically the right one. That interpretation follows the distinction discussed by [Andrew Gelman](https://statmodeling.stat.columbia.edu/2009/12/03/simpsons_parado/).

## Revisions to the earlier studies

- **N:** retained the generators and Fibonacci opening. Added the visible statement that a shared count guarantees neither matching coverage nor matching sampling behavior. The explanation now distinguishes a local spacing measure from independence, integration accuracy, or universal quality.
- **EARTH:** explicitly calls the sphere the reference surface and the displayed globe an orthographic projection. Calling the displayed globe only a reference object would miss the projection that is already foreshortening it.
- **SAMPLES:** opens with Influence enabled. The invitation is to inspect the response to a hypothetical +1 at a selected sample. The frozen measured values are not edited. Its new book/index specimen shows both the actual interpolants and their actual cardinal responses at sample 5.
- **VOLUME:** says target budget in the main claim and numerical constraint beside the target. The live readout now reports achieved mean density to eight decimal places. The static plate caption gives all three captured means: 0.40000000, 0.40000000, and 0.40001309. Solver code and stopping criteria remain unchanged.
- **Index and book:** consecutive numbering, ten matching entries, revised keyboard shortcuts, two-column index layout, individual questions and explanations, and computed specimens for both additions.

The constructive studies also use numerical computation and finite rendering. “Exact” should refer to the preserved mathematical construction or exact discrete data, with the appropriate residuals shown; it should not suggest that every screen pixel or floating-point evaluation is exact. Volume's shared target is a different contract and is now presented as such.

## What I would add later, and what I would hold

VALUES would be my next candidate: one fixed array, one fixed class count and palette, explicit boundaries, and a view of which records cross classes. Its useful subject is the decision introduced by classification. It should disclose the objective and tie policy for natural breaks and avoid presenting arbitrary color differences as competing evidence about the world. I have not added it in this edition.

TERMS needs an honest infinite-series contract: finite partial sums do not establish different infinite limits by themselves. I would not treat it as a cheap short plate. DEGREES could add connectivity and discrete structure, but the common degree sequence still leaves multiple graphs compatible with the same summary. Its value would come from the particular network property exposed, rather than escaping the broad underdetermination category.

I would omit neither SAMPLES nor another existing study at this stage. The first editorial cut is repetition in the framing: each plate should earn its own question and interaction.

## Validation and limits

All 38 checks in `tools/verify.cjs` passed. These cover source parsing and local links for twelve pages; the previous projection, interpolation, coupling, spectrum, and shadow tests; exact inverse updates for every displayed LAW state across all three epsilon settings; declared initial distances and distinctness; identity-preserving regrouping of all 400 AVERAGE records; integer count and sign checks; consistent numbering and specimens across the index/book; and the new control handlers through a small DOM event harness.

Additional static checks found no duplicate HTML IDs or broken label targets, parsed the CSS for all twelve pages, and parsed all ten index specimens as SVG XML.

The interface harness exercises actual page scripts and event handlers but has no browser rendering or layout engine. This expanded edition has not had a fresh browser visual or physical-device pass. The earlier eight-study repair had browser checks, documented in the historical notes. No new solver run or deployment was performed in this editorial revision.
