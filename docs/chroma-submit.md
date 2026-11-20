# Chroma cross-submit — second surface, same build

Date: 20 Nov 2026. The Chroma Awards' Experimental & open format accepts any
genre, so the shipped OpenGame build double-enters as **interactive
narrative** (deadline Jan 7). No fork, no second codebase: one static `dist/`,
two entry forms.

## Why this build qualifies

- **A story told through systems, not cutscenes.** Nine-night residency arc,
  feud cards, family meal, vows, folklore tests, critic epilogues in three
  persona voices × three star tiers. The review card is the last page.
- **Playable offline, first frame fast.** Same constraints as OpenGame
  (static files, no runtime AI calls, all art/voices baked into the bundle),
  so whatever runs in review runs for Chroma judges.
- **Voice as narrative device.** The YES, CHEF call-response, persona
  epilogues, review read-out — the ElevenLabs track is the story's delivery
  mechanism, not decoration.

## Entry checklist

- [ ] Build from repo root (`npm run build`, `dist/` unmodified from the
      OpenGame deploy — same bytes, same seed, same daily tickets).
- [ ] Category: Experimental / open format → frame as interactive narrative.
- [ ] Logline: "Be the tyrant. Earn the stars. Nine nights, one pass, one
      inspector hiding in the dining room."
- [ ] Declare models/tools: ElevenLabs (voice design, dialogue, review
      read-out), fal (MiniMax H3, Idol Max/Turbo), Meshy (t2.5/7.1/n1),
      code model (Devin/SWE) — same list as `research/sponsors.md`.
- [ ] Screenshot: ticket-storm pass (3-second legibility test) + review card.
- [ ] Note the share artifact: deterministic daily seed, COPY REVIEW clipboard.

## Rule

Chroma never drives the build. If a Chroma requirement conflicts with the
OpenGame judging build (offline, static, desktop keyboard), OpenGame wins —
note the conflict here and move on.
