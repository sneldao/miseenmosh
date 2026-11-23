# Living kitchen plan — from static room to brigade drama

Status: proposed 23 November 2026, awaiting owner approval to begin Phase A.
Replaces no prior plan; extends `player-attachment-plan.md` (emotional stakes)
and the completed brigade body pipeline in `devlog/kitchen-production-status.md`.

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

## Diagnosis — why it reads static

Three distinct gaps, ordered by how much they cost the experience:

1. **Bodies only perform while a ticket is plating.** Each rigged cook owns
   real work gestures (Dimitri's stir+taste, Anwar's cradle+whisk, Petra's
   sear) but returns to a frozen `Ready` subclip the moment plating ends.
   Between tickets — and always while the player deliberates — nobody moves.
   Hell's Kitchen energy is overwhelmingly *idle work*: wiping, tasting,
   shifting pans, calling out. We built the performers and only let them
   work during the 10% of frames a ticket is cooking.

2. **The emotional simulation already runs — invisibly.** `cook.morale`
   (0–100), `cook.grudge`, `cook.walkedOut`, `cook.fave`, station `burning`
   and overload all update per verdict. None of it reaches the eye: portraits
   never change expression, body tempo never reflects pressure, and the only
   emotional readout is a thin HUD bar. The feed narrates feeling
   ("PETRA — the shallots can hear you crying") while the body stands serene.

3. **Nobody was ever introduced.** The fiction exists — ten cast-gilliam
   cards, named cooks, the BEEFCAKES rivalry, a critic hiding in the room —
   but the praised direct opening drops the player into service with no idea
   who's who. Relationships exist in data (grudges persist across nights via
   the career save) and never surface as drama.

The plan attacks all three in spend order: free fixes first, then art spend,
then the deepest system last.

---

## Phase A — Ambient bustle (no spend; code and clip reuse only)

Goal: at any moment of service, the kitchen is visibly working. This is the
single biggest perceived-life change available and needs no new assets.

### A1. Idle work loops per station

Subclip the existing Work gestures into loopable segments and cycle them
while the station has no active ticket:

- **Dimitri (SAUCE):** stir segment loops; occasional taste beat (lift to
  face) every ~8–12 s, timed by a per-cook phase offset so no two cooks ever
  sync.
- **Anwar (PASTRY):** whisk/cradle loop; a slower pipe-and-fold stretch as
  the alternate.
- **Petra (GRILL):** her Work clip's turn/sear gestures as the idle loop;
  she already owns the richest rig (authored apron bone + swing).

Implementation: extend `BrigadeCook`'s clip map (`REQUIRED_CLIPS` +
`AnimationUtils.subclip`) the same way `PorterRunner` derives `Grab`/`Carry`.
Drive selection from `useFrame`: when a station has a `plating` ticket the
full Work clip plays at speed-mapped timescale (existing behaviour); when
idle, the loop pool rotates with crossfades at boundaries. Tempo scales with
ticket count on the station — a cook with three tickets fidgets fast, an
empty station works slow mise en place.

### A2. Runner and porter idle duties

