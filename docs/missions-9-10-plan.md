# Missions 9/10 — implementation plan (expensive, high-impact)

Goal: from "cook well, get stars" (5/10 extent, 6/10 drama) to "tonight, *this* person must leave changed" (9/10).
Constraints: static build, desktop keyboard only, repo-root deploys, `V` fallback playable. Drama via data + feed + office choices + timed interrupts. No new 3D, no backend.

Overall: 6/6 workstreams done (expensive pass in, tsc + build clean).

## 1. Named critics with memory — done (3/3 personas)
- [ ] `criticPersona: 'gilliam' | 'madameV' | 'kid'` + `criticGrudge` persisted in `career`
- [ ] GILLIAM (press, ex-sous, hates noise): notebook-early tells, 2+ screams = review capped 2★
- [ ] MADAME V (Michelin): Wellington + soufflé, 92 min, champagne-before-asked + coursing weakness
- [ ] THE KID (2M followers): phone-always, trap-dish order, 25 min stay, hates 86'd dishes, loves edge-char
- [ ] Office dread line per persona ("MADAME V is in town. Booked as 'M. Vane'. She will drop a fork.")
- [ ] Persona-specific verdict lines on review card + grudge update
- Files: `src/game/state.ts` (guest spawn, review), `src/game/barks.ts`, `src/hud/HUD.tsx` (office)
- Verify: `npx tsc -b`, `npm run build`, one seeded service per persona, copy-review line names them

## 2. Ingredients with provenance — market to myth
- [ ] `MarketLot` += `origin`, `storyTag`, `risk` (e.g. "Day-boat scallops — diver Lorna, Tobermory, in at 4am")
- [ ] Meat + veg lots so stations map 1:1 (fish→fish, beef→grill, "layby shrooms, no receipt"→garnish)
- [ ] `risk` path: "yesterday's fish" 20% `offNote` — Kid films it, regulars forgive it
- [ ] Ticket inherits `storyTag`; judge applies persona-match bonus + name-check bark ("Lorna's scallops sang")
- Files: `src/game/state.ts` (market, spawnTicket, judge), `src/game/barks.ts`
- Verify: buy Lorna → serve pristine to Madame V → verdict name-checks Lorna

## 3. Table 101 + maitre-d' — customer management as drama
- [ ] Table 11 = 101: TTL 45s (not 55s), no mercy, coursing window 12s (not 20s), wobble tint in `DiningRoom.tsx`
- [ ] Morning bookings strip (office, under feud card): pick 2 of 3 parties, assign who gets 101 vs window (+10 patience)
- [ ] Parties: Regulars (forgive once, love 101, +ego if honoured) / Press (fast, pays in copy, hates 101) / Walk-ins (impatient, big spend)
- [ ] Mid-service 101 rescue: `M` move (runner 4s + ego 2) or `C` comp (£20, exists) when 101 unhappy > 10s
- [ ] Regulars-at-101 shield: feed them well → they forgive one walkout elsewhere that night
- Files: `src/game/state.ts` (guests, TTL, seating, office), `src/scene/DiningRoom.tsx`, `src/hud/HUD.tsx`
- Verify: seat press at 101 → walks faster + press writes it down; regulars at 101 → shield triggers

## 4. Mission board — one vow a night
- [ ] `activeVow: { id, terms, reward } + vowStatus`, picked on office screen, ribbon on rail all night
- [ ] STAR VOW: no walks + inspector clocked = +2★ tomorrow; fail = "ambition without control" press line
- [ ] HOUSE VOW: 101 turns twice, nobody walks from it → cash + regulars mercy 2 forever
- [ ] BRIGADE VOW: zero walkouts + family meal together → trauma −1 all; fail → trauma +1
- [ ] Review card judges vow first, before stars
- Files: `src/game/state.ts` (office, review), `src/hud/HUD.tsx` (office + ribbon)
- Verify: pick each vow, pass/fail each, card judges it

## 5. Folklore engine — rumours inspectors test you with
- [ ] Shared timed-prompt skeleton: feed buildup → 6s window → keypress → resolve bark + quality delta + verdict flag (1–2 events/night max, seeded)
- [ ] Fork drop (Madame V): `R` replace in 6s (+15 her ticket) vs ignore (−20 + "They waited. Nobody came.")
- [ ] Water glass (any VIP): `W` refill, cook off-station 1.5s
- [ ] Coat on floor (Gilliam): `H` hang (context-sensitive, reuses shoo key)
- [ ] Returned "too cold" plate (Beefcakes plant): `D` refuse with grace (+ego) or re-fire (−6 quality, +press)
- [ ] Flash (Kid): correct answer is nothing — touch it and he posts you
- Files: `src/game/state.ts` (tick, interrupts), `src/game/barks.ts`, `src/hud/HUD.tsx` (prompt)
- Verify: fork night — replace path verdict "The fork was back before it stopped ringing"; ignore path punished

## 6. Payoff — the 9/10 night + copy
- [ ] Review card order: vow judged → persona verdict (name-checks provenance + folklore) → stars → grudge carried
- [ ] Copy-review template includes vow + persona + provenance ("Lorna's scallops sang. 101 turned twice. — M.V.")
- [ ] Dread→payoff audit: every office warning has a matching card line; no orphan warnings
- [ ] Docs: `docs/design.md` fantasy + loop updated, `docs/roadmap.md` checked off per workstream
- Files: `src/hud/HUD.tsx` (review), `docs/design.md`, `docs/roadmap.md`
- Verify: full seeded 9/10 night (Madame V + Lorna + 101 + STAR VOW + fork) reads as one story on the card

## Build order
1. Personas + fork + 101 data (the trailer)
2. Morning seating (2 choices)
3. Provenance tags + 1 bonus path
4. Vow board (STAR first)
5. Folklore 2–5 + other personas
6. Verdict lines + copy template + docs
