# Roadmap — 30 days to Dec 18 close

Hard limits to design around: review runs OFFLINE (all assets baked),
desktop mouse+keyboard, <50MB to first playable (warning), first frame
<30s (hard), no sign-in/crypto/ads. 5 deploys/day, 5 reviews/UTC day.

## Week 0 — prove the pipeline (Nov 18–20)

- [ ] `opengame init`, Vite + Three.js (or R3F) scaffold, boots to frame
- [ ] Spike the sponsor pipeline end-to-end on ONE character:
      MiniMax H3 portrait → Idol Max Turbo rigged GLB → renders in-scene
- [ ] One brigade voice (Voice Design) + one bark (Text to Dialogue) +
      one SFX + music sting, all baked, playing on a click
- [ ] Kitchen mock: pass counter, ticket rail, 3 stations, dining window

## Week 1 — the service loop is fun with no art

- [ ] Ticket rail → stations → plates to the pass → SERVE/SEND BACK/SMASH
- [ ] Brigade agents: cook at stations, get tired, tilt, mess up
- [ ] Physics chaos v1: dropped plates, fires, pans
- [ ] Scream mechanic + YES-CHEF chorus (audio in, morale effect wired)
- [ ] Review card v1 (seeded service, shareable output)

## Week 2 — the game gets its brain

- [ ] Critic detection: dining-room guests, tell taxonomy
      (visual/behavioral/audio), flag mechanic, blindsided outcome
- [ ] Brigade sim: skill/speed/morale/trauma, coaching between services,
      walkouts, flame-outs
- [ ] Morning fish-market bidding + menu setting
- [ ] Progression skeleton: stall → bistro → flagship, star gating

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