- **Commis:** between deliveries, a wipe-the-pass loop at standby (reuse the
  Lift clip's bend at reduced timescale as a polish motion), plus occasional
  plate-stack rearrangement — small yaw steps, tray fidget.
- **Porter:** a scrubbing loop at his standby (Carry clip's low frames at
  reduced timescale read as sink work) so wash-up is always faintly alive.

### A3. Atmosphere — steam, flame, sizzle

- **Steam wisps:** a small billboarded-sprite system over the grill pot and
  sauce pot — always on at low rate, flaring during plating, billowing on
  `burning`. Must not crawl: capped sprite count (~24), additive blend,
  authored drift paths, culled under reduced motion.
- **Flame licks:** brief cone-flame pops on GRILL plating beats (reusing the
  FIRE flame geometry at short life), a soft glow flicker under pots.
- **Ambient audio events:** the existing beds get sporadic one-shots —
  `sear`, `clatter`, a low `rattle` — fired on a per-station Poisson
  schedule, panned by `STATION_PAN`, so the room murmurs between beats.
  Conservative levels; the current mix is still unheard by a person.

### A4. Pacing floor

In `tick()`: when live tickets (rail + plating + ready) drop below a
per-night floor (2 early nights, 3 later) and `nextTicketIn` is high, pull
it forward toward 1–2 s. Never inside `openingStep` (the teach beats are
authored) and never overriding authored rush beats or `career` mission
pacing. While the floor holds, occasional authored feed lines name ambient
prep ("Dimitri preps tomorrow's veal stock") so the motion has fiction.

### A — acceptance

- Any contiguous 60 s of service shows ≥ 2 bodies visibly animating and
  ≥ 1 ambient audio/visual event, with no two cooks sharing a frozen pose.
- Player deliberation no longer stills the room: hold a plate 20 s at the
  pass and the kitchen keeps moving.
- No perf regression: 60 fps target holds; steam sprite count capped;
  reduced-motion mode suppresses all of it.

---

## Phase B — Emotional readability (bounded Recraft spend)

Goal: a player can call each cook's state from silhouette and face alone.

### B1. Emote portrait variants

Generate two additional expression crops per cook in the same masked
band-biopic style as `assets/recraft/playable/*.webp`:

- **strained** — jaw set, brows down: morale < 50 or station overloading.
- **broken / furious** — the walkout edge: morale < 25, fresh grudge, or
  station `burning` past a dwell threshold.

`PortraitHead` currently binds one texture per `cookId`; extend `PORTRAITS`
to a per-state table and swap the material map in `useFrame` from cook state.
5 cooks × 2 states = 10 Recraft generations (~10–20 credits each by current
ledger rates — confirm against `devlog/kitchen-production-ledger.json`
before spending; ledger entry per generation as usual). Commis and porter
may each take only a `strained` variant if budget tightens — they're
background emotional reads.

### B2. Body-language telegraphs

- Work-clip timescale maps to morale as well as `plateDur`: a cook at
  morale 15 works visibly slower than one at 90 — despondency is tempo.
- Additive head droop on the portrait socket as morale falls (pitch offset
  scaled `morale/100`), and a restless head-turn cadence while `burning`.
- Walkout already plays Running — add a pre-walkout "frozen stare" beat
  (~1.2 s, Ready clip, head locked on the pass) before the run starts, so
  the moment reads as a decision, not a despawn.

### B3. HUD restraint

Keep the existing bars. Add at most a state-tinted edge on each portrait
rail slot; the face carries the emotion, not a meter.

### B — acceptance

- Blind check: a reviewer shown three scene stills can correctly rank each
  cook's morale without HUD text.
- No expression pops mid-gesture: swaps land on clip boundaries or
  crossfades, never per-frame flicker.

---

## Phase C — Marquee moments (code + existing art; no video pipeline)

Reality-TV introductions are mostly stills, title cards and confessionals —
we already own all three ingredients. No generated video required.

### C1. "Meet the brigade" cold open

Before night 1's first service, a ≤ 20 s DOM cinematic over the title art:
Ken Burns pans across the cast-gilliam cards — name, station, one line of
scar per cook ("DIMITRI — saucier, nineteen years, has never missed a
service"). Petra first (the player knows her), then the brigade, then a
hard cut to the kitchen line. Skippable on any press; shown once per career
(persist a flag in the career save — never reintroduce forced verbosity;
the owner's first-note complaint stands).

### C2. Confessional cards

Event-reactive corner cards during service — the portrait slides up with
one authored line, auto-dismisses in ~3 s, max ~3 per service, never during
`inspecting` or a correction:

- First send-back of the night → the affected cook ("Back? On my sauce?").
- First `burning` → that cook's panic line.
- First walkout → a bitter exit line while the body runs off.
- Critic spotted → the cook whose ticket is live gets a nervous aside.
- 101 wobble / BEEFCAKES runner appearance → porter/commis get rare lines —
  the background cast earning a voice is exactly the reality-TV trick.

Author 3–4 lines per cook covering the trigger states; selection keys off
`serviceEvents` + milestone state already emitted by `tick()`.

### C3. Morning debrief relationship beats

The review screen already names who walked. Extend its copy to surface
relationship state: "Anwar hasn't spoken to you since Tuesday's send-back."
— sourced from `grudge`/morale fields that already persist.

### C — acceptance

- Cold open ≤ 20 s, one-time, skippable; returning players never see it
  again.
- Confessionals fire on real events only; a quiet night gets none.
- Every line is authored (no generated filler) and ≤ ~90 characters.

---

## Phase D — Bonds and rivalries (deepest system; last)

Goal: relationships that change how service plays, not just what it says.

### D1. Bond matrix

A persisted cook-pair affinity field beside `grudge`/`fave` in the career
save, seeded from authored fiction (e.g., Petra commis-mentorship,
Dimitri↔Anwar tension) and mutated by events: shared send-backs strain,
covered rescues bond. Direction can be asymmetric — hatred is rarely
mutual, which is the material.

### D2. Small, honest gameplay teeth

- A bonded cook assists `smother` on a neighbouring burning station (faster
  clear, different feed line).
- A rival plates slower — or briefly refuses — while their rival's station
  burns ("not my fire").
- Walkout contagion: a cook who walks pulls their bond's morale down with
  them.
- A bonded pair on adjacent stations gets a shared plating flourish moment
  (both Work clips sync for one ticket — a small earned spectacle).

### D3. Surface

Feed lines, confessional triggers (rival taunts, bond rescue quips) and the
morning debrief copy — all through Phase C's channels, so no new UI.

### D — acceptance

- At least one bond or rivalry visibly changes a service by night 3 of a
  career, and the morning review can name it.

---

## Ordering rationale

| Phase | Deliverable | Spend | Depends on | Status |
| --- | --- | --- | --- | --- |
| A | Ambient bustle + pacing floor | none | existing rigs | pending |
| B | Emote portraits + body telegraphs | ~10 Recraft gens | A's clip map | pending |
| C | Cold open + confessionals + debrief beats | none | existing cast art + events | pending |
| D | Bond/rivalry matrix with gameplay teeth | none | B's state surface, career save | pending |

A first because perceived life is the owner's loudest note and it costs
nothing. B second because emotion needs a face and it's the only spend. C
before D because confessional plumbing is the delivery channel for the
relationship system's payoffs.

## Standing risks and rules

- **Idle loops must not look robotic.** Rotation of ≥ 2 loop variants per
  cook, per-cook phase offsets, and tempo jitter — a perfectly repeating
  loop is worse than a frozen pose.
- **Steam must not crawl.** Capped count, authored paths, no per-frame
  procedural noise near the lens (performance rule: detail that doesn't
  crawl).
- **Never reintroduce verbosity.** Cold open once per career; confessionals
  one line, auto-dismissed; nothing blocks the praised direct opening.
- **Thief runner stays illustrated** until Meshy headroom returns
  (ledger 135/150; a body needs ~25).
- **Audio is still unheard by a person.** All new ambient events land
  meter-conservative on the existing master bus; the person-listens pass
  now covers an even wider surface.
- **Career saves mutate.** Bond fields must default-load for old saves the
  way `grudge` was retrofitted (`state.ts` night-fields merge), or old
  careers break.
- Deploy quota: 1 slot remains today; batch Phase A into one deploy rather
  than spending per slice.
