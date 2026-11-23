# Living kitchen plan — from static room to brigade drama

Status: v4.1, 23 November 2026. Supersedes v4. v4's split was reviewed
against the state machine and the cook rigs; the fixes are folded in:
**the mood glyph mounts at the station top (Dev 2) off a transient
`Cook.mood` field; the pacing floor is reframed as a no-empty guard —
it spawns pending tickets, and `rail→plating` stays gated by the player's
call, so visual busyness comes from the idle loop, not the floor; Petra's
searing fillet is parked/held during idle (food-follow is beat-driven);
audio SFX names are published day-one by Dev 3 with beat calls fired by
Dev 1; each lane carries its own staged frame-budget gate; an explicit
ambient particle budget; crew fetch jobs are event-driven, not time-based;
loop-seam QA; a scream spikes the whole brigade's mood; the couple
gestures name Mara & June.**

## What the owner said

> "the game still feels very static most of the time — think Hell's Kitchen /
> Ramsay's Kitchen Nightmares: constant movement, action, sizzling, flames,
> basting, saucing, cooling, steam — everyone is active … a lot of the time
> no-one is doing anything whilst we are deciding if a dish should be moved
> ahead or not — moreover there doesn't seem to be an emotional gauge (anger,
> sadness, impatience, fun, nervousness) — lastly, we dive straight into the
> game … no emotional stakes or investment — we don't know who the characters
> are or their stories, and it doesn't seem like they unfold — ideally we get
> to know them from marquee moments — we root for some, some seem like
> villains, we change our minds as we learn backstories, romance, hatred."

## Verified state (23 Nov — checked against source, ledger and status doc)

1. **All five bodies are rigged and live.** Petra (real cooker + skillet +
   tongs; `PetraReady`/`PetraWork`/`Walking`/`Running`), Dimitri (sauce pot +
   spoon, `Work`), Anwar (bowl/whisk, `Work`), commis (standby→lift→carry→
   return with panned footfalls + clatter), porter (bus-tub haul + splash).
   Approved collage portraits on `PortraitSocket` throughout.
