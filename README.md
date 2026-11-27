# MISE EN MOSH

**Play it: https://opengame.io/g/9i7mjkmdx4** — live on OpenGame,
Game Jam #1 entry (Simulation & management + ElevenLabs / fal / Meshy
sponsor tracks). No sign-in, no install.

*Everything in its place. Until the tickets start flying.*

You're the enfant-terrible chef. Run the pass, break your brigade or build
it, spot the Michelin inspector hiding in tonight's service — make them all
say **YES, CHEF.**

A kitchen-tyrant service game for **OpenGame Game Jam #1** (Nov 18 – Dec 18,
2026). Browser-native, desktop, static build, no sign-in.

- Design: [docs/design.md](docs/design.md)
- Build plan: [docs/roadmap.md](docs/roadmap.md)
- Deploy: [docs/deploy.md](docs/deploy.md)
- Docs index: [docs/README.md](docs/README.md) (research, history, archive)

## Elevator test

One sentence pitch: *be the rockstar chef — the fantasy the BBC's "Rise of
the Rockstar Chef" (Nov 5, 2026) just re-legitimized, that no cooking game
has ever shipped.*

Tracks: **Simulation & management** (primary), sponsor tracks for
ElevenLabs, fal and Meshy — the generation stack *is* the production
pipeline (see docs/research/sponsors.md).

## Ground rules (from the jam)

- New game, made inside the jam window — reuses *ideas* only, no prior
  game systems.
- Everything generated is **baked into the bundle** (review runs offline).
- No crypto, payments, accounts, ads or tracking. Mouse + keyboard.

## Voice — the ElevenLabs bake

The brigade talks. Petra's hinge lines (the three opening verdicts, the
house-rule calls) and the chorus that answers every scream are baked at
asset time by [`scripts/elevenlabs-bake.mjs`](scripts/elevenlabs-bake.mjs)
through the **ElevenLabs API** (`eleven_turbo_v2_5`):

- **PETRA** — Alice: cut-glass, clear, commands the pass
- **DIMITRI** — Brian: deep, resonant, has seen things
- **ANWAR** — Will: lighter, younger, fragile-adjacent

```
ELEVENLABS_API_KEY=... node scripts/elevenlabs-bake.mjs
```

17 takes land in `public/voice/` (~276 KB total) and ship inside the
bundle — the game never calls the API at runtime, so it plays offline and
draws its first frame with no server, exactly as the jam requires. The
runtime wiring lives in `src/game/voice.ts`: the chorus answers your
scream first, Petra speaks her verdict the moment you judge the first
plate, and every baked take degrades gracefully to the platform synth if
a file is missing. The earlier fal/Kokoro bake
([`assets/voice/bake.mjs`](assets/voice/bake.mjs)) remains in the tree as
the fallback pipeline.
