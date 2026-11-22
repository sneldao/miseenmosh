# Opening redesign — browser verification receipt

Build: `dist/assets/index-BC429zd1.js` via `npm run build`, served by `vite preview` at http://127.0.0.1:5174/ (PID 6401 / listener 6441).
Tests: `npm run test -- src/game/service-review.test.ts` — **44/44 pass** (27 stage-1 + 14 opening + 3 glossary modal cases).
Session: `miseenmosh-opening` (closed; own Chrome profile verified gone, no other sessions touched).

## Captures (this folder unless noted)

- `title-1280.png` — 1280×720 fresh title: hero art, single TAKE THE PASS, Menu disclosure top-right. No cast bios / rules / stats / controls paragraph.
- `title-menu.png` — 1024×600, Menu opened by keyboard focus + Enter (run NOT started): CONTROLS · VOICE · PREP FIRST · The brigade disclosure.
- `first-plate.png` — 1280×720, openingStep "serve": real kitchen, plate at the pass, one `SERVE → TABLE 10` button, ? + PAUSE controls only.
- `call.png` — after serving: docket-styled `TABLE 10 · Beef Wellington · CALL`.
- `cooking.png` — openingStep "judge": PETRA + live progress bar + "Cooking".
- `normal-service.png` — second plate served: full HUD returns, feed shows real events, SERVICE 0:04, SERVED 2.
- `quick-brief-1024.png` — 1024×600 returning-night (staged legitimate v1 night-2 save written by the game, night bumped to 2): compact NIGHT 2 card, 3 portraits with name+mood, FAMILY MEAL row, OPEN THE DOORS, KITCHEN BOOK. Fits without scroll (panel bottom 502 < 600).
- `prepbook-1024.png` (/tmp/mise-opening/) — KITCHEN BOOK = old full prep: brigade detail, family meal (already "bowls licked" — quick-brief meal persisted), coaching. Not kept (full-detail view, secondary).
- `saveissue-1024.png` — staged `{version:2}` save: alert fully inside viewport (bottom 584 < 600), TAKE THE PASS disabled.
- `glossary-modal.png` — Controls modal mid-opening: role=dialog, focus moved to BACK TO WORK, service paused beneath.
- `quick-brief-1024.png` — refreshed after stats cleanup: `£120 · ★ 0` only (no services-left/total).

## Asserted in-browser (real input, no setState injection)

- Waiting at serve/call steps ~15s real time → after opening, SERVICE showed 0:04–0:05 and WALKED 0 — clock/misses frozen until the player acted.
- Mouse-only full opening: SERVE → CALL → cook ~5s → SERVE → normal service with rail/status/scream restored.
- Pause (P) toggles PAUSED overlay during normal service; ? and PAUSE buttons reachable during opening.
- Meal in quick-brief changed real state: morale 70 → 95/76/76 (crispy bit to lowest), buttons lock, book shows "bowls licked".
- OPEN THE DOORS worked by keyboard (autofocus + Enter) AND by mouse click, without visiting prep.
- Menu keyboard interaction (summary focused + Enter) opened the panel and did NOT start the run.
- Glossary modal: opened via the opening's ? button — paused the run, dialog role/aria-modal, focus on BACK TO WORK, Tab trapped inside, Escape closed and the paused flag cleared so the lesson resumed. Title Menu → CONTROLS via Tab/Enter opened the same modal on the title without touching paused; the hidden CTA never activated.
- Quick-brief stats row reduced to cash + stars per review note.

Note: earlier in the session a synthetic `press Enter` dispatched to document.body started the run — a synthetic-focus artifact; with a truly focused summary the guard holds (verified above).
