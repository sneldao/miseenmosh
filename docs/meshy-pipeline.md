# Meshy prop pipeline — prompt → GLB → pass

How Mise en Mosh turns a one-line joke into a working in-scene prop.
Written up for the Z-Axis Awards ("best use of Meshy") and future batches.

## The route

1. **Prompt** — `meshy_text_to_3d`, `model_type: "smart-topology"`,
   `ai_model: "meshy-t2.5"`, `target_polycount` 2.5–3.5k,
   `target_formats: ["glb"]` only (fastest, lightest). ~5 credits, 2–3 min.
   Smart topology gives clean part-separated triangle meshes that sit well
   next to the hand-built primitive geometry — we do our own materials, so
   we skip the texture pass entirely.
2. **Download** — `meshy_download_model` → `public/models/<name>.glb`.
   Typical size 60–90 KB. Checked into git, served statically, works offline.
3. **Load** — `useGLTF` from drei; `Cloche.tsx`/`MeshyProp.tsx` is the
   reference component:
   - clone the scene, `Box3`-normalize to a target height, feet at y=0
   - re-material: untextured previews get a hand-tinted
     `MeshStandardMaterial` (tarnished silver, copper, ceramic…) so every
     prop matches the kitchen's grade
   - animate via `useFrame` against game state — the cloche hops and spins
     when a plate lands for judging; props are *alive*, not set dressing
4. **Boot** — props mount only after the title commits (`phase !==
   "title"`, preloaded on the BEGIN click via `preloadKitchenModels()`),
   each behind `PropBoundary` + `Suspense`. URLs go through
   `modelUrl()` (base-relative) so the hosted sub-path resolves. One
   failed GLB skips its prop instead of black-screening the kitchen;
   `?debug=props` lists skips.

## Why previews only

Untextured smart-topology previews are 5 credits vs 20+ for textured hero
runs, load faster, and — critically — re-materialling them ourselves keeps
the whole kitchen on one grade. Generated textures would fight the
linocut/Gilliam 2D art direction.

## Batch 1 (19 Nov)

| Prop | Poly | Cost | Home |
|---|---|---|---|
| cloche | ~3k | 5 | the pass — hops on new plates (in game since Nov) |
| sea bass | 3k | 5 | market-day display / pass garnish |
| pan stack | 3.5k | 5 | shelf beside stations — falling-pans set piece |
| plate stack | 3k | 5 | the pass — wobble during scream pulse |
| protein shaker | 2.5k | 5 | BEEFCAKES' spot at the pass window |
| leg of lamb | 3k | 5 | hangs near grill — the lamb sauce joke, embodied |

Total: ~30 credits. All tasks run in parallel via the Meshy MCP.

## Judge-bait (what the pipeline actually demonstrates)

- AI-generated meshes coexisting with primitive/scene geometry under one
  material grade — the AI prop is indistinguishable in finish from authored
  set dressing.
- State-driven animation on generated geometry — props react to the
  simulation (plates landing, screams, overloads).
- Static, offline-capable, ~0.4 MB of GLB for the whole set.
