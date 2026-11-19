# MISE EN MOSH — Design Doc (v0, Nov 18 2026)

## Fantasy

You are THE CHEF — not cook #3. The pass is your stage. Approve plates or
smash them, scream the brigade into gear or coach them into shape, watch
the dining room for the one guest who decides your stars. Three nights a
week you run service; between services you run your mouth, your menu and
your feuds.

North-star feeling: **authority under pressure.** Ramsay's "Wembley Stadium"
roar when the third star lands — and the pan-throwing cost of getting there.

## Core loop — one night

1. **PREP (morning)** — the MORNING MARKET offers 3 seeded lots per night
   (day-boat scallops, dry-aged beef, "yesterday's fish"...). One lot is
   contested: BEEFCAKES wants it too — outbid him (+£20, +1 heat) or let him
   have it. Bought lots buff a station's plate quality tonight; walk-ins are
   per-night (not saved, so reload can't double-buy). Then the back-office
   shop (drinks / pans / press) and the night's feud card.
2. **SERVICE (the action layer)** — tickets fly in on a rail; brigade works
   stations (physics chaos: pans, flames, dropped plates); finished plates
   hit the pass and YOU judge: SERVE / SEND BACK / SMASH. Escalating
   disasters: fires, equipment failure, walk-in shortages, staff tilting.
3. **CRITIC DETECTION (the deduction layer)** — one guest tonight is a
   mystery inspector. Watch the dining room between tickets: tells across
   three channels — visual (photographing dishes, notebook, measuring a
   sauce smear), behavioral (orders the signature + the trap dish, arrives
   alone, stays exactly 92 minutes), audio (hushed phone call, asks the
   waiter a question nobody asks). Flag before dessert or get blindsided.
4. **REVIEW (the share artifact)** — the next morning's card: stars,
   covers served, dishes sent back, walkouts, and one quotable scream.
   Deterministically shareable (daily-seed service).
5. **FEUD (between nights)** — rival chefs act: poach your sous chef, tip
   off a critic, steal your reservation book, talk trash in the food press.
   You answer with choices that cost ego, money or favors.

## Progression

Street stall → bistro → flagship → empire. Stars 0→3 (the mystery critic
gates them). Black-spoon energy to white-spoon polish. Each venue = new
ticket pressure, new disasters, fancier critics with subtler tells.

## Brigade sim (the heart of depth)

Each cook: `skill`, `speed`, `morale`, `trauma`. Screaming = output now,
morale debt later — walkouts mid-service, flame-outs, or a cook who
becomes a star under you. Coaching between services (clawdy mechanic:
invest time, watch them adapt or fail). A brigade member you've broken
can defect to a rival — and return as their sous chef for a revenge
service.

## Voice layer — the ElevenLabs centerpiece

Sponsor brief is "voice that changes how the game feels." Voice IS the
game here:

- **Voice Design**: every brigade member, rival chef and critic gets a
  designed voice (8–12 distinct voices).
- **Text-to-Dialogue**: service barks, feud cutscenes, the review read-out.
- **Sound Effects**: ticket printer, pan hits, fire, plate smash, dining
  room murmur — the kitchen cacophony is a mechanic (you hear a station
  go quiet before you see it).
- **Music**: 90s band-biopic score (the BBC framed the chefs as "the Chef
  Pistols") — grimy intro riff, service-time adrenaline, acoustic comedown
  for the review card.
- **Forced Alignment**: karaoke subtitles on screaming fits — comedy and
  accessibility in one.
- Signature mechanic: the **YES, CHEF** call-response. You scream, the
  brigade answers. Chorus quality = morale read-out you can *hear*.

## Art & asset pipeline (all baked, all in-bundle)

- **fal MiniMax H3 Image** (free until ~Dec 1): dish art, menu cards,
  rival portraits, newspaper/review clippings, venue exteriors, title art.
- **fal Idol Max / Turbo**: hero chef + key characters — image → rigged
  GLB with animations in ~20s.
- **Meshy t2.5** (smart topology, T-pose + rig + free walk/run):
  brigade characters, critics, kitchen props, plates/food at game
  polycounts.
- **Meshy 7.1**: hero props only (the pass, the range, signature dishes).
- Direction: band-biopic grain — VHS-grain feud flashbacks, warm pass
  lighting vs cold dining room, ticket-rail typography, chunky readable
  stations (Papa's-legibility × The-Bear-grit).

## Viral/share design

- **Daily service seed** — same tickets for everyone that day; "Tonight's
  Review" card is the share artifact (stars, covers, walkouts, scream of
  the night).
- **Funny failure is the marketing** — fires, walkouts, the critic
  catching a burnt plate, a brigade member hurling their apron at the
  pass.
- **Hidden mode** — at 3 stars, flip roles: play as the inspector
  infiltrating someone else's service.
- **Beefcakes** — gym-bro rival chef: protein-only menu, shirtless
  birthday posts mid-feud. (Named for the Ramsay-at-60 thirst-trap cycle.)
- Screenshot test: a screaming chef silhouette at the pass in a ticket
  storm — legible in 3 seconds, no caption.

## Scope fence (30 days, one dev + agents)

- ONE core room per venue; camera mostly fixed (ticket rail + pass +
  dining-room window). No open world, no multiplayer, no runtime AI calls.
- Scripted+baked dialogue trees, not runtime LLM (offline review).
- 8–12 voices, ~20–30 generated characters/props max, curated hand-fixes.
- Complete game = 3 venues, ~15 services, feuds, ending (3rd star or
  flame-out epilogue). Short and polished > long and thin.

## Tracks

- Genre: **Simulation & management**
- Sponsors: ElevenLabs (flagship), fal, Meshy — all three, earned via
  real usage.

## Implemented (as of Nov 18, night 1 build)

Single-night vertical slice, browser-verified end to end:

- **Service loop**: seeded ticket rail → plate (skill-timed delay) →
  quality-tiered plate slides to the pass → SERVE / SEND BACK / SMASH
  with branching consequences and rubber-stamp verdicts.
- **Brigade**: three named cooks; morale drains under load, recovers
  idle, bottoms out into animated walkouts; chef covers dead stations
  at 1.8×. SCREAM buys a 6s adrenaline window at rising cost; the
  brigade answers with rotating chorus lines.
- **The room talks**: ambient chef barks, guest heckles on send-back,
  BEEFCAKES rival drama at 35s/75s/118s (the middle one steals a ticket
  off your rail).
- **Inspector**: faster tell clock (phone raise + screen flash),
  civilian decoys, flag-before-dessert deadline, always orders the
  signature Wellington; critic verdict lands on the review card.
- **Escalation**: dessert-course stampede at 100s + printer speed-up.
- **Scoring**: streaks (heal brigade every 5), ego, stars formula with
  theatre bonus for smashing without misses.
- **Feel**: full keyboard play, pause, WebAudio synth SFX placeholder
  bus (replaced by baked ElevenLabs later), smash shrapnel, camera
  shake, plate slide-in.
- **Share artifact**: receipt-style review card + COPY REVIEW block;
  SAME SERVICE, AGAIN replays the identical seeded night.

### Career layer (Nov 18, night 2)

The game is a residency now, not a night:

- **9-night arc**: title → office briefing → service → review →
  briefing → … → ending. Three endings: bankruptcy flame-out
  (cash < −£60), three-star win (≥10★ total), or "footnote in the guide."
- **The office**: ledger header (night, venue, cash, stars, services
  left), last-night take (covers × venue price − wages − breakage;
  walked-out cooks still draw half pay), brigade panel showing morale,
  skill and trauma scars (✕ per past walkout — they drain faster
  forever), a shop (drinks £40 / better pans £80 ×3 / comp the press
  £60), and the night's BEEFCAKES feud card.
- **Feud cards**: one per night from a 4-event deck — poach attempt on
  the weakest cook (match £90 or lose them to the protein people; a
  NEW_BLOOD replacement joins), press quote (trash-talk = +heat vs
  classy = +morale), stolen fish delivery, food-truck blockade. Heat
  (aggro) makes his runner steal a second ticket mid-service.
- **Persistence**: localStorage career save (career + brigade incl.
  trauma and feud resolution), title offers CONTINUE/NEW RESIDENCY,
  save-blocked browsers get told.
- **Venues**: STALL 86 → LE MOSH (≥5★) → MOSH & SON (≥10★), each
  repricing covers and raising pressure (faster printer, faster critic
  tells).

## Reused DNA (ideas only — legal per rules §06)

| Source | Becomes |
|---|---|
| clawdy — coach an agent, watch it adapt | brigade training sim |
| NIGHT SHIFT / detective — spot the impostor | spot the inspector |
| snapflip — order-book bidding | morning fish market |
| sportwarren — stats-as-love-letter | brigade sheets, service reports |
| agnej / pinball — physics chaos | service-floor physics |
| enigmagift / writersarcade — gen pipelines | asset pipeline patterns |
| Beef Cakes (unused name) | rival chef character |

### Chaos & personality (Nov 18, night 3)

- **Station fires**: a station holding 3+ live tickets for 8s ignites —
  flickering cones + orange light, morale drains ×2, plates carry −8
  quality, brigade panel shows FIRE. Click the station: "You smother
  the fire with a hotel pan." Physics chaos v2 done: fires + falling
  pans (shelf pans clatter, bounce, spin and fade when a cook storms
  off) + fumbles (a cook under 30 morale bins 15% of plates — ticket
  back on the rail at 60% age).
- **BEEFCAKES has a body**: a hulking silhouette shoulder-checks into
  the pass window for ~4s at every rival event, red rim light,
  absurd delts, backward cap.
- **Scream heat-pulse**: the whole kitchen floods red for ~1.2s.
- **Vocabulary expanded**: 14 chef barks, station-directed insults
  ("PETRA — charred is a flavour. Cremated is not."), more heckles
  and rival lines.
- **First sponsor asset landed**: Meshy meshy-t2.5 cloche (5 credits,
  untextured preview → tinted tarnished silver in-scene) sits on the
  pass and hops/spins when a fresh plate lands. GLB pipeline proven:
  generation → download → `public/models/` → `useGLTF` → in-scene.

### Generated art pass (Nov 18, night 3, cont.)

First wave of baked art (Recraft, custom "band-biopic grain" style —
see assets/recraft/manifest.json for provenance):

- **Verdict stamps**: real rubber-stamp SVGs (SERVE / SENT BACK /
  SMASHED) replace the text stamps — still slam mid-screen.
- **Dish sprites**: generated plated-dish art on the pass plate by
  dish name (wellington / sea-bass / quenelle families); criminal
  plates keep the sad lump. Serviceable plates dim.
- **Title**: cover-art chef-in-ticket-storm backdrop + SVG lockup
  replaces the text H1.
- **Wall**: Chef Pistols gig poster replaces the procedural poster.
- `src/vite-env.d.ts` added for asset imports.

Provenance note for the judges: every raster/vector asset under
`assets/recraft/` was generated during the jam window via the Recraft
MCP (manifest holds style id + date) and is baked into the bundle.


## Art direction — locked (19 Nov)

**Gilliam collage people / linocut food / '70s cookery paper.**
Recraft styles: gilliam-collage da25e4f6, linocut-food 4d3d77fd,
cookery-70s f7f7d7fa (riso-punk f7ae045b banked as alternate).
Band-biopic retired — it produced the cinematic brooding we escaped.
Cast cards + title lineup in assets/recraft/cast-gilliam, dishes in
food-lino, market chalkboard in paper-cookery.

## Form upgrade — first person (19 Nov)

The fixed diorama camera + DOM HUD reads as a bygone-era management
game. The art stays; the interface grammar changes. Full plan:
[first-person-upgrade.md](first-person-upgrade.md).

**Thesis:** you are the chef — first person, hands on the pass, a kitchen
that flinches when you scream. Same systems, new form. The *Chef-em-up*:
first-person service drama with a brigade you manage by voice. No
first-person cooking game has shipped the tyrant-chef fantasy; the
originality is in the form.

**Phase 1 (in build):** pointer-lock camera anchored at the pass,
constrained look, shimmy along the line, hands + plate in hand, RMB to
inspect, center-screen reticle with world raycasts, charge-and-release
scream, `V` fallback to the cinematic camera.

**Phase 2:** look-to-aim the room (smother fires, flag guests, read the
rail), 3D speech bubbles replace the ticker, spatial audio tells.
**Phase 3:** prep becomes a place — the office, desk objects, one
decision per object, night-gated disclosure. **Phase 4:** venue
re-dress, performance, playtest, deploy.

**Rule:** never delete a readable DOM surface without a physical
replacement in the room.
