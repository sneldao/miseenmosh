# Living kitchen plan — from static room to brigade drama

Status: v2, revised 23 November 2026 with the owner's colour pass — four
pillars, per-station prep detail, the five-mood gauge, and the marquee
beats/beat-arc sketch now folded in. Extends `player-attachment-plan.md`
(emotional stakes) and the completed brigade body pipeline in
`devlog/kitchen-production-status.md`.

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

## Why it feels static — the real causes (owner's diagnosis, confirmed)

1. **Cooks only perform while a ticket is plating.** The work/arm loops are
   gated on the `plating` ticket state; between tickets the kitchen is three
   people breathing. The rushes feel great — but the decisions (serve /
   send-back / smash) happen in the gaps, so the room goes silent exactly
   while the player is playing.
2. **Three workstations in an 11-unit-wide room.** Stations sit at
   x = −3.6 / 0 / +3.6 with nothing between or around them — no oven, hood,
   sauce pots, prep bench or stock pot. The left half of the room is dead
   space.
3. **Nothing simmers.** Steam exists only on hot plates at the pass. No pot
   bubbles, no oven glow, no constant flame — no "the kitchen is on" even
   before a fire.
4. **Mood lives in the HUD only.** Morale/trauma drive walkouts and barks,
   but the bodies show no emotional state (the tremble is CSS on the name
   tag). You hear anger in the barks and never see it.

## The four pillars

### Pillar 1 — a kitchen that never stops working (motion)

- **Idle = prep.** When a cook has no ticket they cycle station-specific
  mise-en-place loops, aimed at props instead of the ticket: Petra re-racks
  pans and checks the meat on the bone; Dimitri tastes the simmering pot,
  re-shells the bain-marie, whips a spare sauce; Anwar taps ramekins, rolls
  dough, wipes the bench. Same choreography machinery as the work loops —
  `AnimationUtils.subclip` on the existing Work clips plus bone-local prop
  sockets. During a rush the same bodies simply switch targets faster.
- **Living equipment.** Constant low flame under the grill; a sauce pot that
  visibly bubbles with steam; oven-light flicker; a spoon-bath shimmer; a
  rattling stock lid. Pooled, cheap billboards/meshes — the "sizzling" bed
  the ear expects from the shows. Capped counts, authored drift paths, no
  per-frame noise near the lens; all of it suppressed under reduced motion.
- **Cross-station traffic.** The commis/porter already haul plates — extend
  with fetch jobs (a pan from wash-up, trays to the dining room) and short
  walk cycles when a cook reaches for the back bench. Pacing under rush,
  folding towels under lull.
- **Dining room life.** Guests lean in, lift a glass, the couple argues,
  salt is passed — small ambient gestures on a timer for the static figures
  in the mirror/back wall.

### Pillar 2 — stations you believe in (identity)

The plaques say GRILL / SAUCE / PASTRY, but equipment sells the station:

- **Grill** → a real range with hood and heat shimmer.
- **Sauce** → bain-marie, sauce pots, ladle, whisk on the rail.
- **Pastry** → bench, scale, tart rack, an oven door that opens.
- Fills the dead space between and around stations, fixing cause 2 as well
  as identity.

Much of this is pure procedural geometry and can ship this session; the
hero pieces (the range, hero pass props) are where the pending Meshy/fal
budget from `kitchen-production-plan.md` gets spent — Phase B below.

### Pillar 3 — a visible mood system (the gauge)

The design rule is **no meters without verbs** — so mood is derived from
what's already simulated and expressed on the body, not as a new stat:

- **Derivation:** a mood per cook from `morale`, `overload`, `grudge`,
  `burning` and trauma fields already in state, plus short event spikes
  (smash → anger, praise → pride, fire → panic) that decay over a few
  minutes of service time.
- **Five moods:** CALM / FOCUSED / STRAINED / ANGRY / EDGE (nervous).
- **Expressed three ways, all free:**
  - *Body language* — slump vs. braced posture (additive pose offsets on
    spine/neck bones), hand-on-hip, brow-wipe gestures (subclips or
    procedural bone offsets), tremble amplitude, pacing tempo, work-loop
    speed keyed to mood rather than only `plateDur`.
  - *Ink word-glyph* — a small hand-lettered word above each cook at the
    pass ("STRAINED", "EDGE") in the existing ink/collage style; cheap
    quad, swaps on mood change, reads at the game's fixed camera distance.
  - *Bark filter* — the existing bark banks get a per-mood gate so the
    room talks in the mood too; a STRAINED kitchen barks differently to a
    FOCUSED one.
