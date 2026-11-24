# Dining-room cast — Rodin generation prompt sheet

Seven characters to replace the procedural capsule figures in
`DiningRoom.tsx`. Art direction must match `artDirection.ts`: stylized,
muted ink-and-paper palette — INK #302c2b, PAPER #f3e6c8, VERMILION #d94e36,
PETROL #286e70, MUSTARD #dfaa3c, COPPER #bf7048. Warm candlelit fine-dining
room, slightly caricatured proportions, clean readable silhouettes (they are
seen at 8 m in a 520 px frame).

Generation settings: Rodin Gen-2.5, image-to-3D from the concept still,
T/A-pose output, relaxed A-pose (arms ~30° from sides — rigs best), PBR.
Reuse the same still as the rigging reference image so textures match.
Rig: bone_template=human, skinning_method=core.
Clips (≤10 per run, human_sp family): sitting, happy_idle, talking variants,
walking (waiter only), eating.

| # | Character | Concept prompt |
|---|-----------|----------------|
| 1 | Guest A — elderly gentleman | Seated elderly gentleman, 1920s formal dinner jacket, silver hair, thin frame, hands resting on table, muted charcoal-and-cream palette, stylized painterly texture, warm candlelight, relaxed A-pose full body |
| 2 | Guest B — matron | Seated older woman, high-collared deep teal (petrol) dress, brooch, pearl-grey hair in a bun, upright posture, stylized painterly, candlelit fine dining, relaxed A-pose |
| 3 | Guest C — young couple (her) | Young woman seated, mustard-yellow evening dress, dark bobbed hair, leaning slightly toward companion, stylized painterly, warm palette, relaxed A-pose |
| 4 | Guest D — young couple (him) | Young man seated, vermilion-accented waistcoat, rolled sleeves, animated gesturing hands, stylized painterly, candlelit, relaxed A-pose |
| 5 | Guest E — solitary diner | Middle-aged solitary diner, copper-brown suit, reading a folded paper, slouched, stylized painterly, muted tones, relaxed A-pose |
| 6 | Waiter | Standing waiter mid-stride, dark vest over crisp white shirt, white towel over left arm, one hand raised holding a small tray, black trousers, stylized painterly, candlelit dining room, relaxed A-pose |
| 7 | Second-row diner | Background diner in soft petrol-grey suit, simple silhouette, slightly simplified detail (seen at distance), stylized painterly, relaxed A-pose |

## Per-character clip picks

- Seated guests: `human_sp/sitting`, `human_sp/happy_idle`, 1–2 talking/idle
  variants from the human_sp list.
- Waiter: `human_sp/walking`, `human_sp/happy_idle`, a carrying/serve variant
  if present in the stock list.
- Second-row diner: sitting + one idle only (cheapest LOD).

## After download

1. `npx @gltf-transform/cli simplify in.glb out.glb --ratio 0.03` (outputs are
   ~500k faces; target ≤15k for the crowd tier).
2. `npx @gltf-transform/cli prune` — removes the stray Icosphere in GLB output.
3. Drop into `public/models/characters/`, render via `CharacterGLB.tsx`,
   swap the capsule guests one row at a time and keep the old rig behind a
   flag until the new cast passes QA frames.
