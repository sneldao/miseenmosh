# MISE EN MOSH — Design Doc (living spec, updated 24 Nov 2026)

## Fantasy

You are THE CHEF — not cook #3. The pass is your stage. Approve plates or
smash them, scream the brigade into gear or coach them into shape, watch
the dining room for the one guest who decides your stars. Three nights a
week you run service; between services you run your mouth, your menu and
your feuds.

North-star feeling: **authority under pressure.** Ramsay's "Wembley Stadium"
roar when the third star lands — and the pan-throwing cost of getting there.

## Flagship direction — culinary authorship and a living restaurant

**Status: a bounded flagship route is implemented and verified locally; the
larger ambition and visual/human acceptance remain open.** The local build now
connects independent stations, visible food conditions, a timed sauce correction,
and a credited Wellington revision across service → morning → next service.
This does not yet establish culinary authenticity, emotional attachment or the
full nine-night arc. The owner has twice said the proposed uplift is not
ambitious enough. A coherent, colourful kitchen is the visual foundation.
The larger promise is:

> Build a restaurant with a recognisable culinary voice, conduct its brigade
> through extraordinary services, and live with what your food and leadership
> mean to the people around you.

The game should be recognisable in a silent screenshot, pleasurable during an
ordinary interaction, and memorable as a story the player can tell afterwards.
Its identity comes from culinary authorship, expressive service and persistent
relationships working together.

