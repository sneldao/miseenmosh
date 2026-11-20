# Platform winners — what the games that do well on OpenGame do differently

Date: 20 Nov 2026. Sources: opengame.io/games gallery (live fetch), opengame.io/jam
(full rules/scoring/judges), docs.opengame.io (SDK, engines, packaging),
opengame.app featured page, plus PlateUp!/Overcooked success autopsies
(GamesIndustry.biz, Nintendo Life, TechRadar) and gd.games all-time charts.

## 1. The field, right now

The gallery (fetched today) lists 7 games. All 7 are **Shooter & survival**;
6 are seed content by `@fate`, 1 by `@ball-zee`:

| Game | Plays | Note |
|---|---|---|
| Mod Super Mario Zombies | 28.6K | recognizable IP + zombies |
| Karen Warfare | 13.5K | meme hook |
| Der Koloss | 10K | 1–4 players, private lobbies |
| Modern Claudefare | 9K | 1–4 players, private lobbies |
| Super Smash Royale | 7.9K | battle royale |
| Decomp World at War Zombies | 4.5K | 1–4 players, online |
| OG Snipes | ~500 | snipers-only, 17 maps, FFA/TDM to 50/100, XP/K/D/accuracy |

Real jam entries are only just arriving (jam opened 18 Nov), so this is a
seed-content leaderboard, not a market verdict. But it shows what the
platform's machinery rewards, and the machinery is the point: **plays don't
count toward judging.** Five criteria, equal weight: creativity/originality,
depth, fun, performance, visual fidelity. Judges include working creators
(SuperTrip64, Meticulai, GuavaGuy…) — people who can smell a one-shot
generation. Rule 09 says it outright: complete, cohesive, polished games,
"not one-shot generations."

Hard constraints that shape everything: static files only, first frame
without a server (reviewed **offline**), desktop mouse+keyboard, must
respond to window resize, no sign-in/accounts, 4GB/25K files.

## 2. What they do differently from us

**a. Identity persists across sessions.** OG Snipes: you play as your own OG
character, XP/kills/K-D/accuracy follow you. Our persistence is localStorage
legends + a daily seed — good instincts, but platform-blind. The SDK gives
leaderboards, achievements, events, and the player's OG for free, and every
seed-content game uses them. We use none of it.

**b. Social is the content.** 32-player lobbies, private 1–4P rooms, map
votes, FFA/TDM. Shooters are fungible; the lobby is the game. We are
single-player by design (tyrant fantasy needs one tyrant) — so our
"multiplayer" has to be asynchronous: same daily tickets for everyone,
shareable review card, legends. We have all three; none of them touch the
platform.

**c. Volume players can choose.** 17 maps + map voting; PlateUp!'s whole
design is *pick your own challenge* (menu harder vs customers worse) so a
loss feels like your build, not the game's difficulty wall. Our arc is 9
fixed nights — strong narrative, zero player-chosen variance. Daily seed
helps; run modifiers would close it further.

**d. Readable in 3 seconds.** Mario + zombies needs no tutorial; Karen
Warfare is a joke you already get. Our readability work (first 60s research,
screenshot test in design.md) is the same idea — but theirs is free because
the IP does it. Our equivalents: Ramsay/BEEFCAKES (real), the pass, the
verdict stamps. The title card has to do this job, not the briefing.

**e. The recognizable hook carries the click.** The top game is a mod of the
most recognizable IP on earth. Nothing to copy legally — but the lesson is
that *a known fantasy, instantly legible* beats a novel one. "Be the
Ramsay chef" is our version; say it on the title card, not just the README.

**f. Co-op as difficulty design.** PlateUp!'s roguelite exists to remove
blame: losing discards the challenges you stacked, so failure is a fresh
run, not a wall. Overcooked's assist mode, PlateUp!'s mixed-skill
friendliness — the best in the genre design *for* the weakest player. Our
equivalent is the gentling work (first sauce 7s, first runner 10s); theirs
goes further and we should steal the principle for N1–N2 pacing.

**g. Sponsor tracks are a second prize surface.** ElevenLabs pays for "voice
that changes how the game feels" — our voice layer is still synth
placeholders + baked-asset plans. fal/Meshy reward generated assets that
shape look and play; we have the cloche + art passes, which is ahead of
most. Voice is our thinnest track relative to its prize.

## 3. Scorecard: us vs the pattern

| Criterion | Them | Us | Verdict |
|---|---|---|---|
| Originality | mods of known loops | no cooking game has shipped the tyrant fantasy; first-person pass | **ahead** — say it louder |
| Depth | map votes, loadouts, roguelite choices | 9 nights, vows/menu/seating/bets, NG+ sketched | close; add player-chosen variance |
| Fun (first minute) | drop in shooting in seconds | title → briefing → service has a long runway | **behind** — cold-open N1 into service |
| Performance | 60fps bar, 4GB ceiling | 1.2MB JS, synth SFX, R3F scene | fine; re-verify on an ordinary laptop |
| Visual fidelity | lighting/FX-forward shooters | Gilliam collage locked, dining room reads | competitive in-genre; venue re-dress pending |

## 4. Highest-ROI moves (ranked)

1. **Wire the SDK (S).** Leaderboards (daily covers / best streak), 2–3
   achievements (SILENT SERVICE, WELLINGTON TRILOGY, LEGEND), events on
   review. Turns our async-social loop platform-visible. Zero design risk.
2. **Cold-open N1 (M).** Doors open mid-rush with the eleven-words line;
   briefing beats unlock N2+. Their first minute is shooting; ours should
   be fire.
3. **Say the fantasy on the title card (XS).** "Be the Ramsay chef" energy
   in one line + the ticket-storm screenshot test. Free discoverability.
4. **Run modifiers or daily mutators (M).** One player-chosen twist per run
   (BEEFCAKES price war always-on? double runners, no-86 night) — our
   version of map voting.
5. **Voice before deadline (L).** At least the YES, CHEF chorus + review
   read-out baked; the flagship track is the biggest prize we can still win.
6. **Chroma cross-submit (XS admin).** Experimental & open format accepts
   any genre — a second $3.5K surface for the same build.
7. **Resize pass (XS).** Rule 05 requires it; verify the HUD/canvas at 5
   viewports during the next check cycle.

What NOT to copy: lobbies/PvP (wrong fantasy), IP mods (ineligible assets),
content volume for its own sake (our depth is systems, not maps).
