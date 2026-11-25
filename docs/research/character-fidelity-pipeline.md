# Character fidelity & motion — research notes (2026-11-24)

Playtester feedback: characters need better fidelity, better movement, and more
believable "what they are actually doing." This note maps what the codebase has
today against the current best-in-class generation pipelines, with Rodin
(Hyper3D) as the suggested anchor.

## What the game actually has today (audited from the repo)

Two character populations, two different quality tiers:

1. **Brigade cooks (high tier, already generated + rigged).**
   `assets/meshy/` holds a full Meshy pilot pipeline: `raw-*.glb` →
   `rigged-*.glb` → `runtime-*.glb` per character (petra, dimitri, anwar,
   commis, porter), plus Blender scripts (`retarget-motion.mjs`,
   `prepare-brigade.mjs`, `probe-sockets.mjs`, `verify-retarget.mjs`) and
   `rig-review.blend` files. The runtime GLBs carry named clips
   (`PetraReady`, `PetraWork`, `Walking`, `Running`, per-cook `Prep` clips),
   named sockets (`PortraitSocket`, `RightToolSocket`) and head bones the code
   drives directly (`PetraCook.tsx`, `BrigadeCook.tsx`). `idleLoops.ts` cuts
   seam-blended neutral idle windows out of the work clips and tempo-scales
   them by mood. This is a real, working generated-character pipeline — the
   fidelity ceiling here is set by the source GLBs, not the code.

