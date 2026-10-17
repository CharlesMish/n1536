# Curation pass — review guide

This branch shortens the entrance and makes three existing experiments easier to reach. It does not add or remove a study or change its scientific model.

## Changes

- The index opens with N, SHADOW, SITES, DEGREES, FIT, and REACTIONS. All twenty studies remain available through All studies, with a persistent `#all` URL and a complete no-JavaScript fallback. Original study numbering and specimen captions are retained. Numeric shortcuts follow the visible card order. Version, case chips, duplicate claims, and opening-state labels are removed from cards; the book retains the explanatory catalogue.
- FIT has a Compare all four link into the existing comparison section. Comparison controls switch all four plots between observations and residuals, preserving the selected row and shared scales. Closing returns focus to the link.
- SHADOW separates Turn the body from Inspect cavity. The latter selects Well and pins the ray at (0.58, 0); its occupied intervals reveal the cavity that an exterior rotation may conceal. Front view restores the canonical silhouette. No body geometry changes.
- VOLUME's primary worker survives an appendix visit. Separate worker generations prevent stale messages crossing modes. Primary completion or failure updates its stored state without dismissing the appendix loader or replacing its field. Completed results remain in memory for this page visit, not across reloads. There can be two simultaneous workers while the primary and appendix solve; unfinished appendix cases still restart after leaving them.

## Review A — visitor experience and curation

Review this branch against `main` in CharlesMish/n1536. The production site at https://same.cmish.dev/ may still show the baseline; identify the commit and environment you actually inspect.

Treat this as an independent product review, not a request to agree with the changes. Try the entrance on desktop and a narrow phone. Pick three unfamiliar studies and record: what you expected, your first action, what changed, and what you concluded. Does the six-study entrance invite an experiment? Is the all-studies route obvious? Is any scientific qualification lost by simplifying the cards? Check whether FIT's comparison and SHADOW's cavity action make their lessons more discoverable without explaining away all the discovery.

Give at most five prioritized findings, with a specific page/control, observed evidence, and the smallest useful improvement. Separate observed problems from preferences and untested hypotheses. Recommend a different starting selection only if you can explain what visitor experience it improves. Do not propose new studies or a visual redesign unless the current approach has a concrete failure.

## Review B — behavior and mathematical honesty

Review this branch against `main` in CharlesMish/n1536. Identify the exact commit and distinguish source inspection from executed checks. The production site may not contain this branch.

Inspect the index filtering/keyboard navigation, FIT comparison state and modal focus, SHADOW's turn/cavity controls, and VOLUME's independent worker lifecycle. Test rapid appendix/primary switching before completion; primary completion and failure while the appendix is open; return after completion; and changing/reforming appendix cases while the primary runs. Can stale worker messages, shared loading flags, or cross-mode errors corrupt visible state? Does the primary worker get started more than once unnecessarily?

Check that FIT retains the rounded-equality qualification and common axes, SHADOW's cavity action actually shows two occupied intervals without suggesting rotation reveals the interior, and VOLUME never labels an unfinished or interrupted result complete. Check keyboard access, reduced motion, narrow layouts, and no-JavaScript index navigation.

Report reproducible findings in severity order with file/control references and evidence. State what you could not run. Prefer a small fix over architectural expansion. Do not modify or publish anything during this review.

## Validation

- `npm run validate`: 76 unit tests, 58 series checks, production build, and CSP/static checks pass.
- 32 selected browser tests pass across desktop, phone portrait, and reduced motion, including existing FIT checks, modal focus/deep links, the no-JavaScript index, a live primary solve surviving repeated appendix visits, and an injected primary-worker failure while the appendix is open.
- Six additional curation checks pass at 320 × 568 and 568 × 320.
- Existing shared reading-dialog tests also passed across the twenty exhibits at desktop and 320px widths during the broader regression run.
- Inspected rendered screenshots of the entrance, four-panel comparison, and cavity witness. The desktop comparison keeps all four plot panels in view; phones stack the plots.

Environment note: the pinned Playwright browser download returned invalid archives here. Local browser checks used packaged Chromium 153 with video recording disabled; the repository's browser configuration and dependencies are unchanged. CI remains the check against its normal installed browser.

## Follow-up to the review of f9fc180

- Returning through a study’s series link restores the collection choice for the current tab, using guarded session storage. Explicit `#all` and `#start` URLs override that choice. If storage is unavailable, the index and explicit URLs remain usable; cross-page restoration is unavailable.
- A bottom “All twenty studies” action expands the collection and focuses EARTH, the first newly revealed card. Number shortcuts follow visible order, so 3 opens SITES in the starting six and EARTH in the full collection. Missing positions do nothing.
- FIT states its computed shared rounded line, two-decimal precision, and differing actual coefficients inside the comparison. On screens up to 760px, the same comparison link moves directly after the dataset choices. Its external-link arrow is removed.
- SHADOW displays the two-interval explanation beside the ray, with current coordinates, whenever the selected Well ray crosses the cavity. The desktop inset expands to 400px. Changing to a ray/body without that cavity hides the explanation. Turn and Inspect remain action buttons rather than toggles.
- The starting six remain unchanged. Replacing N with AVERAGE is a useful editorial hypothesis about grouping coverage, not an established usability fix. N’s pre-existing layout issue remains separate.