The [playable art direction](#playable-art-direction--expanded-target-21-nov)
defines the image, animation, sound and performance contract. The
[attachment plan](player-attachment-plan.md) owns implementation status and
milestones. The existing loop below remains the baseline; this section
describes the intended transformation. Only the bounded implementation identified
in the tracker should be read as present.

### Critique response — active acceptance contract (24 Nov)

The critical review found five failures in the current rules: stars can reward
side games more than cooking; the nine nights repeat pressure rather than
escalating it; several rescue verbs are too cheap; food quality and hospitality
are mixed into one number; and the opening teaches a sequence before judgment,
then reveals the whole control surface. These are design defects, not a request
for more content. The following contract supersedes contradictory baseline rules.

**1. Stars measure the restaurant, not the meta-game.**

- Services begin at zero stars. Culinary quality contributes 0–3 stars;
  hospitality contributes 0–1; holding the brigade and completing the service
  contributes 0–1. Misses and walkouts can remove at most two stars. The review
  shows each axis and the arithmetic so a player can explain the result.
- Critic detection, silence, smashing, folklore and bets never award a star
  directly. They may affect ego, an accolade, dialogue or the critic's memory.
  A destructive action only improves the score indirectly by preventing a worse
  plate or loss from reaching the dining room.
- Reaching ten stars does not guarantee the final victory. Venue upgrades and
  the ending also consider culinary standard, hospitality, brigade continuity
  and the player's restaurant history.

**2. Food and hospitality have separate evidence.**

- `qualitySum` is culinary only and derives from the same `DishCondition` the
  player can inspect. Coursing, requests, refusals, comps and critic attention
  never alter plate quality.
- `hospitalitySum` records the social outcome: timely courses, requests answered
  or refused, room care and a fed critic. The review reports average food and
  hospitality separately; critic copy names each independently.
- Physical condition, pass judgment, HUD feedback and review cannot disagree.

**3. Every service verb has a price and an honest consequence.**

- Send-back preserves the order's age and the cook's workload. A remake can
  repair a real fault, but cannot refund the table's patience or guarantee that
  the correction survives the next cook's work.
- RUN TABLE serves only the held plate unless the player deliberately commits
  the ready peers shown by the action. No hidden batch action.
- Eighty-six resolves only the affected orders and records the displaced covers
  as misses (or an equivalent explicit service loss). It cannot erase work.
- Bread costs £3, is unavailable without that cash, and buys patience rather
  than quality. Expedite deliberately advances pressure and cannot bypass the
  rail cap or spawn a ticket while the printer is already firing.

**4. Nine nights means nine different decisions.**

Each night declares one central dilemma, one changed service condition, one
brigade opportunity and one grounded next-morning payoff. Nights 1–3 establish
standards and trust; 4–6 introduce outside pressure; 7–9 make accumulated
relationships determine available help and the cost of success. The final
service uses the actual menu, recipe contributors, honors, grudges, trauma,
defections and regulars. Two play styles must change who helps, what can be
served and what the ending remembers—not just the total stars.

**5. The opening teaches observation before command.**

The approved direct entry remains. Petra presents the first plate and the player
serves it; the second plate must be turned and its observed defect understood
before SERVE / SEND BACK / SMASH is enabled. The action produces an immediate
character response and a visible consequence. Waiting remains free during this
lesson. Ordinary controls are disclosed when their object or situation becomes
relevant; the permanent utility rail is reduced to the current decision.

**6. Scope is earned.**

No new verbs are added during this correction. A retained system must either
create a memorable core-service decision, deepen a named relationship, or pay
off in the ending. “Attaches to a key” is not sufficient. Anything that only
multiplies numbers, hides behind a modal, or repeats another system is demoted
to presentation or removed from the critical path.

**Acceptance:** targeted rules tests cover every bullet above; the production
build passes; the real entry route is exercised in a browser; and unfamiliar
player observation remains a separate human gate. Automated reachability is
not evidence of fun, readability or emotional attachment.



### The signature experience

Proposed example, to prove through play:

Petra brings her Wellington to the pass. You turn the plate and inspect the
cut. Its pastry and centre look right; Dimitri's sauce leaves a visibly broken
trail on the spoon. Two plates for the same table are ready, and one guest is
already watching the door.

You can send the meal now, hold it while you correct the sauce at the pass, or
ask Dimitri to remake it and change the table's firing order. Each choice
changes real food condition, timing, workload and a person's response.
Petra can protect the ready dish while you work if her state and station allow
it. The runner takes the actual plates together; the table's reaction follows
what arrived.

The pleasure is in noticing, deciding, handling and coordinating. A spoon
through sauce has resistance and leaves an informative trail; a plate has
weight; a cook meets your eye; the room briefly releases its tension when the
table lands well. These are playable actions, not a cutscene that resolves
the problem for the player.

The next morning, you and a cook can revise one supported element of the dish.
The recipe records the change and its contributor. On the next service the
revision changes preparation, presentation or the way the dish must be timed.
The player has made something that belongs to this restaurant.

This situation must branch coherently if the player serves imperfect food,
requests a remake, humiliates a cook, or never asks for help. A helpful act
must be earned and possible in the current state; the director cannot invent
an available cook or guarantee success for dramatic effect.

### 1. Give the chef a craft to master

Build the repeated interaction around **handle → read → decide → finish →
send**. Not every plate needs all five steps: familiar, readable dishes can
be dispatched quickly, and the player chooses when deeper inspection is worth
the time.

- Inspect with physical actions appropriate to the dish: turn a plate, reveal
  a cut surface, move sauce with a spoon, or test a crust. Each action exposes
  useful evidence. Avoid making every order a sequence of compulsory gestures.
- Make a small set of expert interventions consequential: repair an emulsion,
  adjust a supported finish, redirect a plate, or hold a table's course.
  Skilled attention can rescue a service; it cannot instantly fix every
  mistake or replace the brigade's work.
- Use tactile animation, spatial sound and brief illustrated accents to make
  craft enjoyable. Teach the meaning of cues through use and feedback.
  Do not replace visible evidence with an unexplained colour-coded taste meter.
- Keep dish condition authoritative. Inspection, texture, sound, service
  outcome and review must agree. There is no hidden random verdict that
  contradicts the evidence after the player commits.
- Mouse, keyboard and both existing camera modes reach the same decisions.
  No microphone, gesture-recognition service or precision motor trick is
  required to be a competent chef.

### 2. Let players develop a culinary voice

The menu becomes a playable set of commitments. A selection changes the
stations and techniques the brigade must coordinate, not just a quality bonus.

Start with a bounded set of researched variations on existing dishes. A recipe
can develop through an ingredient choice, a technique or a finish that we
actually represent and simulate. Show the consequences in the food, workload
and timing. Do not promise arbitrary ingredient combinations that the renderer
and rules cannot distinguish.

Recipe development happens after the player has cooked and met the brigade;
the approved direct opening remains. A first morning may offer one meaningful
revision with a cook, enacted around the tasting bench or kitchen book.
Later, menu composition lets players choose a reliable service, an ambitious
signature dish or a demanding combination suited to their team.

Record a dish's lineage: its chosen culinary version and sources, house
adaptations, contributing cooks, previous revisions and significant services.
Credit is a relationship decision with visible consequences. A shared signature
can become a source of pride; appropriating a cook's contribution can leave
a different memory.

Research the traditions represented by the current menu in depth before adding
more cuisines. Supplier relationships, tools, preparation rituals and particular
people carry the context. Cultural claims need sources and appropriate human
review. A character's name does not supply a nationality or a family history.
Specific recipes and their variations deserve care even when the surrounding
kitchen is comic.

### 3. Make service an ensemble performance

All three stations need real independent work, ready space and collection
rules. The chef can fire, hold, redirect, request a correction and coordinate
a table using one consistent targeting model. The visible cook, docket,
held plate and command must always refer to the same order.

The cast performs intention: concentration, irritation, pride, anticipation,
exhaustion and relief. Cooks have recognisable ways of working and supporting
each other. Look, posture, timing and contact carry meaning at play distance.
Neighbour reactions are local and motivated; the room does not bounce together.

Build a service score from the actual work: calls and acknowledgments, knives,
whisks, sizzling pans, the bell and footsteps. Music can respond to the phase
and intensity without turning timing into a mandatory rhythm game. Quiet
moments make a successful rush and a fragile dish feel different.

The authored dramatic situations should emerge through these rules: a course
that must leave together, an ingredient shortage, a regular's meaningful
request, a cook asking for help, or a critic waiting while the house is strained.
They establish stakes and opportunities; they do not prescribe the player's
answer or fabricate a rescue.

### 4. Make the restaurant acquire a history

Persistent choices should change the place and its people across the nine
nights, alongside the existing stars and cash:

- Recipes gain annotations and contributors; the menu and preparation change.
- Suppliers and regulars remember specific interactions and return with
  opportunities grounded in those events.
- A cook's station, habits and willingness to help reflect shared experiences.
- Selected physical traces remain: a repaired object, a keepsake, a clipping,
  an annotated recipe or a changed place setting. These are authored objects
  connected to facts, not a general clutter simulation.
- Family meal lets people respond to what actually happened and influence
  tomorrow. It is a human scene with a useful choice, rather than another
  mandatory statistics screen.

Make the dining room part of the same restaurant: courses arrive, guests wait,
taste, talk and notice each other. An inspector's social behaviour belongs in
that activity. Guest reactions express context and preference; one universal
applause animation cannot stand in for understanding the food.

The final night brings the player's menu, accumulated relationships and
leadership style into one service. The ending shows who helped build the
restaurant, which dish became its signature and what the achievement cost.
Two approaches must produce visibly different memories and opportunities,
not merely different totals.

### 5. Make the ordinary moment spectacularly specific

The art pass applies to the complete experience: room, cast, food, hands,
dockets, dining activity and sound. Carved silhouettes, saturated ink,
illustrated surfaces and choreographed movement make one visual language.
Close-up food must look worth cooking and eating; wide views must make the
brigade's relationships and priorities readable.

Reserve flourishes for actual meaning: a confident pan turn, a knife revealing
a beautiful interior, a runner receiving a complete course, a cook catching a
plate. Brief drawn accents and selective emphasis can heighten those moments
without stealing the camera or covering evidence. Routine actions should
already feel good before we add a celebration.

An authentic shareable artifact can be the player's house recipe, contributors
and the service that made it famous, supported by the event history. Sharing
is optional and never substitutes for experiencing the scene.

### Scope, production and proof

The full ambition is a nine-night authored residency, delivered in measurable
milestones rather than an uncosted list of parallel systems. Existing offline,
desktop, startup and download constraints remain. This document does not
authorise paid production, change the stack or claim a delivery date.

Keep rule state, event facts and presentation responsibilities explicit.
Recipe revisions and relationship memories require versioned save migrations;
existing careers and newer-save protection remain intact. Simultaneous cooking
requires a ticket-lifecycle refactor, not an animation shortcut.

The first flagship checkpoint is **one complete service, the next morning and
the beginning of the following service**, showing:

1. The whole kitchen and all three cooks meeting the new visual identity.
2. Real station coordination and a learnable physical food judgment.
3. A player-chosen intervention and a character consequence.
4. One supported recipe revision with a contributor, remembered and visibly
   expressed when the revised dish is cooked next.
5. The same experience remaining legible and responsive at the documented
   performance target.

Then extend authored dish variations and dramatic situations across the
residency. Internal material/rig tests can be narrow, but a polished isolated
corner is not this checkpoint.

Acceptance requires human play and listening as well as rules and performance
evidence. Players should be able to describe their culinary decision, recognise
a cook's response, identify a change they made to the restaurant, and want
another service. A test suite, an attractive still or a model-generated score
cannot establish that these experiences are fun.

## Core loop — one night

1. **PREP (morning)** — the MORNING MARKET offers 3 seeded lots per night (each with one true clause from its voice: fishmonger, butcher, farm — gossip, never lessons)
   (day-boat scallops, dry-aged beef, "yesterday's fish"...). One lot is
   contested: BEEFCAKES wants it too — outbid him (+£20, +1 heat) or let him
   have it. Bought lots buff a station's plate quality tonight; walk-ins are
   per-night (not saved, so reload can't double-buy). Then the back-office
   shop (drinks / pans / press) and the night's feud card.
2. **SERVICE (the action layer)** — tickets fly in on a rail; brigade works
   stations (physics chaos: pans, flames, dropped plates); finished plates
   hit the pass and YOU judge: SERVE / SEND BACK / SMASH. While a dish
   plates, the last 30% of the cook is the sear: FIRE it inside the window
   (F) for +8 quality, or fire early to free the slot at −6 — waiting is
   playing. Escalating disasters: fires, equipment failure, walk-in
   shortages, staff tilting. Zero screams across a real service (8+ covers)
   earns a SILENT SERVICE accolade and a quieter critic response; it does not
   award a star directly.
   Tables course: plates for one table landing within 20s of each other
   ride the heat (+6 each). Mid-rush you can 86 a dish (E) — dockets binned,
   tables wait, the cook takes it personally. Tables send requests (FAST /
   EXTRA CHAR): nail them (+10) or get noticed (−8), refuse them (D) and
   the press writes it down. Split sauces can be whisked back (M). A
   smouldering station kisses plates with smoke (+4, fire comes sooner).
   Champagne can be comped mid-service (C, £20): the room exhales, the
   regulars remember. The pass speaks kitchen: FIRE calls with all-day
   counts, HANDS and CORNER on the walk, clean-plate clubs. The kitchen
   remembers: smashed dishes haunt the next family meal, the press
   remembers a silent night, BEEFCAKES remembers the market, the van
   watches from across the street when you owe him. Hidden: the
   Wellington trilogy, screaming at an empty pass, champagne that
   arrives before the inspector asks. Missions 9/10: named critics
   (GILLIAM hates noise, MADAME V drops forks, THE KID films everything),
   provenance lots (Lorna's scallops, layby shrooms, yesterday's risk-fish),
   Table 101 (table 14 wobbles, walks faster, morning seating choice, T to
   move mid-rush), one vow a night (STAR/HOUSE/BRIGADE, judged first on
   the card), folklore tests (fork R / glass W / coat H / return D-F /
   flash-ignore). Coaching (N2+): one session a night — PRAISE (+10 morale,
   clears grudge), DRILL (+3 skill, −8 morale, may grudge),   REST (−1 trauma). Menu deck (N3+): feature one dish (+6 tonight),
   rest one (off the rail tonight), one set a night. Venue dressing: the room
   moves up with stars (STALL 86 → LE MOSH → MOSH & SON) — wash warms to gold,
   101's cloth goes starched white and the wobble finally gets fixed. Hidden:
   poke the BEEFCAKES wanted poster 3× on the title card to wire CRITIC CAM —
   live telemetry (photos, last flash, fed/gone) but never the table number.
   101 migrates up with the room (14 wobbly corner → 12 window → 10 center
   stage); T-move and wedge/cloth follow the table. Cam counterplay: on the    Kid's night a wired cam gets NOTICED — flashes come ~2× faster (easier to
    spot) but every photo tags the pass (−2 ego). GILLIAM goes still (tells
    1.6× slower, but clocking him pays +5 — tradecraft respected); MADAME V
    nods once (+4 ego, warmth for curiosity). 101 are MARA & JUNE (twenty
    years); house-vow-held makes them permanent (regulars forgive twice
    nightly). Twice-praised cooks earn a once-a-night keepsake (PETRA catches,
    DIMITRI pre-whisks, ANWAR stays). N5 is BEEFCAKES night: price-war feud —
    détente (−£70, runners stand down for good) or rivalry (+heat, doubled
    runners tonight). Reviews report the night as it happened: one headline,
    one defining incident, one consequence for tomorrow, built from recorded
    service events — walkouts, rescues, smashes, folklore outcomes — not pools
    of invented prose.
   Phasing: N1 plate→judge only, N2 sauce + coaching, N3-5 GILLIAM,
   N4 clout, N5 requests+86, N6-8 MADAME V + folklore (R to fix),
   N7 101 harsh + seating (T to move), N8 board+vows, N9 THE KID.
   One interrupt at a time — sauce, request, folklore and runner never
   overlap.
3. **CRITIC DETECTION (the deduction layer)** — one guest tonight is a
   mystery inspector. Watch the dining room between tickets: each critic
   has their own tell, matching their intro — GILLIAM writes in a notebook
   (never a camera), MADAME V inspects the place setting, THE KID films on
   a phone — plus behaviour (orders the signature, arrives alone) and the
   feed's written clue. Flag before dessert or get blindsided.
4. **REVIEW (the share artifact)** — the next morning's card: stars, one
   headline, the night's defining incident and its consequence; supporting
   facts (critic verdict, folklore outcome, stats) live in details. The
   same facts carry into the copied and spoken review and the next
   morning's LAST NIGHT line. Deterministically shareable (daily-seed
   service).
