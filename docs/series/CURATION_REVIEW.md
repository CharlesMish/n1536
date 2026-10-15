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