2. **The static gap is a content problem, not an architecture problem.**
   Each rigged cook owns exactly one `Work` clip; `Ready` is a frozen
   frame-0 subclip + breathing scale on Spine2 ("the pilot ships no idle
   clip"). State machines, crossfades, gaze offsets and event reactions all
   exist — what's missing is a *second motion* between tickets.
3. **Equipment exists at station 0, procedural elsewhere.** Grill has the
   real range/pan/tongs; sauce and pastry have procedural props. Missing:
   hood + shimmer, bain-marie, pastry oven, and the dead zones.
4. **Geometry.** Stations at x = −3.6 / 0 / +3.6. Dead zones are the gaps
   (x ≈ ±1.8) and outer flanks (x < −5.2, x > +5.2), not "the left half".
   Equipment placement targets those zones, incl. a visible wash-up at the
   porter's exit.
5. **Dining guests already idle** — breathing, weight-shift, sip cycle,
   candle flicker (`DiningRoom.tsx`). Extend, don't create: couple
   fight/make-up on the existing `COUPLE_FIGHT` beats, lean-ins on delivery.
6. **Mood exists in three places, none on the body.** HUD `moodOf`
   (sharp/tired/dangerous/feral/walked out); bark engine picks per-state
   banks off `barkAt`; morale/overload/trauma/grudge simulated. Missing:
   shared derivation, body expression, a visible word.
7. **Audio floor exists** — panned sizzle beds, murmur, drone, runner
   footfalls/clatter/splash, verdict stings. Missing: the simmering bed —
   stockpot bubble, hood hush, oven hum, knife work on Work beats.
8. **Pacing.** `SERVICE_LEN` 150 s; spawns on `nextTicketIn` with a ramp
   (`7.5 − serviceTime/25`), so late service self-busies — the dead air
   lives in the first ~60 s. Nothing guarantees a live-ticket floor.
9. **Ledger.** Meshy 135/150 (15 left). Recraft ~70 spent against an
   "existing balance as needed" cap. fal $0 of $1. ElevenLabs is
   **key-blocked**, not just unquoted — sponsor-pipeline keys were never
   supplied. Every new generation job needs its own approval.

## The four pillars

### Pillar 1 — a kitchen that never stops working (motion)

**A. Idle content — the biggest lever, and the spec that keeps it honest.**

*Phase A (free):* loop **neutral Work segments only** — Dimitri's stir,
Anwar's whisk, Petra's turn/sear — never the present/taste/lift gestures.
Three hard requirements beyond loop variety:

- **Petra's searing fillet.** `SearingFillet` is driven by Petra's `Work`
  clip through the tool socket — an idle subclip is a different clip, so
  food-follow would follow geometry it was never built for. **During
  idle the fillet parks static on the pan (or hides); food-follow runs
  only in the full `Work` clip.** Verified in both clips in QA — the one
  hero dish in the game must not float or detach the moment Petra isn't
  plating.

- **Signal preservation.** Players have learned "moving cook = my ticket
  is cooking." Idle motion must read as *background work*: slightly hunched,
  slower tempo, facing the prop rather than the pass. Plating stays the
  full-speed full-clip event. If a blind viewer can't tell "cooking an
  order" from "doing prep," the spec failed — check it in QA.
- **Loop honesty.** ≥ 2 variants per cook, per-cook phase offsets, tempo
  jitter, occasional head-beat breaks. A perfectly repeating loop reads
  worse than a frozen pose. **Loop seams:** a subclip only loops cleanly
  if its segment is periodic (stir, whisk — yes; taste-pause — no); check
  first/last-frame proximity and blend the seam if it pops.

*Phase B (optional spend):* one true Motion Prime prep clip per cook
(Petra: brush the grill / check the bone; Dimitri: taste the simmering
pot; Anwar: tap ramekins / roll dough) — 30 cr against 15 remaining, only
if the cap extends AND the free route proves insufficient.

**B. Living equipment (Phase A, procedural).** Grill: constant low flame
under the real skillet (`Flames` exists — reuse at small scale), hood
canopy, worktop shimmer. Sauce: bain-marie with simmering surface + capped
steam sprites, scaled by station load. Pastry: oven in the gap beside
Anwar, door glow ON while a soufflé ticket is plating — equipment reacting
to real game state sells the station. Gaps/flanks: stockpot (lid rattle on
fire calls), wash-up corner at the porter's exit (tub rack + WASH-UP sign
texture + splash pan), crates, flour dust. All pooled, capped, authored
paths, suppressed under reduced motion.

**C. Pacing floor (Phase A, `state.ts`) — a no-empty guard, not a
busyness generator.** When *work-bearing* tickets — **rail + plating
only** — drop below 2 mid-service, `nextTicketIn` shrinks. `ready` and
`pass` plates are already cooked and must not count (two plates idling on
the counter with an empty rail is exactly the failure this exists to
prevent). Excluded: `openingStep` (inviolate) and the finale (last 40 s).
Framing matters: the floor spawns *pending* tickets — a `rail` ticket only
becomes work when the player calls it (`rail→plating` stays gated by
`plateToPass`; **do not auto-call, that steals the player's verb**). So
the floor guarantees "there is always something to do" but it cannot make
the kitchen *look* busy on its own. Visual busyness during the player's
decisions comes from Dev 1's idle loop and Dev 2's living equipment —
this section is the anti-empty guard, not the anti-static fix. Second-
order effect to watch in QA: more pending tickets feeds misses/walkouts —
good drama, don't overshoot the floor.

**D. Crew traffic (Phase A, honest scope).** Commis/porter rigs have no
gesture to subclip — "micro-actions" are procedural bone-offset sway and
weight-shift at standby, not new gestures. One fetch job, **event-driven,
not time-based**: the porter already cycles out to wash-up and back, so a
second time-based loop on top is exactly the "perfectly repeating loop
reads worse than a frozen pose" failure the standing rules warn against —
the porter's existing haul IS his fetch (he returns with a clean tub
after each cycle); the commis gets one event-triggered job (carries a
clean-plate stack out after N deliveries). True prep gestures for either
belong to the Phase B spend decision. Thief runner stays illustrated
until a body budget exists.

