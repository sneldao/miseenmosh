# The first-person upgrade — form plan (19 Nov)

*Same game. New camera. Delete the seam between world and UI.*

**Status:** Phase 1 built and deployed (19 Nov, release `de6d1a82`).
Phase 2 started: the room answers. The Phase 2 build is committed but
not deployed — the day's fifth deploy went to Phase 1; the budget resets
23:46 UTC. Verified in a same-origin iframe harness (service, plate,
inspect, charge/scream, `V` fallback); pointer lock itself is not
testable headless, so confirm it on a real browser at the next preview.

## Why — what the platform actually shows

The OpenGame gallery currently lists 15 games (seed content by `@fate`
and `@meticulai`, not the jam field yet). The most-played chart is
dominated by first-person shooters:

| Game | Genre | Plays |
|---|---|---|
| Mod Super Mario Zombies | Shooter & survival | 27.8K |
| Karen Warfare | Shooter & survival | 12.8K |
| Der Koloss | Shooter & survival | 10K |
| Modern Claudefare | Shooter & survival | 8.8K |
| Super Smash Royale | Shooter/battle royale | 7.9K |
| Lost Marbles | Racing & sports | 7.7K |
| Decomp World at War Zombies | Shooter/horror | 4.3K |

Two facts keep this in perspective:

1. **This is seed content, not a market.** The jam opened 18 Nov; entrants
   are just arriving. Plays and likes do **not** count toward judging.
2. **Judging is five equally weighted criteria:** originality, depth, fun,
   performance, visual fidelity. Three of the five favour a novel embodied
   sim over another shooter.

So the conclusion is *not* "become an FPS and fight @fate." It is:
**the bar for presence has been set, and we are on the wrong side of the
camera.**

## Diagnosis — the anachronism is the interface grammar

`App.tsx` is a fixed camera at `[0, 4.6, 7.2]` looking down at a diorama.
`HUD.tsx` renders as a DOM layer on top. The most important acts —
judging a plate, screaming, flagging the inspector — happen outside the
world, with a cursor. That is a 2013 Facebook tycoon game wearing a 2026
3D backdrop.

The art is not the problem. The *form* is: a stage set viewed from the
stalls, with the game played on a form beside it. The FPS games on the
platform don't feel modern because they are shooters; they feel modern
because **the camera is a body and every verb has a physical consequence
in the same space you are looking at.**

## Thesis

> You are the chef. First person, hands on the pass. The kitchen flinches
> when you scream. One guest tonight is the inspector.

Same systems, same fantasy, new form. The **Chef-em-up**: first-person
service drama with a brigade you manage by voice. First-person cooking
exists as a sandbox (Cooking Simulator). First-person *service under
pressure* does not. That is the originality criterion, unclaimed.

### FPS grammar → our equivalent

| FPS grammar | Mise en Mosh |
|---|---|
| Camera is a body | Stand at the pass. Mouse-look in a constrained arc, shimmy along the line. Head bob; breathing quickens with heat. |
| Weapon in hand | Hands and a plate. Hold RMB to **inspect** — quality is visible (wilt, smear, char), not a caption. |
| Fire / melee / reload | **SERVE** (push through the window), **SEND BACK** (slide it down the line), **SMASH** (grab and throw — shards, sound). |
| Recoil, hit feedback | Stamps slam in the world; plates clatter; the room reacts. |
| Spatial audio | Hear a station drowning before you turn to see it. Silence is the tell. |
| You turn to look | Inspector tells become physical: a camera flash in the dining room, a notebook, a table that has been there 92 minutes. Turn and click. |
| Levels are places | The office is a room. Prep is objects on a desk: ringing phone (feud), crate (market), ledger (cash). Pick up, two choices. No dashboard. |
| Progression is visible | Same kitchen, re-dressed across three venues. Stars change the room. |

### A mechanic only embodiment makes possible

**Scream as charge-and-release.** Hold Space to inhale, release to roar.
Duration sets the adrenaline window and the morale bill; over-scream and
the brigade breaks. A skill verb born from being in the room.

## Phases

### Phase 1 — first-person pass (built)

The 80% of the immersion gain. Menus keep the cinematic camera.

