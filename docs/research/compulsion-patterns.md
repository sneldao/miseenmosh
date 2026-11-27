# Compulsion patterns — what the sticky games actually do, and our audit

Nov 27, 2026. Sources: the Fruit Ninja designer postmortem (ramine.net), the
"Juice it or lose it" talk (Jonasson & Purho, 2012), endless-runner psychology
write-ups (click2.app), Skinner's variable-ratio work as applied to roguelikes
(Super Jump), Vampire Survivors / Balatro breakdowns (platinumparagon,
goombastomp). Question asked: *which interactions do players not get enough
of, and how much of each do we facilitate?*

## The six patterns

1. **Juice — maximum output for minimum input.** Fruit Ninja was prototyped
   in a day and polished for months purely on feel: the fruit mesh rotates so
   the split line matches your swipe, splatter trails follow the finger, the
   screen flashes one frame on impact, combo text is a physics object. None
   of it changes the rules; all of it multiplies the reward of one gesture.
   The hitboxes are generous on fruit and strict on bombs — generosity where
   it feels good, strictness where it costs.
2. **The near-miss is the restart button.** An endless runner's death shows a
   number saying you were *basically there*. That is a targeting signal, not
   a loss signal, and it fires at the exact instant the restart decision
   happens — when judgment is at its weakest. Near-misses work best when the
   player can name the cause ("one piece didn't fit"), not pure chance.
3. **Variable-ratio reinforcement.** Skinner: unpredictable reward schedules
   produce the highest response rates and the slowest extinction. Slot
   machines, roguelikes, Balatro. The ethical version rewards *learning* —
   every run teaches something about how the systems interact — rather than
   lever-pulling.
4. **Intentional unfairness keeps the score beatable.** The Fruit Ninja
   designer ships patterns that are sometimes unfair on purpose: a purely
   skill-based game maxes out the day you hit your ceiling, and randomness
   gives you "if I'd just dodged that one" forever.
5. **One-button input, no interruptions.** Runners run on a loop with no
   menus and no pauses; the stopping decision never finds a calm moment.
6. **A visible target beats an invisible one.** Streaks and personal bests
   only pull if the number is on the wall while you play — Subway Surfers
   shows the coin counter and the mission bar every second.

## Our audit, scored (Nov 27, on `playtest-fixes`)

| Pattern | Evidence in the code | Score |
|---|---|---|
| Juice | 23 synthesized SFX with stereo panning (`sound.ts`), camera shake (`FirstPerson.tsx`), critic flash (`DiningRoom.tsx`), streak ceremonies ×5/×10/×15/×20, arrival cues, quality microbar | 8/10 |
| Near-miss | Mercy system (regulars forgive before walking) is genuinely great; but the review card showed stats with no delta to the next star | was 5/10 |
| Variable reward | Golden Wellington, Allen's cod, mercy draws, back door — but ceremonies were deterministic and the arc schedules the "one more night" | 6/10 |
| Beatable unfairness | Per-night RNG in arrivals, orders, market lots, critics; scripted nights keep it fair-feeling | 7/10 |
| Frictionless loop | First-person sim is inherently multi-input; mitigated by tell halos, capped hints, one-key inspect | 6/10 |
| Visible target | Boards submit on completion, but the best streak was invisible during play | was 5/10 |

Overall before this pass: **6.5/10**. The gap was never charm — it was the
two cheapest compulsion mechanics in the industry: the near-miss and the
visible target.

## What we stole (this pass)

- **The near-miss line** — `nearMissLine()` in `serviceScore.ts` computes the
  closest path to one more star (a pinch of heat, a point of warmth, one more
  cover, the single blemish) and the review card says it in kitchen voice,
  right under the stars. Fires only when the gap ≤ 5 — a blowout gets
  silence, not a lecture. Plus a record line: "Your record ×N stands. Tonight
  ×M." when the streak came within two.
- **The ghost target** — the live status line shows `best ×N` beside the
  streak, and `NEW HOUSE BEST` the moment you pass it mid-service; the feed
  marks the beat ("first time past your best. The room feels it.").
- **The hero flourish on the pass** — a rising-third chime (`sfx("pass")`)
  on every clean (72+) plate leaving the kitchen, on top of the stamp. Juice
  concentrated on the core verb instead of spread evenly.

Judged against the pattern list, that lifts the average to **~8/10**. The
remaining gap is structural (input friction is the genre's identity, and the
9-night arc is a feature — a schedule, not a treadmill) and is the right
trade for a jam submission.
