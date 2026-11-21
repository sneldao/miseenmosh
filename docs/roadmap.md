# Roadmap — 30 days to Dec 18 close

Hard limits to design around: review runs OFFLINE (all assets baked),
desktop mouse+keyboard, <50MB to first playable (warning), first frame
<30s (hard), no sign-in/crypto/ads. 5 deploys/day, 5 reviews/UTC day.

## Week 0 — prove the pipeline (Nov 18–20)

- [x] `opengame init`, Vite + R3F scaffold, boots to frame (day 1)
- [ ] Spike the sponsor pipeline end-to-end on ONE character:
      MiniMax H3 portrait → Idol Max Turbo rigged GLB → renders in-scene
      (blocked on fal + ElevenLabs keys from user)
- [ ] One brigade voice (Voice Design) + one bark (Text to Dialogue) +
      one SFX + music sting, all baked, playing on a click
      (WebAudio synth SFX live as placeholder: print/bell/slam/rip/
      shatter/gasp/sting/chorus/review)
- [x] Kitchen mock: pass counter, ticket rail, 3 stations, dining window
      (dressed: tile walls, worn floor, gig poster, pans, bottles)

## Week 1 — the service loop is fun with no art

- [x] Ticket rail → stations → plates to the pass → SERVE/SEND BACK/SMASH
      (plating delay by skill, quality tiers, plate slide-in, verdict stamps)
- [x] Brigade agents: PETRA/DIMITRI/ANWAR — skill + morale, load-driven
      drain, walkouts with storm-off animation, chef covers dead stations
- [x] Physics chaos v1: smash debris burst; dropped plates done
      (fires/pans TBD)
- [x] Scream mechanic + YES-CHEF chorus (randomized call-backs,
      adrenaline window, rising morale cost)
- [x] Review card v1 — receipt-style card, quotable critic line, stat row,
      COPY REVIEW clipboard artifact, seeded replay

## Week 2 — the game gets its brain

- [x] Critic detection v1: inspector on a fast tell clock (phone + notes),
      civilian decoys, flag via raycast click, dessert deadline slams shut,
      signature-dish ordering (always the Wellington), critic verdict on card
- [x] Service pressure: 55s ticket TTL + table walks, streak system,
      dessert-course stampede, BEEFCAKES rival set-pieces (loiter warn,
      bespoke steal line, torn rail stub), regulars forgive once
- [x] Feel layer: full keyboard play (1-9/S/B/X/F/space/P), pause,
      ambient chef barks, guest heckles, verdict stamps, synth SFX
- [x] Plating decisions (20 Nov, the 9/10 patch): every plate has a sear
      window — FIRE (F) inside the gold for +8, or fire early to free the
      slot at −6. Waiting is playing.
- [x] Ego with a job (20 Nov): spendable clout in the back office
      (inspector's champagne, dessert on the house, name above the door
      +1★), ego-gated review lines, lifetime-ego LEGEND ending
- [x] The quiet virtue (20 Nov): zero screams over 8+ covers earns the
      SILENT SERVICE star + review line — restraint is a strategy now
- [x] All-eleven push (20 Nov): coursing (tables eat together +6), 86 the
      dish (E, slate-wipe with a price), table requests (FAST/EXTRA CHAR
      bets, D to refuse), streak ceremonies (×10/×15/×20), Beefcakes'
      runner (visible body, H to shoo), critic's exit (head high / coat on),
      ego tiers (COMMIS→LEGEND, door needs CHEF), call the board (3 wagers),
      the man with the van (£100/£130 loan), split-sauce whisk (M),
      edge-char from smouldering stations (+4, fire sooner), mid-service
      table comp (C, £20). Verification caught a real bug: requests were
      cleared on pull — cravings now survive to the pass.
- [x] Cohesion pass (20 Nov): expo language (FIRE/HANDS/CORNER with
      all-day counts), kitchen memory (smashed dish haunts family meal,
      press remembers silent nights, BEEFCAKES remembers outbids, van
      reminder on debt nights), hidden nuggets (Wellington trilogy,
      empty-pass scream, champagne-knew verdict, silent-legend tail,
      fish joke).
- [x] Brigade sim depth: trauma scars on walkouts (persist, drain
      faster), defections via feud (NEW_BLOOD replacements), morale
      carries overnight with partial rest, cook memory (favourite dish
      bonus, sendback/overscream grudges with personal barks, cleared
      by the family meal)