- Pointer-lock camera anchored at the pass; constrained yaw/pitch;
  arrow-key shimmy/lean; head bob and breathing.
- Smooth dolly from the menu camera into the pass on RUN SERVICE, and
  back out on review.
- Hands + the pass plate in hand; hold RMB to raise and inspect.
- Center-screen reticle; clicks raycast from the camera, not the cursor.
- Scream charge-and-release with a power meter.
- `V` toggles first person off (accessibility / pointer-lock escape).
- DOM rail, verdict buttons and status stay for this phase.

**Acceptance:** on a fresh service, the camera lands at eye level facing
the brigade; a plate arrives in hand; inspecting it reads at a glance;
S/B/X land; Space charges and releases; turning looks at the dining
window; Escape unlocks and pauses; no frame-rate regression at 1080p.

**Built:** pointer-lock pass with constrained look and arrow shimmy;
menu→pass dolly and back; hands + plate with RMB raise-and-turn inspect
(the dish print is a masked decal lying on the plate, not a billboard);
centre-raycast stations and guests; charge-and-release scream with an
over-hold penalty; `V` fallback. The pass counter is dressed (bell,
order spike, towel, edge lip) and lit, and the brigade got faces,
shoulders and arms so they read as people from eye level. The dining
room was put on a low step and given a front wash so guests clear the
station counters and the pass sill.

### Phase 2 — the room answers (in progress)

- Look-to-aim interactions: smother fires, flag guests, read tickets on
  the rail.
- 3D speech bubbles replace the ticker; one transient line maximum.
- Spatial audio cues for station distress, the printer, the dining room.
- Physical ticket rail: tickets visibly hang, age, and tear. (Hanging,
  aging and click-to-plate are in; the tear/rip on BEEFCAKES theft is
  still to come.)

**Built so far (19 Nov):** the dining room reads as a room — seated
diners in eveningwear over candles and table settings, a timber
architrave around the pass opening, a far wall with prints and sconces,
and a brass lip on the sill. The reticle now reports what it is on
(pale = counter, amber = a guest you can flag, red = a fire you can
smother, with a SMOTHER / FLAG THEM tag). The DOM rail caps at six
dockets with a `+N` chip so a bad run cannot push the rail off-screen.

**Built (slice 2):** the ticket rail is a rail. Dockets are 3D cards on
a steel bar above the pass — table number, dish, station stripe, the
hotkey digit, and a printed age rule that fills as the ticket dies;
paper yellows and a grime bloom spreads, and each card barely swings on
its clip. They are the centre-raycast target: aim at one and the tag
reads PLATE IT, click, and it goes to plating. The tag only offers
`ticket` when nothing is on the pass or plating. While `firstPerson`
holds during service the DOM `.rail` is hidden (the fallback camera and
hotkeys 1–9 keep it).

### Phase 3 — prep as a place

- The office scene: desk, ledger, ringing phone, market crate.
- Market/feud/shop become objects with one decision each (Reigns-style).
- Night-gated disclosure: N1 cold open, N2 market, N3 office shop, N4 feuds.

### Phase 4 — venue re-dress + polish

- Three room states (stall → bistro → flagship) as environmental progress.
- Lighting tiers, performance pass, playtest, deploy.

## Cold open (target for Phase 2/3)

Night 1 opens *inside a service already going badly* — no briefing.
Scripted first 90 seconds teach rail → pass → verdict → scream →
inspector → fire, then the seeded service takes over. See
`docs/research/first-impression.md` for the research base.

## Risks

- **Pointer lock in the OpenGame iframe.** The seeded FPS games prove it
  works, but test on the preview early. Fallback: `V` returns to the
  cinematic camera and the game stays fully playable.
- **Motion sickness.** Constrained yaw, no sprint, FOV ~66, optional
  steady-at-the-pass mode, and no forced head bob during review.
- **Readability.** The DOM HUD gave at-a-glance state. Replace it with
  diegetic surfaces (chalkboard, till, rail) before deleting it. Never
  delete a readable surface without a physical replacement.

## Non-goals

No combat. No photoreal FPS fidelity. No multiplayer. No walking sim.
The track is **Simulation & management**; immersion is the
differentiator, not the guns.
