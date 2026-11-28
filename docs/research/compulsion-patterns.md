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
| Juice | 23 synthesized SFX with stereo panning (`sound.ts`), camera shake (`FirstPerson.tsx`), critic flash (`DiningRoom.tsx`), streak ceremonies ×5/×10/×15/×20, arrival cues, quality microbar, rising-third chime on every clean plate out (`sfx("pass")`) | 8.5/10 |
| Near-miss | Mercy system (regulars forgive before walking); review card names the closest path to the next star in kitchen voice; record line when the streak came within two of the house best | 8.5/10 |
| Variable reward | Golden Wellington, Allen's cod, mercy draws, back door — plus the unscheduled room-stop (14% per qualifying serve past ×6, cooldown 20s, never on round fives) and the 1-in-16 standing ovation for a pristine plate | 8/10 |
| Beatable unfairness | Per-night RNG in arrivals, orders, market lots, critics; scripted nights keep it fair-feeling — and the near-miss walkout is now *named*: a plate that dies seconds from the pass gets its own line in the feed and its own sentence in the review ("the one that got away") | 8/10 |
| Frictionless loop | First-person sim is inherently multi-input; tell halos, capped hints, one-key inspect, the flow assist (`S`/Enter with an empty pass collects and serves in one press), and the two-ready ambiguity now names itself instead of stalling silently | 7.5/10 |
| Visible target | The ghost target: `best ×N` beside the live streak, `NEW HOUSE BEST` the moment it falls, the beat marked in the feed | 8/10 |

Overall: **~7.8/10**, with the residual owned as design intent rather than
leak: the multi-input sim loop is the genre's identity, and the 9-night arc
is a schedule, not a treadmill — both are deliberate tradeoffs for a jam
submission with a finishable story.

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
- **The room stops** — a variable-ratio beat: from ×6 onward, each clean
  serve carries a 14% chance the dining room halts for a streak nobody
  scheduled ("THE ROOM STOPS — ×12. Nobody planned this."), worth +4 ego,
  a hush-then-applause cue and morale across the brigade. Cooldown 20s,
  never stacks with the scheduled ×5 beats — the timing stays unpredictable
  while the reward stays earned.
- **The standing ovation** — a 1-in-16 chance a pristine (85+) plate gets a
  table on its feet: +3 ego and applause. The jackpot the pass can't
  schedule.
- **The flow assist** — `S` (or Enter) with an empty pass collects the lone
  (or explicitly selected) ready plate and serves it in one press
  (`smartServe`); with two ready plates and no selection it does nothing but
  *names the choice*, so the assist never guesses for the chef. The
  inspect-first ritual (F → I → S) is untouched, and the authored opening
  keeps its two-step teaching rhythm.
- **The one that got away** — a walkout whose plate was seconds from the
  pass gets named in the feed ("The Wellington dies 8 seconds from the pass.
  You know the one.") and remembered in the review. Near-miss and unfairness
  in one beat: the sting is legible, survivable, and creates the "I fire
  earlier next time" intention.

Judged against the pattern list, the average now sits at **≈ 8.1/10**. The
residual friction is the genre's identity — you are a body in a kitchen,
and a body has to walk — which is the fantasy, not a leak. The finite arc
is a schedule, not a treadmill, and that is the right trade for a jam
submission with a finishable story.