- [x] Progression skeleton: 3 venues star-gated (5★→LE MOSH,
      10★→MOSH & SON), per-venue price/spawn/critic-tell multipliers
- [x] Multi-night residency: 9-night arc, cash ledger (covers − wages
      − breakage), office briefing screen, feud cards with choices,
      localStorage save/resume, three endings
- [x] Morning fish-market bidding (3 seeded lots, contested outbid vs Beefcakes, per-station quality buffs)
- [x] Run mutators (20 Nov): one HOUSE RULE per residency, chosen N1 — DOUBLE SHIFT (doubled runners) / NO BIN (86 off) / SHORT FUSE (20% faster walks)
- [x] Provenance texture (20 Nov): one true clause per market lot in three voices (fishmonger/butcher/farm), craft line in the family meal, sensory payoff in the verdict, press headline on 4–5★ cards — gossip, never lessons
- [x] Verbosity cut (20 Nov): service hints stateful-only (runner/request/flag), bad serves one line, feed lines numbered not narrated, new ticker lines pop, low-morale cooks tremble — motion carries urgency, words carry verdicts
- [ ] Menu setting / station assignment layer on top of bought stock
- [ ] Dedicated coaching actions (drinks/press exist; named training TBD)

## Week 3 — dress it like a band biopic

> **Pivot (19 Nov): the form upgrade.** The art direction is locked; the
> camera is not. Full plan: [first-person-upgrade.md](first-person-upgrade.md).

- [x] Phase 1 — first-person pass: pointer-lock camera, constrained look,
      shimmy, hands + plate, RMB inspect, center reticle, charge scream,
      `V` fallback (dates to Week 3)
- [x] Phase 2 — the room answers: look-to-aim fires/guests/rail,
      dining room, rail cap, physical ticket rail, 3D speech bubble,
      spatial audio beds (per-station sizzle, murmur, rail drone) +
      panned one-shots, station heat glow with smoke warning, readable
      dining tables (press / regulars / couple / walk-in), critic
      escalation tells
- [x] Ambient life (21 Nov): guests sip + weight-shift on their own
      clocks, sconces dip with candle-grade flicker, service bell dings
      on every serve, cooks idle between plates, bad ticker lines
      tremble once, title card drifts — small + slow, so the urgent
      channel (fire, dying tickets, phone flash) keeps the frame
- [ ] Phase 3 — prep as a place: office scene, desk objects, one decision
      each, night-gated disclosure; Night 1 cold open into service (shipped 20 Nov: mid-rush seed + single-beat briefing, market N2+, shop N3+)
      *(family-meal ritual already in: praise / crispy bit / silence,
      clears grudges)*
- [ ] Phase 4 — venue re-dress (stall → bistro → flagship), lighting tiers
- [ ] Full cast + props via the pipeline (Idol Max / meshy-t2.5)
- [ ] Complete audio pass: 8–12 voices, music score *(synth SFX +
      ambience beds done; first voice slice shipped 20 Nov — local-synth
      YES-CHEF chorus + review read-out, VOICE toggle (U); ElevenLabs bake to go)*
- [ ] Feud system + rival chefs (incl. Beefcakes), newspaper clippings
- [ ] VHS-grain flashbacks, title sequence, review card art
- [ ] Hidden critic-mode unlock

## Week 4 — polish, check, ship

- [ ] opengame check --build cycles; resize across the 5 viewports *(CSS pass shipped 20 Nov: 1100/760/480 breakpoints + voice button; verify on preview)*
- [ ] Performance pass: 45fps @1080p on ordinary laptop, <50MB first frame
- [ ] Playtest sessions (10/day allowance); fix confirmed findings only
- [ ] Deploy early, iterate — latest live version at deadline is judged.
      Runbook: [deploy.md](deploy.md) (deploy from the root; `build.output` packages `dist/`)
- [x] Publish → Simulation & management + all three sponsor tracks
      (21 Nov — FIRST publish, release `b21576f9` / version 8 / SUB-1885
      live at https://opengame.io/g/9i7mjkmdx4. Jam answers go on
      `opengame publish`, evidence text on the deploy page)
- [ ] Cross-submit to Chroma Awards (by Jan 7) — interactive narrative *(checklist: [chroma-submit.md](chroma-submit.md); same bytes as the OpenGame build)*

## Standing disciplines

- Commit often — clean dev history is the eligibility evidence.
- Track decisions in this file; keep design.md the single source of truth.
