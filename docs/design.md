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

1. **PREP (morning)** — bid at the fish market (fast order-book minigame,
   snapflip mechanic), set tonight's menu (3 courses from what you bought),
   brief the brigade (assign stations; tired cook on grill = risk).
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
