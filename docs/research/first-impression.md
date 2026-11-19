# The first 60 seconds — research digest

Why the front door undersells the game, what the greats do instead,
and the concrete redesign. Sources: GDC-era UI writing (Dead Space's
diegetic interface GDC talk via Polygon), Vertigo's Cook Serve Forever
attention analysis (GameDeveloper), Papers Please academic readings
(Gemsbok, Press Start), Overcooked/PlateUp flow autopsies, and the
opengame-front-end skill's own owner-note ledger (dense menus are the
most-raised complaint in its history).

## Diagnosis — what a stranger actually experiences now

1. **Title**: a closed kitchen after service. Empty room, no tickets,
   no people, near-black palette. The game inside is a comedy —
   a gym-bro rival steals tickets, cooks walk out, pans fall off
   shelves — but the door is a wake. Zero of the 6 named characters
   (PETRA, DIMITRI, ANWAR, BEEFCAKES, the inspector, you) appear.
   Palette fights the fiction: Papers Please can be grey because it
   *is* a grey bureaucracy; we render a chaotic comedy in funeral
   amber-at-5%-brightness.

2. **Transition**: one press → a ledger with ~10 interactive regions:
   cash/stars/services-left, last-night take, 3 morale bars, 3 shop
   buttons, 3 market lots (each with a sub-decision on contested
   lots), a feud card with 2 options, a feed line, a save warning,
   and RUN SERVICE. The front-end skill's rule — *a few fixed
   screens, each with one prominent forward button* (Overcooked:
   title → character → loadout → deploy) — is violated in exactly
   the way its reference projects kept getting sent back for.

3. **Progressive disclosure absent**: night 1 shows the same wall as
   night 9. The player is asked to make economic decisions (spend
   £80 on pans?) before meeting anyone or serving a plate. VR/UX
   research is blunt on this: teach one action, let them succeed,
   add the next. Night 1 should ask *one* question: "ready?"

## What the greats do

- **Minecraft** — the splash text. A rotating gag under the logo
  ("Also try Terraria!"). Cheapest personality per byte ever shipped
  and the single most imitated title device. Our equivalent writes
  itself — it's the bark bank.
- **Overcooked** — character select *is* the personality beat: a whole
  menu step just to meet a chef. Bright saturated palette, absurd
  stakes in the intro ("only the best chefs can save the day").
- **Papers, Please** — recurring characters punctuate the
  administration. Jorgi, the smuggler, the rebel: the same desk,
  different *faces*. A spreadsheet becomes a story when a person
  steps to the window. Our feud card does this half-way (Beefcakes
  has a name and a bit) but nothing else in the office does.
- **Dead Space** — the menu is a thing in the fiction: the same
  design language Isaac sees. Ours could be paper: tickets, the
  market crate manifest, a napkin offer, the receipt. We already
  have this instinct (verdict stamps, receipt card) — the briefing
  escaped it.
- **Reigns / Death & Taxes** — one decision per card, delivered by
  a character with a line. Decisions are *conversations*, not
  spreadsheets.
- **Cook Serve Forever (Vertigo)** — the dev literally heat-mapped
  "what should the player look at" and found their UI was shouting
  everything at once. Attention budget: one critical read per beat.
  Our briefing has no budget — it's all "very important."
- **PlateUp** — prep is a place, not a panel. We can't walk the
  kitchen between nights, but the briefing can *be the kitchen at
  rest* — morning light through the pass, the world behind it
  alive (we already render it — it's just buried under the panel).

## Principles for the next pass

1. **The title is a trailer for the tone, not the venue.** Show the
   cast and the chaos — nameplates, a lurking nemesis, a flying
   ticket — not an empty room.
2. **One decision per screen, delivered by a character or an
   object.** The briefing becomes 2–3 beats, each with exactly one
   forward action.
3. **Night-gated disclosure.** N1: meet brigade, run service.
   N2: market unlocks. N3: shop. N4+: feud events. The residency
   teaches itself.
4. **Micro-copy does the character work.** Buttons bark, lots are
   gossip, statuses are moods ("PETRA looks dangerous") not
   percentages.
5. **Warm the grade.** The generated style is amber pass vs cold
   teal dining room — the UI should live on the amber side with the
   stamps and receipt. The brooding is a rendering choice, not an
   art direction.
6. **Everything diegetic.** If it isn't paper, metal, or a person
   talking, it doesn't belong on screen. Receipts, tickets, napkins,
   chalkboards.

## The redesign — concrete

### A. Title — "the room is alive"
- Keep cover art + lockup (the generated art is right — the *palette
  of the scene* is wrong).
- Add a rotating **splash gag** under the lockup (Minecraft homage):
  cycling barks — "WHERE'S THE LAMB SAUCE?" / "0 stars. Still open."
  / "The inspector is already in the dining room." / "Protein."
  — BEEFCAKES / "Technically fish." Each with an attribution.
- **Cast strip**: three brigade nameplate cards + one
  BEEFCAKES "WANTED FOR TICKET THEFT" card. Text-only for now;
  fal portraits drop in when the pipeline lands.
- Warm the grade: amber key up ~40%, teal rim on the dining room,
  subtle grain overlay to match the cover art's band-biopic finish.

### B. Briefing → three beats, one job each
- **Beat 1 — THE BRIGADE.** Three nameplate cards: face, name,
  station, mood line (morale → word: "sharp", "tired", "dangerous",
  "gone"), trauma scars. Night 1 gets one-line intros
  ("PETRA runs grill. Do not touch her tongs."). Forward: CONTINUE.
- **Beat 2 — THE MARKET.** The lots card as a fishmonger's crate
  manifest; a one-line fishmonger bark ("The lamb's spoken for —
  Beefcakes got here first."). Contested lot = his move, in his
  voice. Forward: TO SERVICE.
- **Beat 3 — TONIGHT'S PROBLEM** *(N2+ only)*: the feud card as an
  incident — Beefcakes' silhouette + his line + your two options.
  If no feud tonight: "All quiet. He'll notice you eventually."
- **Shop**: folds into beat 2 or collapses into the office header —
  drinks/pans/press become small "back-office" buttons, never the
  main course.
- Cash/stars/take compress to a single header strip on all beats.

### C. The palette
- Deep brown + warm amber + paper cream (the stamp/receipt palette)
  for UI surfaces; teal reserved for the dining room and Beefcakes
  (his cold protein-bar lighting — character signifier).

### D. Voice
- Every interactive element gets one line of character copy.
  Cost shown, then the joke: `TAKE THEM FOR DRINKS — £40 · PETRA's
  idea. Obviously.` `LET HIM HAVE IT` stays, but the feed narrates:
  "BEEFCAKES took the lamb. His protein bowls get shinier."
- Morale numbers become mood words; skill stays a number (it's
  information a chef would actually say out loud: "she's a 72").

## What this buys
- The first 60 seconds introduce 5 of the 6 characters before a
  single system asks anything of the player.
- Night 1 onboards in ~3 taps. The full economy reveals itself by
  night 3 — the residency teaches itself.
- Every beat has a person attached: brigade, fishmonger, nemesis.
  Same systems, same depth — delivered as gossip, not admin.
