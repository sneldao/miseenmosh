# OpenGame SDK — integration research + what we wired

Date: 20 Nov 2026. Sources: `@opengamehq/sdk` 0.5.1 (installed;
README + AGENTS.md + index.d.ts read, not guessed), the `opengame-sdk`
skill (v1.0.14), docs.opengame.io packaging/multiplayer guides.

## API facts that shaped the work

- `og.init()` first, never blocked on; `og.ready()` once, on the first
  frame the player can act in (ours: the title card). Time-to-playable is
  measured from `ready()`.
- Everything returns `{ ok, value }` / `{ ok, error, reason }` — never
  throws. The game keeps playing on every failure. Achievements answer
  `unavailable_in_preview` and `unavailable` under `opengame dev`.
- Player arrives during loading via `onChange`; guests have `id: null`
  on OpenGame (the local mock's `dev-guest` id lies — check `typeof id`).
  Handle fills name fields; null means use the game's default.
- Leaderboards + achievements must be declared in `opengame.json`
  (undeclared = `board_unavailable` / `invalid_achievement`). Boards used
  for reads need `keep` semantics chosen up front; metadata keys are a
  closed set (`label`, `mode`, `level`, `character`, `duration_ms`,
  `accuracy`, `combo`). Score `level` must be a string.
- Events: lowercase/underscores ≤48 chars, allowlisted props
  (`level`, `mode`, `difficulty`, `score`, `duration_ms`, `result`,
  `step`, `board`, `fps`, `heap_mb`, `sample_rate`), ≤600/min, batched
  every 10s. Never track plays/playtime — the page does that.
- Frame rules that bit other games: no own fullscreen control (the page
  owns it); Tab/arrows/wheel consumed must `preventDefault` or the page
  scrolls; release held keys on blur; `onPause` stops sim/audio/timers
  (loading continues); host mute silences audio; keep a pause menu that
  doesn't depend on Escape.

## What we wired (and what we deliberately didn't)

- `src/game/og.ts`: init-once wrapper, `readyOg`, handle subscribe,
  `submitBoard` / `unlockAch` / `trackEvent` — all fire-and-forget with
  failures to `console.debug`. No game path reads a platform value.
- Host pause → pauses live service only (never unpauses; resume is the
  player's key). Host mute → master bus gain. No fullscreen control
  exists to remove; Tab is unused; held keys already release on blur.
- Boards (keep:best default): `service_stars` (0–5, per-night level tag),
  `streaks` (best streak), `run_stars` (residency totals). Submitted at
  review and at the ending — never waited on.
- Achievements: `silent_service` (silent 5★), `wellington_trilogy`
  (three pristine in a row, via a `trilogyTonight` flag),
  `house_legend` (won residency, 200+ lifetime ego).
- Events: `night_completed` {level, score} per review, `run_completed`
  {score, result} at the ending. Nothing per-tick, nowhere near the rate
  limit.
- Title card: `og.ready()` on mount; `BE THE TYRANT. EARN THE STARS.`
  tagline plus `CHEF {HANDLE} IS ON THE PASS` when signed in.
- Deliberately not wired: avatar/OG rendering (no character rig to wear
  it — baked cast instead), invite links (no lobbies, wrong fantasy),
  radio picker (our sound is a synth bus, not a jukebox), `requestSignIn`
  prompts (rule 03: no sign-in pressure; the handle appears if present,
  never asked for).

## Verify before calling it integrated

- `opengame dev` + `?og-dev-player=signed-in`: title shows CHEF DEV.
- Private preview: boards submit (own local entries visible), unlocks
  answer `unavailable_in_preview`, nothing breaks or waits.
- Published + signed in: review submits stars/streak, ending submits
  totals, silent/trilogy/legend unlock.
- Host pause during service pauses; resume doesn't replay a backlog.