2. **Dining room (low tier, procedural primitives).**
   Guests, the second-row figures and the waiter in `DiningRoom.tsx` are built
   from `capsuleGeometry` torsos, `sphereGeometry` heads/hair and thin capsule
   arms — no rigs, no clips, motion is code-driven transforms (the ~3px guest
   breathing, the waiter's ping-pong walk). This is where the "fidelity"
   complaint lives. Props (`public/models/*.glb` — cloche, lamb, seabass,
   platestack, panstack, shaker) are already generated GLBs consumed via
   `MeshyProp`.

`CharacterGLB.tsx` is a generic drop-in that plays the first clip of any rigged
GLB — currently unused by the scene files, i.e. the loading path for new rigged
characters already exists.

## Rodin / Hyper3D — what it offers now (verified on the live dashboard + docs)

- **Rodin Gen-2.5** text/image-to-3D, 5 effort tiers (Extreme-Low ~4s →
  Extreme-High ~80s), agentic "vibe modeling" mode, multiview image-to-3D,
  3D inpainting edits, T/A-pose output option, quad mesh modes, PBR materials,
  GLB/FBX/OBJ/USDZ/STL export. From 0.5 credit/generation.
- **HYPER3D Rigging (new, the important one):** auto-rigging for humans,
  animals and fantasy creatures "down to individual fingers," prompt-editable
  rigs ("add tail bones"), **250+ motion presets + animation controls** —
  rig, refine and animate in one place. Listed in the Business API tier.
- **API:** `POST https://api.hyper3d.com/api/v2/rodin` (Bearer key, async job +
  poll, GLB download). Business plan: 120–240 req/min, 5 concurrent tasks.
  There is also an official **Hyper3D MCP server** for agent-driven generation.
- **Account state (dashboard, 2026-11-24):** API keys: 0; the embedded browser
  session is *not* logged in ("Log in to create a key") — the ego-browser login
  is a separate session, so an API key needs to be created from the logged-in
  browser or pasted over. Black Friday 50% off runs to **Dec 8**; Creator is
  $24/mo (30 credits), Business $96/mo (208 credits).

## How Rodin compares (2026 comparisons, multiple independent sources)

Consistent picture across the April–May 2026 hands-on comparisons
(strayspark.studio four-tool test; hackernoon Meshy-6/Tripo/Rodin-Gen-2.5 API
stress test; meshy.ai and dev.to roundups):

- **Rodin Gen-2/2.5:** highest *geometric* fidelity; best for hard-surface and
  detail-dense assets. Textures weaker than Meshy's; dense meshes may want a
  retopo pass. Slower generations.
- **Meshy 5/6:** most consistent generalist, best PBR texturing, official MCP
  server, auto-rig + 600+ preset motions. This repo's existing pilots came from
  Meshy, so style continuity is already proven.
- **Tripo P1:** best stylized/hand-painted look, fastest, best at holding a
  style across a *set* of assets.
- CSM (topology specialist) was acquired by Alphabet and shut down Sept 2026 —
  its retopo niche falls back to the generators' own remesh modes or Blender.
- All sources agree: hero characters that define the game's identity still
  deserve human polish; generative output is for the long tail and for
  iteration speed.

**Read for this project:** the art direction is stylized (flat ink/paper/
vermilion palette, `artDirection.ts`). Rodin's strength is geometric fidelity,
not stylized charm — for the *guests* (small, distant, stylized) Rodin is
viable but Tripo/Meshy may match the art direction better. Where Rodin is
genuinely the best-in-class pick for us is the **rig + motion-preset** step and
detail-dense props.

## Recommended pipeline (yield-ordered)

**Phase 1 — Dining room cast via Rodin rigging (the complaint, directly).**
Generate the six guests + waiter as stylized T-pose characters (multiview
image-to-3D from concept frames for consistency), run HYPER3D Rigging, pull
walk/idle/sit/serve motion presets, export GLB, drop into the existing
`CharacterGLB.tsx` path. Budget: ~7 characters × ~1–2 credits ≈ well inside one
Creator month even with re-rolls (regens are credit-free per the dashboard).
This converts the capsule crowd into rigged, animated bodies and removes the
"motionless back row" class of feedback permanently.

**Phase 2 — Upgrade the brigade.** The cooks' pipeline already works; regenerating
them at Gen-2.5 High effort with the same rig/clip/socket naming contract
(`PetraWork`, `PortraitSocket`, `RightToolSocket`, head bones) keeps
`idleLoops.ts` and the tool-socket code untouched while raising mesh fidelity.
Riskier (the runtime GLBs are load-bearing); do after Phase 1 proves the
export→runtime path.

**Phase 3 — Motion depth.** 250+ rigging motion presets cover serving, carrying,
wiping, conversational idles; retarget via the existing Blender scripts
(`retarget-motion.mjs`) into per-character variants, extending the
`idleLoops` variant system that already blends and tempo-scales clips.

**Practical next step:** create an API key from the logged-in (ego) browser
session at hyper3d.ai/workspace/api-dashboard (this Perch browser session isn't
authenticated), and decide Creator vs Business before Dec 8 — Business is the
tier that includes Rigging + Agentic on the API.

## Sources

- Live dashboard: hyper3d.ai/workspace/api-dashboard (plan tiers, credits,
  Rigging announcement, API-key state) — retrieved 2026-11-24.
- Hyper3D API docs: hyper3d.ai/features/api (endpoints, tiers, formats, MCP).
- Rodin Gen-2 overview: hyper3d.ai/blog/rodin-gen-2.
- Strayspark Studio, "Generative 3D Tools Compared: Meshy, Rodin, Tripo, CSM"
  (April 2026 test, Sept 2026 update).
- HackerNoon Meshy 6 / Tripo v3.1 / Rodin Gen-2.5 API stress test (Apr–May 2026).
- Repo audit: assets/meshy/*, src/scene/{DiningRoom,PetraCook,BrigadeCook,
  CharacterGLB,idleLoops,MeshyProp,modelUrl}.{ts,tsx}.

## Update — 2026-11-24 (post Tavily deep-dive)

The Rigging API went live 2026-11-09 and the full spec is confirmed:

- `POST https://api.hyper3d.com/api/v2/rigging` accepts **any** mesh
  (GLB/OBJ/FBX/STL/USD ≤100 MB) — not just Rodin-generated assets — so the
  existing Meshy-pilot brigade GLBs can be re-rigged through the same pipeline.
- 333 stock motion clips in 10 families (human_sp = 90: walking, sitting,
  idles, carrying, dancing…), up to 10 baked per run as separate actions.
- Custom skeletons from plain-English description (≤2048 chars); human
  template = 52 bones; skinning: shell (general) vs core (humanoid).
- Custom motion path: NVIDIA Kimodo text-to-motion → BVH → retarget in Blender
  → armature FBX → `animation_files` (≤10, 25 MB each, resampled to 24 fps,
  watch the +90° X orientation bug).
- Measured caveats from third-party testing: outputs ≈500k faces (decimate for
  real-time), GLB outputs carry an 80-face Icosphere artifact (prune it),
  embedded input textures are discarded (retextured from the reference image —
  reuse the generation still), mismatched clip families break poses.
- Pricing: 0.5 credits per rig job, refunded on failure; credits reserved at
  submit. HTTP 201 is returned even on logical failure — check the `error`
  field, not the status code.

Best-in-class context (2026): motion matching is the SOTA for locomotion in
engines (UE5.4+ Chooser/Motion Matching nodes); for a three.js/R3F browser
game the practical equivalent is the existing `idleLoops` seam-blended variant
system, now feedable with Rodin-baked clips. Text-to-motion (Kimodo, Cinevva)
covers bespoke gestures. GLB-with-baked-clips is the confirmed right format
for three.js/R3F.

New tooling in repo: `scripts/rodin/rig-character.mjs` (submit→poll→download),
`scripts/rodin/cast-prompts.md` (7-character dining-room prompt sheet),
`scripts/rodin/README.md` (pipeline + gotchas). Tavily key stored in
`.env.local` (gitignored).

Blocker unchanged: no Rodin API key exists yet — create one from the
logged-in ego-browser session at hyper3d.ai/workspace/api-dashboard.

## Update — 2026-11-24 (live end-to-end verification)

API key `miseenmosh-pipeline` created via the ego-browser session (stored in
gitignored `.env.local`). Live smoke test on the real API:

- **Creator tier DOES call Rigging.** The docs' Business-only assumption was
  wrong: `POST /api/v2/rigging` accepted a 26 MB GLB upload on Creator and
  returned a rigged, skinned GLB (JOINTS_0/1/2 + WEIGHTS_0/1/2 attributes,
  52-bone auto human skeleton path, ~500k faces as documented, 47 MB output).
- Tier access on Creator: Gen-2.5-Extreme-Low and Gen-2.5-Low submit fine;
  Gen-2.5-Minimum/Medium/High and Gen-2 return `API_NO_ACTIVE_SUBSCRIPTION`.
  So Creator = Gen-2.5 Low-and-below + rigging; higher tiers need Business.
- Full chain verified: submit → poll (status endpoint, jobs → Done) →
  download (signed URLs, GLB + preview.webp). Generation consumed 0.5
  credits; rig job consumed credits on success.
- ego-browser note: the Hyper3D dashboard throws a `black_friday` dialog that
  intercepts pointer events; dismiss via DOM evaluate before clicking.

Conclusion: the full generate → rig → decimate → three.js pipeline is live
today on the existing Creator plan. Business only adds higher Gen-2.5 tiers
and the 5x/10x batch modes.

## Update — 2026-11-25 (Phase 1 shipped)

The dining-room cast is fully through the pipeline: guests A–E, the
waiter and the second-row diner are rigged Rodin GLBs in the scene, each
with a distinct base clip and a tell-driven reaction clip (GuestGLB
crossfade). The waiter flips walk/idle on his waypoint state.

Corrections to the API notes above, learned live:

- The stock-clip multipart field is **`animation_preset`** (IDs like
  `human_000025`), NOT `animations` — the wrong name is silently ignored
  (HTTP 201, rigged GLB, zero clips). The README's `--clips` flag now
  maps to the right field.
- The download response carries `list`, not `result` (older docs said
  result); both are accepted in the scripts.
- `GET /api/v2/rigging_animations?category=human` returns 113 clips with
  `animation_id`/`display_name`/`content_description` — dumped to
  `scripts/rodin/animation-catalog-human.md`. Seated-relevant picks:
  000085 (sitting, hands on legs), 000056 (sitting, jiggling legs),
  000080 (sit shake foot), 000050 (sad idle), 000090 (standing idle),
  000089 (walking), 000088 (elegant walk), 000041 (pointing forward).
  No seated talking/toasting/eating clips — those need the Kimodo path.
- `scripts/rodin/batch-cast.mjs` runs the whole chain per character with
  a clip-guard that fails loudly on a clip-less output.
- Web budget: `optimize --texture-compress webp --texture-size 512
  --simplify-ratio 0.01` lands 44 MB rigged output at 1–3.2 MB.

Phase 2 (brigade re-rig through the same endpoint) is next; Phase 3
(bespoke gestures) is gated on the seated-clip gaps above.
