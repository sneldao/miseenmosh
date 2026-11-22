# Flagship local proof — 22 November 2026

The bounded service → morning → next-service route runs locally. M0/M1 remain
open for visual, performance and human acceptance. This is not a release receipt
or evidence that the full nine-night redesign is complete.

## Observed route

Ego task `miseenmosh-flagship-verification`, page `p1`, used the real title,
Continue button and service controls at `http://127.0.0.1:5174`.
The game was not advanced through state setters. Read-only diagnostics detached
snapshots from Zustand and observed actual `WebGLRenderer.render` calls.

| Check | Observed result | Evidence / limit |
| --- | --- | --- |
| Concurrent service and intervention | Three stations cooked simultaneously. A split Wellington was inspected, whisked for 2.4 service seconds, and changed from quality 70/split to 88/smooth. RUN TABLE sent it and Dimitri's ready purée to table 14. | `correction-delivery.json`, `service-route.json`; this establishes rules/reachability, not balance or fun. |
| Morning and authorship | The service ended naturally with 34 served, one missed, two stars and a Dimitri walkout. The review acknowledged the walkout. The morning recalled helping Petra; HERB FINISH persisted as a night-2 recipe credited to PETRA. The following held Wellington had `recipeFinish: herb` and matching inspection text. | `morning-recipe-DU.png`, `herb-inspection-DU.png`, `herb-plate.json`, `next-service.json`. Measured cook duration was 4.158 seconds; the additive recipe-time rule is covered by tests, not an uncontrolled night-to-night comparison. |
| Inputs and layout | I opened/closed inspection. While Controls was open, S/B/X/F/1/I did not mutate service state. On R5 plate/utility buttons were on screen and uncovered at 1450×736. R6 exercised TURN and confirmed all those buttons were on screen, uncovered and contained their text at 1280×720, including RUN TABLE. Sauce correction completed with reduced-motion emulation enabled. | `layout-and-modal-R5.json`, `final-interactions-R6.json`, `turned-smooth-R6.png`. R6 corrected the oversized whisk and RUN TABLE text. Pointer capture returned to fallback view in Ego, so captured-mouse interaction remains unverified. This is not complete reduced-motion acceptance. |
| Presentation | The whole room, three distinct portrait-bearing cooks, condition-driven food volume, inspection and a visible whisk are in the game. Sauce was moved into an exposed part of the plate after inspection revealed occlusion. First-person support hands now follow the raised rim. | Actual captures were viewed at play size. This is a playable foundation: the plastic/procedural look, body/tool embodiment and authored motion still need an art pass. Stills do not establish motion quality. |
| Rules and builds | 59 rules/regression tests passed during implementation. Diagnostic production builds passed TypeScript and Vite after the scene/UI revisions. | Scene-only follow-ups do not count as a new full rules-test run. Final ordinary-build checks are recorded below when completed. |
| Performance | Initial bare captures were below the 60 Hz target. Shared-machine observations identify renderer submission cost and scene complexity; they do not establish physical display cadence or a performance win. | Details below. Whole-tab memory, quiet-machine A/B, presentation-aware timing, cold-load repetitions and long soak remain unverified. |

The evidence filenames above refer to `/tmp/mise-evidence/` during development;
selected durable copies accompany this receipt under `media/flagship/`.
Diagnostic bundle `index-DU_i1iJt.js` produced the complete route and recipe proof.
`index-DiEe1i6F.js` produced the R5 sauce/layout/first-person observations.
Later build identifiers and verification must be listed separately.

Diagnostic `index-Cow3bbDI.js` produced the resource follow-up and final R6
interaction captures. `opening-R6.png` shows the actual world, three cooks, held
plate and SERVE control one second after Continue. The R6 images were inspected
at 1280×720: the smaller whisk no longer dominates the frame and the support
hands meet the plate's rim. The whisk hand is still visually detached from a
full arm; the body/tool art remains unfinished.

`souffle-inspection-R6.png` shows an intact, hot soufflé. Its send-back in
`final-interactions-R6.json` was deliberately a negative-case interaction:
quality 88 and no fabricated fault in the plate event. It is **not** evidence
of the justified-remake branch; that branch is covered by rules tests.

## Initial performance observations

Both captures contain 600 consecutive renderer submissions, with no screenshot
readback during the timed samples. The shared machine was not a quiet benchmark
environment. Renderer: WebGLRenderer; GPU: ANGLE/Metal Apple M3; Chrome 156;
viewport 1450×736; drawing buffer 2175×1104; pixel ratio 1.5; shadows enabled;
visible document; no adaptive tier change. No CPU throttle was requested.