5. **FEUD (between nights)** — rival chefs act: poach your sous chef, tip
   off a critic, steal your reservation book, talk trash in the food press.
   You answer with choices that cost ego, money or favors. Ego itself is
   spendable clout in the back office (comp the inspector's champagne,
   dessert on the house, an accolade for your name above the door) — it doesn't
   keep, so spend it or sober up. Lifetime ego gates the LEGEND ending.
6. **ROLE (stay the chef)** — every verb is a pass verb; a commis mode would need a different keyboard. The rise is the room, not the rank (stall → flagship), and the underdog position is economic (debt, van, stall). N1 briefing: "You're the chef because you're the only one who came back." The receiving end is critic mode (hidden NG+): same systems, reversed lens — not a new game.
7. **SCOPE GATES (system vs hint)** — a retained system must create a memorable
   core-service decision, deepen a named relationship, or pay off in the ending.
   It must resolve within a night or across the arc and give the player agency.
   Everything else is a hint: bark, feed, feud card, folklore, review tail.
   Fatigue/joy/communication are already simulated — name their thresholds.
   Cleanliness, inspections, sickness, vermin, covers, TV: events and textures,
   never meters. No system punishes curiosity. Adding another keybinding is not
   a scope justification; no new verbs are part of the current correction.
8. **FLYWHEEL (adaptable × adaptive × retained)** — adaptable: loadout (menu, vows, seating, bets, one HOUSE RULE per residency: DOUBLE SHIFT / NO BIN / SHORT FUSE, chosen N1) plus cross-night combos the feed acknowledges. Adaptive: the game remembers (grudges, press, BEEFCAKES, truce) and says so every morning (morningPaper line). Retained across runs: legends on the title card, daily shared seed, covers collected per ending, critic mode as NG+ (shipped P0–P4; P5 sketched in [archive/scope-flywheel-plan.md](archive/scope-flywheel-plan.md)).
   Ego wears tiers (COMMIS → LEGEND); the room says the new name out loud.
   Call the board: one wager a night (covers / no walks / clock the
   inspector). A man with a van floats you £100 — he wants £130 back
   before the residency ends. Streaks detonate at ×10/×15/×20. BEEFCAKES
   sends a runner you can shoo (H) — it costs you a second. A spotted,
   well-fed inspector leaves head high; an unspotted one slips away.

