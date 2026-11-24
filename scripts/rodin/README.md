# Rodin character pipeline — miseenmosh

Best-in-class chain, verified against the live API spec (Nov 2026):

```
concept still (A-pose, ~30° lowered arms)
  → Rodin Gen-2.5 image-to-3D        (mesh, PBR, T/A-pose option)
  → POST /api/v2/rigging             (human template, core skinning)
      animations: up to 10 stock clips from 333 (human_sp family = 90)
      OR animationFiles: own FBX clips (e.g. NVIDIA Kimodo text-to-motion BVH
         retargeted in Blender, exported as armature FBX)
  → GLB download
  → decimate to real-time budget + strip the Icosphere artifact
      (npx @gltf-transform/cli simplify --ratio 0.05 in.glb out.glb)
  → src/scene via CharacterGLB.tsx (already wired, plays first clip)
```

## Setup

1. Create an API key at hyper3d.ai/workspace/api-dashboard (must be done from
   the logged-in ego-browser session; this workspace's browser is not
   authenticated). Business tier includes Rigging on the API.
2. `export RODIN_API_KEY=...` (or put it in `.env.local`, already gitignored).

## Usage

```bash
# Rig an existing mesh (e.g. a fresh Rodin Gen-2.5 download):
node scripts/rodin/rig-character.mjs \
  --model assets/rodin/guest-01.glb \
  --image assets/rodin/guest-01.png \
  --out assets/rodin/guest-01-rigged.glb \
  --clips human_sp/sitting human_sp/happy_idle human_sp/walking

# Decimate for real-time (~500k faces in → target ≤15k):
npx @gltf-transform/cli simplify in.glb out.glb --ratio 0.03
npx @gltf-transform/cli prune out.glb out2.glb   # also drops the Icosphere
```

## Verified API facts (sources in docs/research/character-fidelity-pipeline.md)

- `POST https://api.hyper3d.com/api/v2/rigging` — Bearer key, multipart form.
  Inputs: `model` (GLB/OBJ/FBX/STL/USD ≤100 MB; embedded materials discarded)
  or a Rodin `asset_id`; `image` (≤10 MB, required unless material=none —
  reuse the mesh's source still so textures match).
- `bone_template`: auto | human | quadruped | bird | dragon | kaiju | custom
  (+ `skeleton_description`, ≤2048 chars, custom only). Human = 52 bones.
- `skinning_method`: shell (general) | core (humanoids, cleaner joints).
- `animations`: ≤10 stock clips, baked as separate actions in one file.
  Families: human_sp (90), Human (76), Canine (35), Rodentia (35),
  HeavyHooved (26), Fish (22), LeanHooved (18), Lizard (13), seaturtle (11),
  Bird (7). Match family to skeleton — mismatched clips break poses.
- `animation_files`: ≤10 own FBX clips (25 MB each, one clip per file),
  resampled to 24 fps; known +90° X rotation issue — pre-rotate −90°.
- `material`: PBR | Shaded | Hybrid | All | None. `geometry_file_format`:
  glb | fbx | usdz. Base rig job: 0.5 credits, refunded on failure.
- Response is async: keep `uuid` + `jobs.subscription_key`, poll
  `POST /api/v2/status`, download via `POST /api/v2/download`.
- Gotchas: HTTP 201 even on logical failure — check the `error` field;
  GLB outputs contain an extra 80-face "Icosphere" at origin (delete/prune);
  outputs ≈500k faces — decimate before shipping to the browser.
- Rigging tips: relaxed A-pose sources rig best; rig once with no clips to get
  the target skeleton, retarget custom motion onto it, then re-run with
  animation_files.
