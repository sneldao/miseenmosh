# Docs — where anything lives

**Start here:** [design.md](design.md) is the single source of truth (fantasy,
loop, systems, gates). [roadmap.md](roadmap.md) is the build checklist.
Everything else supports one of those two.

## Live

| Doc                                                    | Role                                                                                                       |
| ------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| [design.md](design.md)                                 | Game specification: baseline behaviour, flagship direction and art/performance contract.                   |
| [roadmap.md](roadmap.md)                               | 30-day build plan with checkboxes. Decisions tracked here.                                                 |
| [player-attachment-plan.md](player-attachment-plan.md) | Current execution tracker: flagship M0–M3, six workstreams, acceptance and evidence.                       |
| [Flagship local proof](devlog/flagship-local-proof.md) | Verified connected route, renderer/resource observations and remaining acceptance gates.                   |
| [Kitchen production plan](kitchen-production-plan.md)  | Next whole-room asset, animation and sound milestone; preserves the owner-approved faces.                  |
| [heygen-video-contest.md](heygen-video-contest.md)     | HeyGen Video Contest candidate-film brief: Best Edit concept, footage budget, provenance and no-post gate. |
| [first-person-upgrade.md](first-person-upgrade.md)     | Form plan, Phases 1–4. Phases 1–2 shipped; 3–4 pending.                                                    |
| [deploy.md](deploy.md)                                 | Deploy runbook: repo root, `dist/`, five slots a day.                                                      |
| [meshy-pipeline.md](meshy-pipeline.md)                 | Prop pipeline prompt → GLB → pass (Z-Axis evidence).                                                       |

## Reference (read before building in that area)

`research/` — one question per file, each ending in what we stole:

- [first-impression.md](research/first-impression.md) — the first 60 seconds.
- [surprise-senses-9-10.md](research/surprise-senses-9-10.md) — suspense, senses, missions 9/10.
- [character-personality.md](research/character-personality.md) — systems into people.
- [verbosity-progressive-disclosure.md](research/verbosity-progressive-disclosure.md) — reading load; adopted rules are design.md §9.
- [codrops-kitchen-experience.md](research/codrops-kitchen-experience.md) — Ego-browser study of both Codrops collections; source-backed direction for a brighter, expressive kitchen.
- [virality.md](research/virality.md) — share patterns, judge-eye view.
- [compulsion-patterns.md](research/compulsion-patterns.md) — the six retention patterns behind Fruit Ninja / runners / roguelikes, and our scored audit.
- [platform-winners.md](research/platform-winners.md) — what the platform's hits do differently; 7 ranked moves.
- [platform-sdk.md](research/platform-sdk.md) — SDK facts + what we wired (boards, achievements, events, frame rules).
- [sponsors.md](research/sponsors.md) — ElevenLabs / fal / Meshy constraints.
- [z-axis.md](research/z-axis.md) — awards candidacy.
- [zeitgeist.md](research/zeitgeist.md) — why chef, why now (Nov 18 snapshot).

## History (read for context, never for spec)

- [archive/build-history.md](archive/build-history.md) — nightly build notes, Nov 18.
- [archive/missions-9-10-plan.md](archive/missions-9-10-plan.md) — SHIPPED 20 Nov.
- [archive/scope-flywheel-plan.md](archive/scope-flywheel-plan.md) — SHIPPED 20 Nov.
- `devlog/` — build-in-public posts with media.

## Rule

A thing lives in exactly one live doc. Plans graduate to `archive/` the
day they ship; dated notes never accumulate in design.md — pointers do.