### Pillar 2 — stations you believe in (identity)

Plaques and the real grill are shipped; identity now means the other two
stations' equipment plus the surrounding zones:

- Grill → hood, shimmer, low flame (Phase A).
- Sauce → bain-marie, second pot, ladle (Phase A).
- Pastry → oven with ticket-driven door glow, tart rack, scale (Phase A).
- Flanks → wash-up, stockpot, crates (Phase A).

Phase B (only if cap extends and procedural reads well): Meshy/fal hero
pieces — but the fal $1 pilot covers one body, not kitchen equipment.

### Pillar 3 — a visible mood system (the gauge)

Design rule holds: **no meters without verbs** — every mood input already
has a verb (screaming, smashing, send-backs, coaching, comping all move
morale/trauma/grudge).

- **Derivation:** one pure function `deriveMood(cook, spikes, state)` —
  unit-tested, shared by HUD, 3D and barks. Inputs: morale, overload,
  grudge, burning, trauma + event spikes (smash → anger, praise → relief,
  fire → panic) decaying ~45 s service time, never saved. **A scream
  spikes every live cook toward STRAINED** — the kitchen flinches, the
  design doc's core fantasy, and the gauge reacting to the player rather
  than only per-cook events; it decays like the others. Dev 3 computes
  and stores a **transient `mood` field on `Cook`** in the tick (reset
  each night, never persisted). Every consumer — HUD word, glyph, body
  offsets, bark gate — reads that one field, so the lanes cannot drift.
- **Five moods:** CALM / FOCUSED / STRAINED / ANGRY / EDGE. The HUD words
  (sharp/tired/dangerous/feral) map in and get replaced — one language
  across HUD, body, barks (owner-visible copy change, see decisions).
- **Expressed three ways:**
  - *Body* — additive bone offsets (the mechanism gaze already uses):
    STRAINED slumps + faster breathing; ANGRY braces + faster work (time
    scale keyed to mood, not only `plateDur`); EDGE trembles + hand-on-hip
    idle; CALM gets full breathing. Reduced motion drops offsets.
    ANGRY vs EDGE must never blur at camera distance — braced-and-faster
    vs trembling-and-darting are different silhouettes; verify in the
    blind check.
  - *Glyph* — small ink word **at the station top (y ≈ 2.3, above the
    cook, facing the pass)** — not on the head, so it decouples from
    Dev 1's motion (breathing/slump/tremble can't drift it) and reads at
    both camera distances. Rendered via the existing `signTexture` canvas
    machinery; shown only when mood ≠ CALM, fading on change. **Dev 2
    mounts it in `Stations.tsx`** as a child of the station, reading
    `s.cooks[i].mood` — this closes the v4 ownership gap (the glyph was
    assigned to Dev 3, but its mount point lives in a Dev 1 or Dev 2
    file).
  - *Bark gate* — existing `barkAt` pools get mood gating; no new text
    banks.
- The HUD mood word remains the detail view; **the body is the gauge.**

### Pillar 4 — marquee moments (character investment)

Constraint: no runtime generation, no video in bundle. Two forms:

- **(a) Service-open beats (in 3D).** After `openingStep` completes, an
  ~8-second held beat: cooks idle, one `SpeechBubble` line per cook,
  then the first ticket. Per night, fact-gated (see below), skippable by
  any key, auto-ends.