## Progression

Street stall → bistro → flagship → empire. Stars come from food, hospitality and
a brigade that finishes the work; venues rise at five and ten earned stars.
Passing ten stars opens the final venue but no longer guarantees victory: the
ending also reads the player's culinary record and what the restaurant cost its
people. Each venue adds ticket pressure, new service conditions and critics with
subtler tells. The [night-arc contract](player-attachment-plan.md#critique-response-night-arc-contract-24-nov)
defines the distinct escalation through all nine services.

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
- **Text-to-Dialogue**: service barks, feud cutscenes, the review read-out (first slice shipped: local-synth YES-CHEF chorus + review read-out, VOICE toggle U — ElevenLabs bake replaces it).
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
  the night). Legends (best streak, silent fives, covers) persist on the
  title card across runs; covers are collected per ending tier (§8).
- **Funny failure is the marketing** — fires, walkouts, the critic
  catching a burnt plate, a brigade member hurling their apron at the
  pass.
- **Hidden mode** — at 3 stars, flip roles: play as the inspector
  infiltrating someone else's service (the receiving end; NG+ per §6).
- **Beefcakes** — gym-bro rival chef: protein-only menu, shirtless
  birthday posts mid-feud. (Named for the Ramsay-at-60 thirst-trap cycle.)
- Screenshot test: a screaming chef silhouette at the pass in a ticket
  storm — legible in 3 seconds, no caption.

