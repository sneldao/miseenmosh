# Scope vs hint + the flywheel — implementation plan

Role decision: **stay the chef.** Every verb is a pass verb; a commis mode needs a different keyboard. The rise is the room (stall → flagship), the underdog position is economic (debt, van, stall). The receiving end is critic mode (hidden NG+): same systems, reversed lens.

## Principles (gates)

A thing becomes a **system** only if it (a) attaches to an existing key, (b) resolves within a night or pays off across the arc, (c) gives the player agency. Everything else is a **hint** (bark, feed, feud card, folklore, review tail). No simulated meters without verbs. No system punishes curiosity (Hades rule).

## Phase 0 — Eleven words (XS)

N1 doors-open feed line: *"You're the chef because you're the only one who came back."* The whole commis fantasy, free, and it's funny.

- Files: `src/game/state.ts` (startService feed spread, `career.night === 1`).
- Accept: line fires once, N1 only.

## Phase 1 — Name the thresholds (S)

Fatigue, joy, and communication are already simulated — make them legible.

- `FATIGUE_BARKS` / `FLYING_BARKS` in `src/game/barks.ts` (3–4 lines each, voice-matched).
- Tick: when the weakest cook's morale < 25, the bark rotation may pull a fatigue line; when average morale > 80 with a live streak, a flying line. Feed-only, no new state (stateless reads of existing morale).
- Optional buff (M): `flying` flag into `PlateCtx` → fave bonus +2 while the brigade flies. Ceremony line announces it.
- Accept: a player can tell, without opening any panel, whether the brigade is broken or flying.

## Phase 2 — morningPaper (M, highest ROI)

The game already remembers (grudges, press, BEEFCAKES, truce, silent nights). Now say so every morning: one line in the briefing feed naming last night's defining stat.

- Priority: silent night > walkouts > smashed ≥ 3 > spotted > stars tier. One line, not five.
- Reads `s.review` in briefing (it persists across `advanceNight` — verify before building).
- Files: `src/game/barks.ts` (`MORNING_PAPER` pickers), `src/hud/HUD.tsx` (briefing feed), maybe `src/game/state.ts` if a computed field is cleaner.
- Accept: after any distinctive night, the next briefing opens by acknowledging it.

## Phase 3 — Covers (S)

Magazine fame as aspiration texture in the reward layer, never a sim.

- `COVERS` in `src/game/barks.ts` (invented titles: GRIDDLE front page, etc.), awarded on the review card at 4–5★; epilogue tier references the cover at the top tier.
- Persist earned covers per run (`career.covers: string[]`); show the collection on the ending screen.
- Accept: a 5★ night names your cover; three different covers across runs is completable.

## Phase 4 — Legends + daily service (M, the retention ring)

- **Legends** (`localStorage "mem-legends"`, separate from the run save): best streak, silent-five count, covers earned all-time. Read on the title card. Never reset by a new run.
- **Daily service**: title-card option using the existing `daySeed()` as the run seed (session-only flag, never saved). Same tickets for everyone that day; the review share card is the comparison artifact.
- Accept: title card shows legends after any run; two clients on the same date play the same tickets.

## Phase 5 — Critic mode NG+ (L, separate project)

Play as the inspector: same service, reversed lens. Sketched here, built later: observe tells, choose whom to trust, file the review. Reuses all tick systems; new interaction is selection + notebook, not simulation.

## Explicitly out of scope

Cleanliness/hygiene meters, sickness simulation, pest simulation, rank/commis progression, multiplayer, runtime LLM dialogue, any meter without a verb. Rats, inspections, shrooms-dread, and TV offers ship as hints through feed/feud/folklore/review — that is the whole point of gates.

## Order

P0 → P1 → P2 → P3 → P4 → P5. Stop after any phase; each one banks independently.
