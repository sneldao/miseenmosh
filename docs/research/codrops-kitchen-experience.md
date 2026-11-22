# From poster promise to a living kitchen

Research date: 2026-11-21. This is a proposed visual and interaction direction,
not a completed art pass.

**Subsequent owner feedback:** the single-station uplift was too modest, and
whole-kitchen presentation alone still fell short of the requested ambition.
The source findings remain useful. The current target is
[the flagship experience](../design.md#flagship-direction--culinary-authorship-and-a-living-restaurant):
culinary authorship, physical judgment, ensemble service and persistent
restaurant history, supported by the
[art/performance contract](../design.md#playable-art-direction--expanded-target-21-nov).
Track implementation through [M0–M3](../player-attachment-plan.md#flagship-milestones-and-priorities-21-nov).

## The owner's judgment

> “much cleaner opeining, i love that it dives right into the game”
>
> “the qualitu of the game experience is really low though and doesn't mimic
> the quality our art promises -- the kitchen feels dark and dingy and very
> static”

Preserve the direct opening. The next improvement must be visible in the
kitchen, rather than another menu, explanation or management system.

## What was reviewed

Both supplied collections were opened with **Ego browser**, in task space
`miseenmosh-codrops-research`:

- <https://tympanus.net/codrops/hub/all/>
- <https://tympanus.net/codrops/hub/all/page/2/>

Each page contained 44 entries at review time. All **88 listings and their
preview images** were surveyed. Their titles, demo links, code links, tags and
preview URLs are preserved in
[codrops-catalogue.json](codrops-catalogue.json).

This was a catalogue-wide relevance pass followed by selected live-demo and
source inspection, **not an exhaustive interactive audit of 88 applications**.
Eighteen repositories were fetched without installing dependencies or executing
their source locally. The technical findings below identify the files actually
read in fifteen of those repositories. Cloning alone is not counted as source
review. Exact fetched revisions are in
[codrops-source-revisions.txt](codrops-source-revisions.txt).

Eight live demos were opened. Seven were exercised with pointer or keyboard:
Yarn World, Jelly Zoo, Slice of Life Crisis, R3F Sketch Material, Relighting
Images, Paper Crumple and Cinema Seat Preview. Skate Dog was inspected through
loading/title and source, without a gameplay run.

The catalogue is not uniformly GitHub-linked: “Wide” points to CodePen, and
“Reel Flux” has a demo/article but no code link in its listing.

## Why our current kitchen misses

**Verified in our source:** `KitchenScene.tsx` deliberately dims service.
The spotlight target changes from 80 in menus to 32 in service; ambient
intensity moves from 0.55 to 0.3, with colour changing from `#8a6a44` to
`#3a4050`. Background/fog also darkens to `#0d0b09`. This is part of the
observed gloom, not a measured proof that one light parameter explains it all.

**Verified in our source:** `BrigadeFigure` is assembled from simple geometry.
Its normal activity is whole-body sinusoidal bounce, turn and weight shift;
plating changes the bounce rate. There is a departure animation, but routine
working motion does not articulate cooking tasks. More bounce would not make
Petra feel like Petra.

**Observed in the recent player-view captures:** large dark regions dominate;
the active food is small; staff have similar silhouettes; the bright, textured
illustrations and restrained geometric scene have different visual identities.

The fix needs composition, material treatment, character performance and
physical consequences together. Raising exposure alone would leave generic
figures and abstract actions.

## The most useful references

### 1. Jelly Zoo: reactions make simple characters feel alive

[Demo](https://jelly.krisyang.dev/) ·
[Source](https://github.com/krisyangdev/jelly)

**Observed with Ego:** a warm, legible room, distinct soft animals, and visible
deformation/rearrangement after dragging an animal.

**Source checked:** `src/main.js`, especially `poke`, pointer interactions and
`updatePet`. A poke changes physical shape, facial expression and blush,
triggers a sound, and makes nearby animals respond. Held/petting interactions
have different reactions. These are connected responses, not random motion.

**Adapt:** when the chef calls an order, Petra looks up, acknowledges it, then
works. A send-back changes her expression and handling of the plate. A smash
gets a local flinch and a glance from the next cook. Give each cook a different
working rhythm.

**Do not copy wholesale:** soft-body chefs, plush styling or full particle-based
physics. A small authored pose system can express the same causal structure.
Code has an MIT license.

### 2. R3F Sketch Material: put the illustration into the objects

[Demo](https://r3f-sketch-material.vercel.app/) ·
[Source](https://github.com/abhishekmill/R3FSketchMaterial)

**Observed with Ego:** switching to the pencil preset changes the drawn
surface/outline treatment of actual 3D objects.

**Source checked:** `src/sketch/SketchMaterial.jsx`,
`SketchOutline.jsx`. Hatching uses object-space triplanar coordinates and a
lighting-dependent density. Outlines combine an inverted hull with seeded
edge strokes. The implementation is React Three Fiber/GLSL, a closer fit to
our current rendering path than the WebGPU/TSL examples.

**Adapt:** restrained ink silhouettes and patterned shading on aprons,
ceramics and painted kitchen surfaces, using our cream, vermilion, mustard
and petrol palette. Preserve saturated colour and readable food.

**Do not copy wholesale:** blue ballpoint monochrome, dense scribbling on every
surface, or multiple outline passes for every prop. The demonstration's
`<Canvas flat>` and custom shader lighting are not a drop-in material swap for
our existing PBR scene. Code is MIT; its models have separate asset credits.

### 3. Skate Dog: a consistent palette and readable shadows

[Demo](https://skate-dog.vercel.app/) ·
[Source](https://github.com/MatthewGreenberg/skate-dog)

**Source checked:** `src/game/palette.js` and
`src/game/components/Lighting.jsx`. Palette and lighting have a shared
contract. The rig separates key, fill and environment contributions rather
than warming every layer independently. It explicitly addresses dark
occlusion collapsing into dirt.

**Adapt the principle:** cream-tiled walls, copper accents and coloured
station identities under a warm key with neutral/cool fill. Faces, aprons
and ingredients must retain colour in shade. Use a controlled shadow key
and broad fill; adding many more point lights is not the first solution.

**Limit:** the repository's reference-measurement comments are its author's
claims; they were not independently reproduced here. The live page was
observed progressing from loading to its playable title; this is not a
completed gameplay/performance test.

**License:** PolyForm Noncommercial 1.0.0. Learn from the approach; do not
treat this as MIT code that can automatically be transplanted into our game.

### 4. Slice of Life Crisis: make food worth looking at

[Demo](https://davidyen1124.github.io/slice-of-life-crisis/) ·
[Source](https://github.com/davidyen1124/slice-of-life-crisis)

**Observed with Ego:** a readable cake surface and cut face, soft side light,
contact shadows, and a knife/cut response to a real swipe. The capture shows
the cutting response, not a fully audited slicing simulation.

**Source checked:** `src/stage.js`, `src/input.js`. The stage uses a window-like
key plus wall bounce. Input distinguishes swiping, holding, lifting and view
movement, including cancellation and lost-pointer-capture handling.

**Adapt:** put the plate close enough to judge. Give Wellington a visible
cross-section, scallops a readable sear, and soufflé an actual structure.
Slide the plate into the pass; lift or turn it for inspection; give it
contact and weight. This connects visual quality to the planned food-evidence
system.

**Do not copy wholesale:** a freeform cake-cutting game or heavy depth of
field over active controls. No standalone license was found in the fetched
tree; reuse permission needs checking before copying implementation.

### 5. Yarn World: make ambient motion share a cause

[Demo](https://yarn.krisyang.dev/) ·
[Source](https://github.com/krisyangdev/yarn-world)

**Observed with Ego:** tactile yarn/ground materials and coherent soft
lighting. A drag changed the view; the thread-triggered world-building
sequence was not verified in this pass.

**Source checked:** `src/wind.js`, `src/spring.js`. A shared spatial gust field
is available to CPU animation and shaders. The spring integrates with
substeps rather than a frame-rate-dependent fixed interpolation.

**Adapt:** one gentle ventilation direction for steam, hanging dockets and
towels. Let opening an oven or a chef's forceful action cause a brief local
response. Keep idle motion subordinate to active cooking.

**Do not copy wholesale:** yarn textures or perpetual motion on every object.
Code is MIT; the project lists sound assets separately as CC0.

### 6. Paper Crumple: tickets can be handled objects

[Demo](https://tympanus.net/Demos/PaperCrumble/) ·
[Source](https://github.com/item-develop/paper-crumple-demo)

**Observed with Ego:** crumpled paper falls and settles into a physical pile;
clicking a paper ball unfolds it into a large, visibly creased card.

**Source checked:** `src/paper-vat.js`. It loads baked FBX/EXR animation data,
decodes vertex positions and reconstructs normals. This is authored motion
data, not a magic CSS effect.

**Adapt:** a new ticket prints, bends and catches on the rail; a completed
ticket tears away or folds into a small pile. Keep the hit target stable.

**Tradeoff:** a simple bend or short authored mesh animation is a better first
experiment than adding a Houdini/VAT pipeline just for dockets. MIT code;
inspect exported asset terms separately before reuse.

### 7. Smear Frames × Motion Blur: accent a forceful gesture

[Demo](https://smear.niccolofanton.dev/) ·
[Source](https://github.com/niccolofanton/smear-blur-showreel)

**Source checked, live effect not interactively verified:**
`src/velocitySmear.js`, `src/directionalMotionBlur.js`. The deformation keeps
the leading silhouette comparatively sharp while stretching trailing
vertices. The blur uses velocity/depth data and multiple render targets.

**Adapt the animation principle:** one brief drawn smear on a pan flick or
plate throw, followed by a clear contact pose. Prefer object-local animation
before a whole-screen motion-blur pipeline.

**Avoid:** smearing text, the plate being inspected, or the camera on every
action. The current implementation uses WebGPU/TSL; no standalone license
was found in the inspected tree.

### 8. Relighting Images: preserve the original drawing where appropriate

[Demo](https://tympanus.net/Tutorials/RelightingImages/) ·
[Source](https://github.com/DGFX/codrops-relightning-images)

**Observed with Ego:** moving the pointer changes shading across a flat
illustrated/photographic surface.

**Source checked:** `src/effect/plane.js`, `nodes/normal.js`. Depth gradients
and image detail provide normals; node materials use depth and occlusion.

**Adapt selectively:** relief posters, illustrated panels or a character
portrait reacting to a nearby stove. This could support a deliberately
layered illustration approach.

**Limit:** relighting a portrait cannot supply missing limb animation,
silhouettes from other angles or expressive performances. The implementation
uses WebGPU/TSL. README declares MIT but the referenced LICENSE was absent
from the fetched tree: confirm terms before reuse.

## Additional source lessons

- **[Hatch & Outline Lab](https://github.com/andrewwoan/blender-to-threejs-sketchy-shader-and-demo-portfolios):**
  checked `src/methods/invertedHull/outline.js` and
  `src/shared/paperGrade.js`. Useful comparison of outline costs and a shared
  finishing pass. An inverted hull adds geometry/draw work and misses internal
  contours; a full-screen outline needs buffers. Do not import the demo's
  strong vignette into an already dark kitchen. MIT. The README warns its
  technical prose was AI-generated; conclusions here rely on code inspected.
- **[Cinema Seat Preview](https://github.com/codrops/CinemaSeatPreview):**
  checked `js/rig.js`: destination-aware camera paths, obstacle clearance,
  reduced-motion crossfades and separate pointer/drag layers. Useful for
  intentional inspection transitions, not a camera that drifts during a timed
  decision. Ego captures before and after an arrow-key action show the change
  from the room overview toward a seat-level screen view. MIT.
- **[Smash Your Pumpkin](https://github.com/LucaArgentieri/smash-your-pumpkin):**
  checked `src/game/Destruction.js` and `src/core/FracturePool.js`.
  Separates crack/break/pieces/dust outcomes and moves fracture work into
  workers. Our plates can use a small pre-fractured shard pool; we do not need
  arbitrary runtime mesh destruction. Reuse license not established.
- **[lilpix](https://github.com/0xdhrv/lilpix):**
  checked `src/Bot.tsx`: damped gaze/blinks, a simple interaction hit box, and
  a reduced-motion guard. Good small-scale reference for acknowledging the
  player without moving every body constantly. MIT.
- **[The Hand](https://github.com/PabloMesquida/the-hand):**
  checked `src/Hand.js`: named finger bones and rest-relative poses, with
  quieter motion while pointing. Useful for a future first-person hand pass;
  model/rig compatibility and reuse rights remain to be checked.
- **[Atelier UI](https://github.com/whatisjery/atelier-ui-codrops):**
  checked `webgl-provider.tsx`: shared canvas/portal infrastructure and
  renderer readiness. Learn the DOM/WebGL coordination, not its promotional
  distortions. Avoid adding another canvas for each game panel.
- **[LeafThrough](https://github.com/dmtrbrl/leafthrough):**
  checked `src/navigation.ts`: page state, interruptible riffle navigation
  and keyboard guards. An optional physical kitchen book could benefit later.
  It is lower priority than the kitchen itself.

Record Player, DomGL Cloth and Boo-mas were fetched as further candidates;
their implementation has not been audited in this pass. The other catalogue
entries remain preview-level references. Ocean simulations, city generators,
Gaussian splats, scrolling typography and full-page distortions were screened
out of the first kitchen slice because they do not address its main problems.

## Proposed direction: a bright illustrated service

The room should feel like the poster has become a working place.

1. **Compose around people and food.** Bring the working brigade and pass into
   a tighter composition. Reduce empty dark ceiling/background. Keep the mouse
   free and the opening direct. Make the food large enough during inspection
   to carry the decision.
2. **Set a shared colour/material contract.** Cream, vermilion, mustard,
   petrol and warm ink; coloured shadows with readable faces. Use patterned
   shading sparingly. Keep copper, ceramic, cloth and food distinguishable.
3. **Give the brigade verbs.** Separate working, presenting, waiting and
   reacting poses. Petra's precision, Dimitri's economy and Anwar's
   nervousness should be visible before their biography is read.
4. **Give each decision a physical consequence.** Serve: slide, collect,
   guest response. Send-back: plate reverses, cook looks, correction begins.
   Smash: committed throw, contact, bounded fragments, local reaction.
   Resolve feedback from the actual action event; do not invent extra outcomes.
5. **Layer activity by importance.** Quiet ventilation/steam; distinct
   station work; strong short reactions. No synchronous whole-room bobbing.
   Busy should still be readable.

This combines stages 2 and 5 of the attachment plan around one visible proof,
rather than completing another abstract system before fixing what players see.

## First implementation slice

**One station, Petra, one Wellington, the existing opening.**

- [ ] Brighter service lighting and a tighter pass composition.
- [ ] One coloured illustrated material treatment, proven at play distance.
- [ ] Petra's distinct silhouette and call → work → present → react sequence.
- [ ] Wellington presentation, contact shadow, steam and readable cut surface.
- [ ] Serve and send-back have visible travel and a corresponding reaction.
- [ ] One short smash treatment with capped effects; no whole-screen blur.
- [ ] Docket printing/settling supports attention without moving click targets.
- [ ] Compare old/new stills and short motion captures from the same player
      route; test the full transition into ordinary service.

Acceptance: the scene reads without explanatory text; the cook and dish can be
identified; an unfamiliar observer can tell which action happened from the
motion; controls remain immediate; the improved opening is preserved. Judge
character motion on video, not just screenshots.

Keep React/Three/Zustand and the current renderer for this proof. Prefer the
GLSL-compatible treatment and authored animation over a simultaneous WebGPU
migration, physics overhaul and asset batch. Measure frame times and resource
cost on the actual prototype before expanding it. No cross-project performance
claims were measured during this research.

## Verification limits and adoption

No gameplay/art source was changed by this research. No third-party code or
art was copied into the game, no paid generation was run, and nothing was
published. Source availability is not permission to copy every model or sound.
The live browser checks are qualitative; audio was not judged by ear and no
human attachment study was conducted.

**What we take forward:** a coherent illustrated material/light treatment,
action-driven character responses, tactile food and paper, and restrained
shared ambient motion. The first proof should make one minute of service
visibly better before the approach is extended to the whole kitchen.