## Scope fence (30 days, one dev + agents)

- ONE core room per venue; camera mostly fixed (ticket rail + pass +
  dining-room window). No open world, no multiplayer, no runtime AI calls.
- Scripted+baked dialogue trees, not runtime LLM (offline review).
- Systems create a core-service decision, relationship memory or ending payoff;
  everything else ships as a hint (see §7). No simulated meters without verbs.
- 8–12 voices, ~20–30 generated characters/props max, curated hand-fixes.
- Complete game = 3 venues, ~15 services, feuds, ending (3rd star or
  flame-out epilogue). Short and polished > long and thin.

## Tracks

- Genre: **Simulation & management**
- Sponsors: ElevenLabs (flagship), fal, Meshy — all three, earned via
  real usage.
- Cross-submit: Chroma Awards Experimental / open format as interactive narrative ([chroma-submit.md](chroma-submit.md)) — same bytes, second surface.

## Build history

Nov 18–19 nightly build notes live in [archive/build-history.md](archive/build-history.md).
Shipped plans live in [archive/](archive/) (9/10 missions, scope-vs-hint flywheel).

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

## Art direction — locked (19 Nov)

**Gilliam collage people / linocut food / '70s cookery paper.**
Recraft styles: gilliam-collage da25e4f6, linocut-food 4d3d77fd,
cookery-70s f7f7d7fa (riso-punk f7ae045b banked as alternate).
Band-biopic retired — it produced the cinematic brooding we escaped.
Cast cards + title lineup in assets/recraft/cast-gilliam, dishes in
food-lino, market chalkboard in paper-cookery.