| Metric | Opening, held tutorial plate | Active service |
| --- | ---: | ---: |
| Submission interval median / p95 / p99 | 33.3 / 49.9 / 51.4 ms | 33.4 / 49.1 / 51.3 ms |
| Mean submission cadence | 29.03 Hz | 29.35 Hz |
| Slowest 1% cadence | 18.43 Hz | 18.95 Hz |
| Maximum interval | 66.9 ms | 58 ms |
| Frames over twice the median | 1 | 0 |
| Synchronous render submission median / p95 | 5.1 / 6.2 ms | 3.1 / 5.2 ms |
| Draw calls median / max | 434 / 434 | 443 / 486 |
| Triangles median / max | 61,438 / 61,438 | 61,586 / 67,660 |
| Renderer geometry count range | 355–355 | 413–514 |
| Texture count range | 15–15 | 15–15 |

The busy sample covered service seconds 49.63–70.05, included three simultaneous
cooking jobs and 235 frames with at least two jobs cooking. The opening's service
clock intentionally remained at zero while awaiting the first action.

The CPU measure includes synchronous render submission and shadow submission,
but excludes game/React work before render and asynchronous GPU execution.
Submission intervals are not GPU-completion or physical-presentation times.
These samples do **not** meet the target, and cannot establish a controlled
before/after speed comparison. Frozen raw captures and derived summaries are
kept separately so presentation work does not rerun their derivation.

## Resource follow-up

The original full service ended with 597 renderer geometries. Inspection of
`FoodModel.tsx` and the installed R3F reconciler found memoized geometries passed
through mesh properties/constructor arguments without owned cleanup. The fix
disposes the dish's own geometry when the component or shape variant is replaced;
shared textures remain owned by their cache. The repeated real-input route
completed 41 dishes, the review, the morning and the next held Wellington:

| Checkpoint | Renderer geometries | Textures |
| --- | ---: | ---: |
| Opening, held Wellington | 355 | 15 |
| 8 / 16 / 24 / 32 / 40 served | 355 / 377 / 390 / 389 / 392 | 15 throughout |
| Review after 41 served, disposal callbacks settled | 419 | 15 |
| Next night, held Wellington | 376 | 15 |

These scenes are not identical: the final Wellington was warm/hurried, while
the opening plate was hot/composed. The counts and owned cleanup support the
specific resource fix; they do not prove a flat whole-tab heap or a long soak.
The old `herb-plate.json` predates cleanup and must not be compared against this
new baseline as evidence of a remaining leak.

The new early-rush 600-submission capture covered service seconds 3.33–23.92.
It observed 29.08 Hz mean submission cadence, 33.3/35.3/68 ms interval
median/p95/p99, 84 ms maximum, and 13 intervals over twice the median.
Synchronous render-submission CPU was 3.5/5.4 ms median/p95; draws were
425 median / 475 maximum, triangles 59,630 / 66,990, geometries 355–427,
and textures 15. This includes three simultaneous cooking jobs. It is a
different route segment from the earlier busy capture, with uncontrolled
competing load, so it supplies no before/after frame-rate verdict. The
60 Hz target remains unmet in these observations.

## Independent source/evidence review

A fresh reviewer found no blocking logic defect on the bounded route and
confirmed the station, correction, recipe and geometry-ownership contracts.
The reviewer could not perceive images; all its visual and motion judgments
remain unverified. It flagged an unreachable later-night folklore F-refusal
branch, which now takes precedence inside the F handler; the reviewer checked
that correction by source. The later-night UI path itself has not been played.
Its initial residual-memory concern used a pre-cleanup capture and was withdrawn
after build attribution was corrected.

## Ordinary preview handoff

`env -u VITE_DIAGNOSTICS npm run build` passed TypeScript and Vite. The final
local preview serves `index-DZL1QECZ.js` and `index-C3lZWtpj.css`.
No Telemetry chunk or `__miseReadOnly` identifier exists in that build.

The ordinary build was then opened through the title and checked using DOM
controls: opening serve → call → judge → start three stations → collect
Wellington → inspect → whisk → smooth sauce and enabled SERVE. The browser
reported the exact production bundle and no diagnostic hook.
`production-opening.png` shows the live world and primary action one second
after Continue; `production-correction.png` records the default-view intervention.
`production-smoke.json` records this route and build identity.

The original `mem-career` value for this local origin was restored byte-for-byte
after testing. No other storage was cleared. The preview remains local; no
public deployment, commit, push or PR lifecycle change is claimed.
The scoped Ego task was closed and its absence verified; no agent-browser
Chrome process remained. The preview server still returned HTTP 200.

## Acceptance still open

- An unfamiliar player's comprehension, affection, meaningful choices and desire
  to continue; deliberate service-balance testing rather than the route-driving
  script's decisions.
- Full-size reference comparison and fresh image-capable review of the cast,
  food, materials, tool/body contact and busy-service motion; normal-speed and
  slow-motion sequences.
- Human audio listening, culinary versions/provenance research and cultural
  review.
- Pointer-lock actions on the owner's platform, complete reduced-motion coverage,
  mobile and published-iframe input, repeated cold loads and long-duration memory.
- The wider recipe catalogue, supplier/regular continuity and ninth-night
  culmination described in the design.