- **(b) Confessional cards in the KITCHEN BOOK.** One card per cook per
  morning — Phase A/C ships text-over-existing-cast-portrait (free);
  Phase B swaps in Recraft scene stills. **Discoverability fix:** a new
  card must surface as a badge on the morning debrief screen ("Kitchen
  book — new entry") and auto-show the first time it exists; beats hidden
  in a closed book are beats nobody sees.

**Beats unfold, they don't dump.** `(night, recordedFacts) → {speaker,
line, pose}` — pure functions reading the career/event log. A line that
references an event can only fire with its recorded fact; unit-tested.

## The nine-night beat arcs

- **Petra — "do not touch her tongs."** N1 rule → N3 reveal (walked out of
  a three-star over a dish that wasn't right). Smash in anger → N4 goes
  cold; correct well → the existing `honored` keepsake mechanic (already
  catches one fumble a night) becomes her earned payoff.
- **Dimitri — the sauce is his religion.** Ex-boat cook. Humiliation →
  ANGRY has a body; saved sauce → keepsake beat, not just a mechanic.
- **Anwar — the soufflé is for his grandmother.** N7 collapse gets the
  quiet-room beat; the door-call mechanic gains emotional weight.
- **Mara & June — 20-year regulars, subplot.** Existing couple
  fight/make-up + wobble table + HOUSE vow; first call on the dining
  gesture budget.
- **Beefcakes — the villain you almost understand.** Failing place,
  runners all he has; truce lines humanise, rivalry threatens.

## Build order — three developers

Phase A splits into three parallel lanes with disjoint file ownership.
Each lane ships behind `PropBoundary`-style fallbacks and lands behind
its own verification slice; integration happens on `main` in merge order
at the bottom.

### Dev 1 — Bodies & motion ("the actors never rest")

Scope: idle prep loops for Petra/Dimitri/Anwar (neutral-segment subclips,
variants, phase offsets, tempo jitter, **loop-seam blends**, **fillet
parked/held during idle**); commis/porter procedural sway + the
event-driven fetch job; body-language mood offsets (slump/brace/
tremble/tempo) reading Dev 3's `Cook.mood` field; **firing the idle
`sfx(...)` beats (knife, chop, board taps) from the idle loop** — the
beat timing lives here, so the calls live here; Dev 3 owns the SFX
definitions in `sound.ts`.

Owns: `src/scene/BrigadeCook.tsx`, `PetraCook.tsx`, `CommisRunner.tsx`,
`PorterRunner.tsx`, `SearingFillet.tsx` (idle park only),
`IllustratedCook.tsx` (fallback parity), new `src/scene/idleLoops.ts` if
shared machinery helps.

Hard spec: neutral segments only; background-work read; ≥ 2 variants +
jitter; plating must remain visibly distinct from prep; fillet verified
in both clips; idle sfx calls use Dev 3's published names/levels.

**Frame-budget gate (staged):** after this lane lands, measure the frame
interval on the design-doc profile with idle loops ON vs the frozen-
Ready baseline. The 60 Hz target is unverified on this codebase (last
shared-machine capture ~29 submissions/s), so the gate is per-lane, not
end-of-phase only — if idle tanks the budget, the loop runs at lower
tempo or fewer variants before any other lane lands.

### Dev 2 — Room, equipment & dining ("the room is on")

Scope: hood + low flame + shimmer (grill); bain-marie + simmer steam
(sauce); oven + ticket-driven door glow, tart rack, scale (pastry);
stockpot, wash-up corner, crates, flour dust (flanks); **mounting
`MoodGlyph` at each station top** (child of the station, reading
`s.cooks[i].mood` — Dev 3 ships the component, Dev 2 places it, closing
the v4 ownership gap); dining gesture extensions — **the couple
fight/make-up gestures target the 101 pair (Mara & June)**, the named
subplot, on `COUPLE_FIGHT` beats; delivery lean-in; salt pass.

Owns: `src/scene/Stations.tsx`, `src/scene/DiningRoom.tsx`,
`src/scene/KitchenScene.tsx` (mount points only — see collision rule),
new `src/scene/equipment/*` components.

**Ambient particle budget (the number "pooled/capped" was missing):**
≤ 12 steam sprites on screen total across all equipment (bain-marie,
stockpot, oven vents); ambient flame and shimmer are **emissive-only —
no dynamic lights** (the design doc reserves dynamic light for
meaningful events); shimmer is a static texture, no per-frame material
writes; equipment reads state via cheap `useGame` selectors, no
per-frame state churn.

Hard spec: the budget above; authored paths; reduced-motion suppression;
no per-frame allocation; equipment reads game state (oven glow on
soufflé plating, stockpot rattle on fire).

**Frame-budget gate (staged):** after this lane lands, re-measure the
frame interval with equipment + particles ON. If the budget drops below
target, cut the particle budget and static-dress the flanks before
touching food evidence or face quality (design-doc rule).

### Dev 3 — State, mood & sound ("the kitchen has a temperature")

Scope: `deriveMood` pure function + unit tests; event-spike source from
`serviceEvents` (**including the whole-brigade scream spike**); pacing
floor (rail+plating < 2 → pull `nextTicketIn`); **the transient
`Cook.mood` field** computed in the tick and consumed by every lane;
the `MoodGlyph` component (mount is Dev 2's); bark gating; HUD word
unification; audio floor (stockpot bubble, hood hush, oven hum) +
**publishing the idle-beat SFX names and levels in `sound.ts` day one**
(knife, chop, board taps — Dev 1 fires the calls); kitchen-book badge on
the morning debrief.

Owns: `src/game/mood.ts` (new), `src/game/state.ts`, `src/game/sound.ts`,
`src/hud/HUD.tsx`, `src/scene/MoodGlyph.tsx` (new), service-events
consumers. **Publishes day one:** the `Mood` type, the `deriveMood`
signature (stub body acceptable), the `Cook.mood` field name, and the
idle SFX name list — so Dev 1 and Dev 2 code against real contracts from
day one, not guesses.

Hard spec: `deriveMood` pure + tested (five states, spike decay,
trauma/grudge inputs, **scream spike**); spikes decay, never
persisted; floor counts rail+plating only, excluded from opening +
finale; glyph non-CALM only; audio meter-conservative on the existing
master bus.

### Collision & merge rules

- `KitchenScene.tsx` is shared airspace: Dev 2 owns it; Devs 1/3 hand
  mount-ready components (`<IdleCook>`) and Dev 2 mounts them behind
  `PropBoundary` + `Suspense`, same pattern as the runners. The glyph is
  the exception: **Dev 3 ships `MoodGlyph.tsx`, Dev 2 mounts it in
  `Stations.tsx`** at the station-top anchor — Dev 1 touches neither.
- Day-one contract from Dev 3: `Mood` type, `deriveMood` signature,
  `Cook.mood` field, idle SFX name list — Dev 1 and Dev 2 code against
  them from day one. Until `deriveMood` lands, Dev 1 ships idle loops
  only, which have no dependency.
- Merge order per milestone: Dev 3 (state + tests) → Dev 1 (bodies) →
  Dev 2 (room) — state contracts before consumers, consumers before
  dressing. Each merge re-runs the full suite before the next lane
  lands on top.
- One batched deploy at Phase A's end (1 quota slot today, resets daily).
- Nobody edits `serviceEvents` schema — spikes read it, don't extend it.

### Phase A acceptance (the ambitious bar)

- **The 10-second test:** with the HUD hidden and the player idle, a
  viewer must read "service is on" — ≥ 2 bodies visibly working, ≥ 1
  ambient event, steam/flame alive, and can correctly say which cooks
  are cooking an order vs doing prep.
- **The blind mood test:** three stills → reviewer ranks each cook's
  mood without HUD text; ANGRY and EDGE never confused.
- **The gap test:** hold a plate 20 s at the pass — kitchen keeps moving,
  floor keeps ≥ 2 work-bearing tickets, nothing feels paused.
- **The fillet test:** Petra idling → the fillet sits on the pan or is
  hidden, no float or detach; full `Work` clip → food-follow intact.
- **The loop-seam test:** each idle subclip loops 30 s with no pop
  (blend the seam if it pops).
- **Staged performance:** frame interval measured after Dev 1, after
  Dev 2, and at integration — all on the design-doc profile; the final
  number holds 60 Hz. Zero `__propErrors`; reduced motion suppresses all
  of it.

### Phase B — generated assets (separate job approvals)

| Job | Tool | Cost | Gate |
| --- | --- | --- | --- |
| 3 true prep motion clips | Meshy Motion Prime | 30 cr | **Spent (23 Nov)** — Petra/Dimitri/Anwar prep clips live as third idle variants, 9/9 seam-clean |
| walkout + flinch clips | Meshy Motion Prime | 20 cr | **Spent (23 Nov, second account)** — apron-rip walkout + strain-flinch baked into all three rigs; ledger total 50 cr |
| 3–5 confessional stills | Recraft | ~10 cr each | Balance authorised — quote first |
| Beat voice lines | ElevenLabs | unquoted | **Key-blocked** — needs credentials from owner |

### Phase C — nine-night beat script

`(night, facts) → beat` pure functions; text-over-portrait cards with the
debrief badge; service-open beat wiring; every fact-gated line unit-tested.

## Open decisions (recommended defaults — owner confirms)

1. **Meshy cap:** **resolved — extended (owner, 23 Nov).** Phase A's free
   idle still ships first and decides the clips' priority; the Phase B
   prep-clip job is approved, 30 cr, ledger to be updated per job.
2. **Mood words:** unify to the five-word set — one language is the point.
   Map: sharp→FOCUSED, tired→STRAINED, dangerous→ANGRY, feral→EDGE.
3. **Pacing floor:** ≥ 2 work-bearing tickets (rail+plating). 3 risks
   feeding walkouts too fast. Remember the floor only guarantees pending
   work — the idle loop is what makes the room look busy.
4. **Confessionals:** text cards first — proves the beat loop free.

## Standing risks and rules

- Idle loops: neutral segments, ≥ 2 variants, phase offsets, jitter —
  and prep must never read as plating.
- Steam/particles: capped, authored paths, nothing procedural near the
  lens, suppressed under reduced motion.
- Never reintroduce verbosity: beats are seconds and skippable; cards
  live in the kitchen book (with the debrief badge); nothing gates the
  praised direct opening.
- Mood is derived, not a meter. Glyph word + body carry it. A scream
  spikes the whole brigade — the gauge answers the player, not just the
  cooks' own events.
- Fact-gated beats are unit-tested — no line fires without its fact.
- Thief runner stays illustrated until a body budget exists.
- Audio still unheard by a person — new events land meter-conservative;
  the person-listens pass covers the wider surface.
- Transient spikes never saved; beat flags persist and must
  default-load for old saves (versioned migration, `grudge` precedent).
- Deploy quota: 1 slot today — Phase A ships as one batched deploy.

## Verification

- **Unit:** `deriveMood` (five states, spike decay, trauma/grudge inputs,
  scream spike), pacing floor (rail+plating count, opening/finale
  excluded, resume after pause, no auto-call), beat fact-gating.
- **Browser:** idle → rush → recovery on all five bodies; glyph swaps on
  smash/praise in both cameras; floor observable without breaking finale;
  idle-vs-plating blind read; reduced motion; pause/resume.
- **Performance:** frame budget before/after sprites + lights, on the
  design-doc device profile.
- **Human:** person-listens pass over the audio floor; the 10-second
  HUD-hidden test; the blind mood test.
