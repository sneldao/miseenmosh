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
      dessert-course stampede, BEEFCAKES rival events (incl. ticket theft)
- [x] Feel layer: full keyboard play (1-9/S/B/X/space/P), pause,
      ambient chef barks, guest heckles, verdict stamps, synth SFX
- [x] Brigade sim depth: trauma scars on walkouts (persist, drain
      faster), defections via feud (NEW_BLOOD replacements), morale
      carries overnight with partial rest
- [x] Progression skeleton: 3 venues star-gated (5★→LE MOSH,
      10★→MOSH & SON), per-venue price/spawn/critic-tell multipliers
- [x] Multi-night residency: 9-night arc, cash ledger (covers − wages
      − breakage), office briefing screen, feud cards with choices,
      localStorage save/resume, three endings
- [ ] Morning fish-market bidding + menu setting (slots into briefing)
- [ ] Dedicated coaching actions (drinks/press exist; named training TBD)

## Week 3 — dress it like a band biopic

- [ ] Full cast + props via the pipeline (Idol Max / meshy-t2.5)
- [ ] Complete audio pass: 8–12 voices, SFX bus, music score
- [ ] Feud system + rival chefs (incl. Beefcakes), newspaper clippings
- [ ] VHS-grain flashbacks, title sequence, review card art
- [ ] Hidden critic-mode unlock

## Week 4 — polish, check, ship

- [ ] opengame check --build cycles; resize across the 5 viewports
- [ ] Performance pass: 45fps @1080p on ordinary laptop, <50MB first frame
- [ ] Playtest sessions (10/day allowance); fix confirmed findings only
- [ ] Deploy early, iterate — latest live version at deadline is judged
- [ ] Publish → Simulation & management + all three sponsor tracks
- [ ] Cross-submit to Chroma Awards (by Jan 7) — interactive narrative

## Standing disciplines

- Commit often — clean dev history is the eligibility evidence.
- Track decisions in this file; keep design.md the single source of truth.