### Playable art direction — expanded target, 21 Nov

**Status: playable foundation implemented; art direction and motion acceptance
remain open.** The brighter room, collage portraits on articulated cooks and
condition-driven food volumes are running locally. They are not a claim that
the finished artwork's quality has been met. The owner wants a more immersive,
performant, colourful kitchen that expresses fun, passion and the cultural
specificity of its food. A brighter corner is insufficient. The next visible
milestone includes a coherent, inhabited **whole kitchen and first service**.
This is the presentation foundation for the broader
[flagship direction](#flagship-direction--culinary-authorship-and-a-living-restaurant);
visual coherence alone does not complete that milestone.

**Creative direction: a living kitchen print.** Carry the collage cast, carved
linework, saturated ink and cookery-paper identity into the playable world.
Use deliberately shaped, stylised 3D for people, hands, tools and food, with
illustrated surfaces and layered background dressing. Foreground subjects
must have volume and survive both existing camera modes; a portrait on a
camera-facing rectangle cannot replace a performing cook.

The active title/cast and food artwork are the visual anchors. The retired
photographic `style-refs/` images may inform kitchen layout, but must not
restore their brooding exposure or realistic material treatment. This
brighter treatment deliberately departs from the title illustration's large
black background while retaining its ink, shapes and colour relationships.

**Image rules**

- Replace the generic primitive cast and hero objects with authored
  silhouettes: expressive heads, readable hands, distinctive clothing,
  curved cookware, shaped handles and food with actual structure.
- Use warm cream, tomato/vermilion, mustard and petrol/turquoise as a coherent
  palette. Reserve dark ink for drawing, separation and selected recesses.
  Faces, food and working surfaces stay readable in shadow.
- Keep print marks attached to their surfaces and broad enough to read from
  the pass. Avoid crawling grain, a global scribble filter and identical
  roughness on cloth, copper, ceramic and sauce.
- Compose a foreground pass, middle-ground brigade and visible dining room.
  People and food occupy the useful frame; the room has depth, crossings and
  contact, rather than a large empty dark surround.
- Maintain one lighting/material contract across the whole room. Bake static
  richness where possible and reserve dynamic light for meaningful events.

**Food has an identity and a standard**

Every menu item needs its own silhouette, ingredients, plating language,
preparation action, sound and visible condition. Nine dish names cannot share
three pictures. Existing `DishSprite.tsx` maps scallop and foie to the fish
image, and risotto, lamb, purée, soufflé and tart to one quenelle image; those
are placeholders to retire.

For each dish, author a small reference sheet: the specific recipe/version
served by this fictional kitchen, culinary sources, ingredients and technique,
visual target, recognisable defects, service timing, and the cook's connection
to it. Regional variations must be named accurately rather than presented as
one universal standard. Research and culinary review remain outstanding;
character names alone do not establish cultural backgrounds.

Initial performance briefs, proposed rather than historical claims:

- **Petra's Wellington:** careful handling and a decisive cut reveal pastry,
  mushroom layer and centre. Its craftsmanship and her pride are legible.
- **Dimitri's pommes purée:** the spoon leaves a deliberate ribbon; he tastes
  and adjusts before presenting. Care is visible in a seemingly simple dish.
- **Anwar's soufflé:** oven anticipation, visible rise and a careful transfer.
  Its fragility creates urgency; his relief after a successful service matters.
- **Scallops:** distinguish the chosen house sear and interior from a wet,
  pale or overcooked result. Lorna's existing supplier story can appear through
  a crate label and a brief relevant exchange.
- **Risotto:** choose and research the house version, then communicate its
  texture through the pan and plated movement. It must have a different
  working rhythm and inspection cue from pastry or grilled food.

Provenance, equipment, technique and particular people carry cultural detail.
Do not substitute national motifs, caricatured accents or mandatory food-history
paragraphs. Supplier and family-meal stories should affect things the player
sees and chooses. Comedy belongs in kitchen personalities and pressure;
culinary care gives the outcome emotional weight.

Visible food evidence must come from the same condition state that judgment
uses. Cosmetic steam is not permission to imply an independently random
temperature or score. Keep assistance until each dish's evidence is readable.

**The room performs a service**

The brigade has preparation, work, presentation, recovery and reaction poses.
Each needs a different stance, timing, gaze and expression, based on the
existing character art and personality. Preserve planted feet, utensil grips
and contact with the work surface. Body bobbing is not a cooking animation.

A quiet kitchen prepares: a towel folds, a knife is honed, someone tastes.
The rush produces purposeful overlapping actions, calls and acknowledgments.
A coordinated table leaves together; a runner collects real resolved plates;
the guest receives them. A rescue has a visible cause, action and response.
After a hard service there is a recognisable release of tension.

Tie these performances to actual tickets and service events. Idle prep must
not pretend to complete orders. Real simultaneous cooking still requires the
station-lifecycle work in attachment-plan stage 4; animation cannot replace it.

Let emotion include pride, generosity, concentration and shared delight as
well as anger. A good dish earns a glance or a tiny smile before the next
ticket. A justified correction and a humiliating smash receive different
responses. Build on Petra's catch, Dimitri's sauce rescue and Anwar staying.

Physical actions remain quick and satisfying: tickets catch on the rail,
plates slide and settle, spoons lift sauce, pans land with weight, breakage
has contact and bounded debris. Keep targets stable and the inspection area
clear. Input stays responsive during presentation.

**Sound and rhythm**

Use spatial and contrasting sounds: distinct chopping, pan sizzle, whisking,
ceramic contact, oven doors, calls and dining-room responses. Let work sounds
and a restrained musical arrangement build with the service, with quieter
spaces for anticipation, judgment and relief. Do not turn every object into
a constant noise source. Human listening is required before approving the mix.

**Performance is part of the style**

Keep React/Three/Zustand and the current renderer for the first production
proof. Use baked room detail, shared material/texture atlases, instancing for
repeats, authored animation, pooled steam/debris and a bounded light rig.
Start with one shadow-casting key. Measure a new pass before retaining it;
full-screen blur, volumetrics and runtime fracture are not baseline features.

Proposed acceptance target, **not an achieved measurement**: on a recorded
baseline laptop/browser at 1280×720, aim for 60 Hz presentation with frame
interval p95 ≤20 ms and p99 ≤33.3 ms on both the opening and a representative
busy service. Record device, quality settings, sample duration, stalls and
memory; measure a bare run separately from screenshots/video. Retain the
existing first-playable download/startup budgets.

Lower tiers reduce background effects, shadow resolution and decoration
before food evidence, expressions, input feedback or inspector tells. They
must retain the same identity and information. Preload/prepare the assets and
shader variants needed by an action before the player can trigger it.

**Next playable milestone**

A full-room visual target leads into the flagship service → morning → next
service checkpoint above. It includes all three recognisable cooks, distinct
representations for every dish it can serve, three signature-dish performances,
physical verdicts and a visible emotional payoff. Internal asset/material
tests may be small, but the owner-facing checkpoint is the whole experience.
Judge it with stills from both cameras, motion through quiet/rush/recovery,
a listening pass and measured frame times. The clean, direct opening remains
the entry.

## Form upgrade — first person (19 Nov)

The fixed diorama camera + DOM HUD reads as a bygone-era management
game. The art stays; the interface grammar changes. Full plan:
[first-person-upgrade.md](first-person-upgrade.md).

**Thesis:** you are the chef — first person, hands on the pass, a kitchen
that flinches when you scream. Same systems, new form. The *Chef-em-up*:
first-person service drama with a brigade you manage by voice. No
first-person cooking game has shipped the tyrant-chef fantasy; the
originality is in the form.

**Phase 1 (built, deployed 19 Nov — release `de6d1a82`):** pointer-lock
camera anchored at the pass, constrained look, shimmy along the line,
hands + plate in hand, RMB to inspect, center-screen reticle with world
raycasts, charge-and-release scream, `V` fallback to the cinematic
camera.

**Phase 2 (built, release `15a15a8b`):** the room answers. The dining
room reads as a room (seated diners in eveningwear, tables and candles,
timber architrave round the pass opening, far wall with prints and
sconces), the reticle reports what it is on (counter / guest / fire,
with SMOTHER and FLAG THEM tags), and the rail caps at six dockets so a
bad run cannot push tickets off-screen. The ticket rail is now physical:
dockets hang on a steel bar over the pass as 3D cards that age, grime and
swing, and PLATE IT on the reticle takes one — the DOM rail is now only
the `V` fallback camera's rail. The ticker's newest line is now a 3D
speech-bubble card over the pass (speaker in ink, leaning toward their
station, one line maximum, gone in under five seconds) — the DOM ticker
is likewise `V`-only now. The room has ears: per-station sizzle beds,
a dining murmur that sours when tables walk, a rail drone, and panned
one-shots (printer right, fires and flashes where they happen). The
steel shows the science — stations glow as they drown, with one smoke
warning before the grease goes up. Tables read back: the press
flashes, the couple fights and makes up, the regulars forgive once,
and the critic's tell escalates in their own idiom — GILLIAM's notebook, MADAME V's inspection, THE KID's phone.
Cooks remember: favourite dishes get the good hands, sendbacks and
held screams earn grudges (and personal barks) until the family meal
clears the table.
**Phase 3:** prep becomes a place — the office, desk objects, one
decision per object, night-gated disclosure. **Phase 4:** venue
re-dress, performance, playtest, deploy.

Shipping runs through [deploy.md](deploy.md): the manifest declares
`build.output: dist`, so deploys go from the repo root and spend one of
five daily slots.

**Rule:** never delete a readable DOM surface without a physical
replacement in the room.

## Reading load — verbosity budget (20 Nov)

How much the game says, when it says it. Full research + audit:
[research/verbosity-progressive-disclosure.md](research/verbosity-progressive-disclosure.md).
Adopted rules:

- **Phasing is the tutorial.** Max two verbs in any service; never a new
  verb on a persona's debut night (peak is N5: requests + 86).
- **One interrupt at a time.** Sauce, request, folklore and runner never
  overlap; dread always precedes a stranger mechanic by a full night.
- **Establish, then test.** First sauce gets a 7s whisk window, first
  runner warns 10s out; the standard timings apply after.
- **The finale stays loud, never spammy.** In the last 40s only the
  critic, the press and first-kindness get feed lines.
- **The card has a reading order.** Review: stars → quote → voices →
  numbers, biggest to smallest. Share text unchanged.
- **Verbs look like verbs.** Feed lines style FIRE/WHISK/SHOO/86 as
  keywords and `(KEY)` hints as keycaps — reaction without re-reading.
- **The manual is on demand — and it is a modal.** `?` opens the key card
  anywhere; it pauses service, owns all input (Escape/?/button close, Tab
  stays inside) and restores the pause state it found.
- **Motion carries urgency, words carry verdicts.** In service, state
  changes animate first (new lines pop, dying tickets pulse, low-morale
  cooks tremble, sear zones glow); the hint line only speaks for
  stateful events (runner, request, unflagged inspector). Numbers
  replace narration in the feed (+6, +10, −8).
  N8+ auto-seats 101 (overridable) instead of adding an eighth decision.

## Opening flow (21 Nov, taught-by-doing pass)

- **Title is one decision.** Hero art + a single CTA (TAKE THE PASS, or
  CONTINUE on a save). Everything else — controls, voice, PREP FIRST,
  NEW RESIDENCY, cast bios, records — lives in a Menu disclosure that
  never starts a run by keyboard.
- **Night 1 stages the briefing.** `enterResidency` (the only start route
  for mouse and keys) lands on a two-beat intro — the brigade + family meal,
  then the contract + house rule (doors gated on the rule, KITCHEN BOOK one
  click away). Only OPEN THE DOORS drops into service. The opening teaches
  handle → read → decide through one real plate: serve Petra's sound Wellington,
  call the next order, then turn and inspect the second plate before its verdict
  controls unlock. Plate observations and the house standard explain what the
  player is looking for; SERVE / SEND BACK / SMASH each produces an immediate
  consequence and Petra response before ordinary service begins.
- **Waiting is free while learning.** Until `openingStep` clears, no
  service time, ticket aging, morale drain, misses, spawns, hazards,
  tells or events — only the active cook progresses. Scream, flag,
  fire, comp and camera verbs are inert.
- **The mouse stays free.** Night 1 runs the cinematic/clickable camera
  (`firstPerson: false`); the V first-person view unlocks as usual once
  the opening is done. Pointer lock is never demanded.
- **Controls arrive with their decision.** The HUD foregrounds the current
  plate, station or guest. Scream, voice, bread, expedite and comp remain
  available from the on-demand Controls book, but their permanent service
  buttons appear only when relevant; no simultaneous utility rail competes with
  a first verdict.
- **Prep is a book, not a gate.** Returning nights show a compact
  brigade card (cash/stars/services, names + mood, optional family
  meal) with OPEN THE DOORS and KITCHEN BOOK — the latter holding the
  full market/coaching/feud/vow/house-rule/last-night prep, optional.

## Walking the line — stance (25 Nov)

- **The chef has a body.** `stance` (sinks ↔ sauce ↔ pass ↔ room) moves
  the chef and both cameras to a real location in the already-built
  restaurant. Night 1 the pass holds you (the opening stays a pure
  pass tutorial); from night 2, Q/W walk the line, 0 returns, HUD
  buttons and glossary match.
- **No new verbs — verbs gain a location.** The pass loop
  (call/collect/fire/judge/run/inspect) only runs at the pass and says
  so when tried elsewhere. Everything else is voice and carries:
  correction is twice as fast at the sauce station, arriving mid-split
  buys the pan +4s, overload accrues half as fast at the sinks, comp
  lands harder from your hands in the room.
- **Absence is the cost.** The sim never pauses for travel: tickets age,
  sauce windows expire, shoo windows close while you're gone. A fire
  drags the chef home from the room; sauce and sinks already face the
  flames. Veterans collapse nothing — travel is one keypress home.
- **The morning remembers the walk.** `lastWalk` stamps each night's
  stops; the lowest-priority payoff card echoes the furthest (room >
  sinks > sauce) only when no sharper fact claims the cook.