Follow-up validation: `npm run validate` passes (76 unit tests, 58 series checks, build and CSP checks). The 19 curation browser checks pass across desktop, 390px phone, 320px phone, and reduced motion, using packaged Chromium 153. Inspected desktop FIT and desktop/phone SHADOW screenshots. This is local automated interaction testing, not real touch or screen-reader testing.

## Behavior-review follow-up

The second independent review of f9fc180 identified failures at 844 × 390 and in worker error recovery that the original local test selection missed.

- SHADOW and FIT use their scrolling presentation at widths up to 900px when the viewport is at most 500px tall. SHADOW's depth figure is focusable and visible without relying on focus to reveal a hidden element. Its landscape figure is limited to 560px so the cavity explanation can remain alongside the drawing. FIT's comparison entry stays beside the dataset choices; its compact dialog reserves room for Close.
- VOLUME worker failures stop the loader and offer an explicit Retry solve action. A primary retry restarts all three designs; completed results are retained until retry. Structural retries restart the current case, and selecting another case clears the old error panel. Missing-canvas/worker support retains its separate capability explanation.
- Primary completion/failure in the appendix updates only the status and live announcement. Reduced-motion appendix readouts also withhold intermediate values during other readout updates. Worker shutdown calls name their mode explicitly.
- FIT's comparison-to-explanation transition preserves the original comparison link as the focus-return target. A direct `#quartetCompare` URL opens the comparison view; audit deep links retain their existing behavior.

Validation correction: the old `reduced-motion` project placed `reducedMotion` directly under `use`, which Playwright did not pass to its browser context. Earlier results for that project are **not evidence of actual reduced-motion coverage**. It now uses `contextOptions.reducedMotion`, and the timed worker tests assert the browser's media preference before proceeding. Those tests use the real solver code with outgoing messages held/released to control completion/failure timing; they do not substitute invented numerical results.

## N entrance repair after the offline Argon review

Charlie prefers keeping N. This pass retains the starting six and the opening Fibonacci specimen, and repairs N before revisiting its editorial placement.

- N's sphere has its own grid area. The method explanation, inset, navigation, and tools no longer occupy its drawing surface. Compact layouts scroll, with a dedicated drag surface; text and controls do not initiate sphere dragging.
- The first question is about gaps, with a direct Random/Fibonacci comparison action. The method tabs, reseeding, Spacing, Order, Paper/UV, and the detailed study remain available. The index question uses the same concrete invitation.
- The readout leads with “Spacing variation,” retains NN CV's definition, and explicitly says that a lower value is not a best-method score. Sampling algorithms, seeds, point count, measured values, and transition semantics are unchanged.
- The return link visibly says “← Series.” Its compact target is enlarged and isolated from the oversized heading's hit area. Inspect opens the separate figure below the controls, focuses it, and Escape returns focus to Inspect.

This is a repair of the exhibit's presentation, not evidence that N is the best lead study. Argon's alternative curation and proposed solver wording have not been adopted wholesale.

Validation: `npm run validate` passes (76 unit tests, 58 series checks, build and CSP). All 16 N browser checks pass across the eight configured projects using packaged Chromium 153, with video disabled locally. These exercise WebGL2/Canvas2D, all three constructions, twelve deterministic reseeds, comparison, drag/keyboard controls, inspection focus, actual reduced motion, and layout separation at 1440×900, 390×844, 844×390, 667×375, 320×568, and 568×320. Three additional N reading checks pass (1440px, 320px, and no JavaScript). Local screenshots were inspected at desktop, portrait, and landscape sizes. Real touch, Safari, Firefox, screen readers, and first-time visitor comprehension were not tested.

## Remaining card and comparison refinements

- N's card names Random, Sobol, and Fibonacci under Changes. The caption identifies two views of Fibonacci, and the disk's specimen label explicitly says “Same set.” The starting six and the exhibit's sampling remain unchanged.
- VOLUME's card calls its displayed values completed example results and states that the exhibit solves live when opened, beside the existing target, achieved means, and numerical qualifications.
- The starting-six introduction names all six activities: point placement, a body view, a distance rule, a network, dataset comparison, and beam loading.
- FIT's full explanation offers a return to the compact four-panel comparison. Both directions reuse the existing dialog and preserve the row, point/residual view, and original external focus target. Entering compact comparison avoids scrolling the Close control out of view. The return control is hidden in the unenhanced no-JavaScript reading.

Validation: `npm run validate` passes (76 unit tests, 58 series checks, production build, CSP/static checks). The 21 targeted curation/FIT browser checks pass across desktop, portrait, landscape, narrow layouts, and the reduced-motion project. They cover comparison/explanation round trips, row/view preservation, both original focus-return targets, direct fragments, and collection navigation. N and VOLUME card screenshots and FIT explanation screenshots were inspected at 1440px and 390px. Local browser execution used packaged Chromium 153 with video disabled after the pinned browser download failed. No real touch or screen-reader testing was performed.