- The HUD morale numbers become the detail view; **the body is the gauge.**

### Pillar 4 — marquee moments (character investment)

Honest constraint first: jam rules forbid runtime generation, and video in
bundle is not the pipeline — so "marquee video" becomes **marquee moments**:

- **(a) In-3D table beats.** 3–4 second beats at the start of service: the
  camera holds, cooks idle, a speech bubble + voice line lands, then the
  first ticket flies.
- **(b) Reel cards in the KITCHEN BOOK.** One illustrated collage still per
  morning (Recraft, the approved band-biopic style and faces), with a spoken
  line — played like a mini-episode between nights.
- **Beats unfold, they don't dump.** Each night's beat references last
  night's recorded events — the review already captures those facts, so
  the beat script reads the career/event log rather than inventing a
  parallel story.

## The nine-night beat arcs (owner's sketch, expanded)

- **Petra — "do not touch her tongs."** N1 establishes the rule; N3 reveals
  why: she walked out of a three-star place over a dish that wasn't right.
  Her trust is what the service rides on — smash a plate in anger and N4's
  beat goes cold; correct it well and she starts catching your fumbles (a
  real mechanic: bonded Petra covers one ruined plate per night).
- **Dimitri — the sauce is his religion.** Ex-boat cook. Humiliate him and
  the grudge has a face (and a body — Pillar 3's ANGRY state); save his
  sauce and the pre-whisk keepsake becomes a story beat, not a mechanic.
- **Anwar — the soufflé is for his grandmother.** N7, when it collapses,
  the room goes quiet. Whether he stays when the door calls now carries
  emotional weight instead of a stat.
- **Mara & June — the 20-year regulars become a subplot.** The wobble table,
  the argument, the make-up — tied to the HOUSE vow; their table gets the
  dining-room gesture budget first.
- **Beefcakes — the villain you almost understand.** His place is failing
  and the runners are all he has left. Détente gets a line that humanises
  him; rivalry keeps him threatening. Either way he returns changed.

## Build order

### Phase A — free, procedural, this session

Idle prep loops (P1) + living equipment (P2 procedural share) + mood system
(3D + glyph + bark filter) + dining gestures + ambient sound floor +
pacing floor (keep ≥ 2 live tickets outside authored beats). Kills "static"
and delivers the gauges with zero credits spent.

### Phase B — generated assets (credit approval per the production plan)

Hero station equipment (Meshy/fal), the morning reel stills (Recraft),
the beat voice lines (ElevenLabs). Optional stretch: expression-variant
portrait crops (Recraft) if body-language + glyph reads as insufficient —
decide after Phase A ships, since the mood glyph may make it unnecessary.

### Phase C — the nine-night beat script

Write the arcs in full, tie each beat to recorded events from the
review/career log, wire into the kitchen book and the service-open beats.

## Status

| Phase | Deliverable | Spend | Depends on | Status |
| --- | --- | --- | --- | --- |
| A | Bustle, equipment, mood system, dining life | none | existing rigs | pending |
| B | Hero equipment, reel stills, voice lines | Meshy/fal/Recraft/ElevenLabs | A's scene | pending |
| C | Nine-night beat script | none | A+B plumbing | pending |

## Standing risks and rules

- **Idle loops must not look robotic.** ≥ 2 loop variants per cook, per-cook
  phase offsets, tempo jitter — a perfectly repeating loop reads worse than
  a frozen pose.
- **Steam must not crawl.** Capped sprite count, authored paths, additive
  blend, nothing procedural near the lens.
- **Never reintroduce verbosity.** Service-open beats are seconds long and
  skippable; reel cards live in the kitchen book, not over play; nothing
  gates the praised direct opening after first view.
- **Mood is derived, not a meter.** No new numeric HUD; the glyph word and
  the body carry it — design rule "no meters without verbs" holds.
- **Thief runner stays illustrated** until Meshy headroom returns
  (ledger 135/150; a body needs ~25).
- **Audio is still unheard by a person.** New ambient events land
  meter-conservative on the existing master bus; the person-listens pass
  now covers a wider surface.
- **Career saves mutate.** Mood history / beat flags must default-load for
  old saves the way `grudge` was retrofitted, or old careers break.
- **Deploy quota:** 1 slot remains today — Phase A ships as one batched
  deploy, not per slice.
