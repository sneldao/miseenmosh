# Current production checkpoint

## Brigade body production — Dimitri and Anwar (latest)

- **Both bodies rigged, motioned and studio-reviewed.** Following the Petra
  pipeline on the owner-confirmed Meshy Pro web route (Ego space2/p2):
  Humanoid rig with marker check for each (auto-placed markers verified on
  all joints — chin/shoulders/elbows/wrists/groin/knees/ankles), then one
  Motion Prime work clip each, applied to character and re-downloaded:
  - `assets/meshy/dimitri-pilot/rigged-dimitri.glb` (3.3 MB) — clips
    `Walking`, `Running`, `Dimitri___sauce_stir_and_taste`.
  - `assets/meshy/anwar-pilot/rigged-anwar.glb` (3.4 MB) — clips
    `Walking`, `Running`, `Anwar___bowl_whisk_and_check`.
  Skeleton exports use the Mixamo template with "All Added" animations,
  matching the Petra export settings.
- **Motion Prime prompts (10cr each, logged in
  `kitchen-production-ledger.json`):** Dimitri = standing saucepan stir in
  slow circles with a taste pause; Anwar = bowl cradled in left arm with
  brisk right-hand whisk and a look-in check.
- **Studio review passed** (`assets/meshy/review-brigade.py`, Blender
  4.5.16 EEVEE, renders in `docs/devlog/media/kitchen-production/`):
  `dimitri-work-{front,quarter}-sheet.png` shows him leaning over the pot,
  right hand stirring, spoon lifting to taste; `anwar-work-*-sheet.png`
  shows the bowl cradle and small-circle whisk with look-down check.
  `*-gait-sheet.png` (walk + run quarters): both aprons hold as panels
  with no thigh splitting; silhouettes read broad (Dimitri) vs slim
  (Anwar). Generated heads remain guides — approved portrait crops
  (`assets/recraft/playable/{dimitri,anwar}.webp`) mount at runtime.
- **Spend: Meshy 85/150** (Petra 25 + Dimitri 25 + Anwar 15 + 2×10
  motions). Recraft 70 used; existing balance authorised as needed.
- **Runtime prep done** (`assets/meshy/prepare-brigade.mjs`):
  head cut + `PortraitSocket` + work clip renamed to `Work`;
  `runtime-dimitri.glb` (3.7 MB) and `runtime-anwar.glb` (3.8 MB).
  Apron reweighting attempted then disabled by default — partial-shell
  reweights left visibly ragged dark patches (leg-axis distance is a
  continuum, no clean apron/trouser cut); kept behind `--apron` flag.
  Non-apron reindex must read original `JOINTS_0`/`WEIGHTS_0` accessor
  types — in-memory `Uint16` overrides corrupted skinning until fixed.
- **Scene integration done and live-verified:**
  `src/scene/BrigadeCook.tsx` (generic rigged actor mirroring Petra's
  state machine; Ready = static Work-frame-0 subclip since GLBs ship
  `Work`/`Walking`/`Running`, not Petra's renamed clips) +
  `src/scene/BrigadeKitchen.tsx` (station props: Dimitri's sauce pot,
  Anwar's bowl/whisk) wired into `KitchenScene` behind
  `PropBoundary`→`Suspense`→`IllustratedCook` fallbacks. Bone-local tool
  sockets computed numerically (`assets/meshy/probe-sockets.mjs`):
  spoon `mixamorigRightHand` rot `[-1.384,-0.115,0.202]`; whisk
  `[-2.302,-0.462,0.845]`; bowl `mixamorigLeftForeArm`
  pos `[0.036,0.364,0.096]` rot `[-1.815,-0.525,1.682]`.
  `Station` gained `squash?`; `Stations` takes `squashIdx` — stations 1/2
  squash to 0.8 once their real body reports ready.
- **Live QA passed (Ego space2/p1, local preview):** all three real
  bodies in service; portraits socketed and scaled (Dimitri 0.52,
  Anwar 0.82 — first pass read too tall); work clips visibly animate
  during plating (frame-diff verified); Anwar cradles bowl, Dimitri's
  spoon dips toward pot. Overload/fire propagates to both new stations
  (feed: "ANWAR's station is ON FIRE", status flags); click-to-smother
  confirmed working on Dimitri's station ("You smother the fire on
  DIMITRI's station with a hotel pan"). No fallback regression; clean
  `tsc` + Vite build ships both GLBs.
- **Watch items:** walkout/Running verified in Blender but not yet seen
  in-game on stations 1/2 (code path mirrors Petra's proven one); apron
  thigh-weighting is unchanged from source — re-check during walkouts;
  smother click relies on the same hit targets as illustrated stations.

## Deployed — release `15b856f8` live (22 Nov)

- Commit `135e777` pushed to `main` (needed `gh auth switch --user
  sneldao` — active account had defaulted to `thisyearnofear`), deployed
  via `opengame deploy . --wait --json`, review SUB-2015 outcome
  `publish`, **live at https://opengame.io/g/9i7mjkmdx4** serving
  `index-DOdAbBGz.js` (hash verified against local dist). Draco
  `missing-ref` heuristic again a false positive — no GLB is compressed.
  Jam entry retained (Game Jam #1, all four tracks). Log in
  `docs/deploy.md`.

## Commis body — IN FLIGHT (resume here)

- **Role:** our plate runner — replaces `DeliveryTray`'s floating
  mittens in `KitchenScene.tsx` and will carry served plates to the
  dining room + return empties (porter duty in one body).
- **Portrait:** `assets/recraft/cast-gilliam/commis.webp` exists; a
  masked head crop still needs making into
  `assets/recraft/playable/commis.webp` (same process as the cooks').
- **Body reference ACCEPTED:**
  `docs/devlog/media/kitchen-production/commis-body-reference-01.webp`
  (Recraft V4.1 Pro, 10cr, ledger id `commis-body-reference-01`) —
  slight build, oversized cream jacket, petrol waist apron, turned
  cuffs, tan lace-up boots.
- **Meshy web route (Ego space2/p2):** mesh task created from that ref —
  Smart Topology / Meshy T2.5 / 8,000 / Texture on / 15cr charged
  (running total **100/150**, account 1,450 left). Mesh finished and
  sits in the library as the newest card (cream jacket, petrol waist
  apron).
- **Resume:** confirm the texture stage (N1, 2K — dialog appears on
  selecting the card, same as Dimitri/Anwar), then Animate → Humanoid
  rig → markers check → download rigged GLB (Rigged Character +
  All Added, GLB). Then ONE Motion Prime clip (10cr): tray-carry walk —
  suggested prompt: "carries a tray held at chest height in both hands,
  walks briskly, glances down at the plates". Download GLB to
  `assets/meshy/commis-pilot/rigged-commis.glb`, audit clips with
  `audit-rig.mjs` pattern, studio-review with `review-brigade.py`,
  prep with `prepare-brigade.mjs` (add commis entry), then integrate —
  DeliveryTray becomes a full walking body on the pass→door route.

## Live-test continuation — latest state to resume

- **Pilot verified on `index-CQUx-pdA.js` (CSS `index-BiScvYfR.css`).**
  tsc and production build green. This build contains the walkout exit-tail
  fixes, the blocked-GLB fallback click-through guard, thin portrait backing
  and the morning fire-reset guard. 5174 preview is live; Ego space2/p1 sits
  in the opening with Petra mid-cook. No paid jobs this round; spend remains
  Recraft70 / Meshy25 of approved caps.
- **Walkout proven live and on film.** A real-input regression take
  (`petra-live-walkout-fixed.webm`/`.json`, actual script Ct_C215Y — the
  intermediate build with identical exit code) drove 9 screams: Petra was
  called mid-pressure (`calledDuringPressure:true`), all three cooks quit,
  and review followed at ~9.45s wall. Review still
  (`petra-review-exits-complete.png`) shows every station empty — no frozen
  mid-exit bodies; next-morning still (`petra-next-morning-reset.png`) shows
  all three restored. The fillet release is proven frame-by-frame:
  `pilot-exit-contact-frames/` holds exactly the 30 source frames in
  9.20–10.20s (first PTS9.211, last10.178, ~30Hz actual capture; the earlier
  `*-resampled-*` files are kept but are duplicated-pair output and must not
  be cited). Sheets `pilot-exit-contact-sheet-{1,2}.png`: the fillet leaves
  the tongs, lands in the skillet and stays there while Petra exits; no
  origin snap.
- **Blocked-GLB fallback proven end-to-end.** With `runtime-hold*.glb`
  network-blocked on the Ct_C215Y build: expected single PropBoundary fault,
  game booted, opening served, Wellington reached READY on the legacy
  counter, and a real click at (379,339) collected it to the pass
  (`petra-fallback-collected-fixed.png`, PassPanel shows INSPECT). This was
  enabled by a new guard in `Stations.tsx` — the invisible smother hit-box
  now returns early unless the cook is burning, so it no longer swallows
  clicks meant for plates (previously unconditional `stopPropagation`).
  Network flags were restored after the test.
  `petra-fallback-ready.png` is NOT fallback evidence (interception lost
  across rounds; it shows the native body) — keep as native UI proof only.
- **Thin portrait backing verified** (`petra-close-thin-backing.png`):
  backing extrusion depth .1→.02 at z-offset .09, print plane preserved at
  .113; the black-helmet read is gone at close range. Texture, outline and
  head size untouched.
- **Morning fire-reset:** `Flames` now returns null during `title` and
  `briefing` phases (shared component in Stations.tsx). Fix is code-reviewed
  but NOT yet re-verified live through a full next-morning transition —
  the earlier `petra-next-morning-reset.png` was captured before this fix
  and still shows the stale fire.
- **Controls/Pause buttons** now carry the paper/ink palette
  (`background:#f4ead2; color/border #183a35`) — visible and readable in the
  latest close-up against the purple wall.
- **Automation note:** the game auto-pauses on window blur; every new
  Ego script round can arrive to a re-paused game. Drive checks inside one
  invocation: detect `PAUSED — P to resume`, dispatch a synthetic `p`
  keydown or `.click()` buttons (real pointer clicks are legitimately
  blocked by the pause overlay).
- **Remaining pilot gaps before brigade expansion:**
  next-morning fire guard unverified live; no uninterrupted normal-service
  take on CQUx-pdA; 60Hz target unproven (prior shared-machine captures
  ~29 submissions/s); audio continuity still unjudged (silent captures only).
- **Goal remains the whole living kitchen**, not an endless Petra study:
  three distinct cooks, staff carrying plates, a visible problem, intervention,
  recovery and sound, readable with HUD hidden. Preserve the clean opening and
  approved collage faces. Bigger restaurant-memory/nine-night plan still applies.
- **Newest built candidate:** `index-D-6AaEwi.js`, CSS `index-CRXwEB-T.css`;
  tsc and production build passed. Root reviewed every changed section, including
  the corrected final walkout guard. **Browser has NOT reloaded this candidate.**
  Browser's last proven script is still `index-DOOOFSdL.js`.
- Server5174 is production preview; **reload after builds**. Old DOOO build is
  preserved at `/tmp/miseenmosh-pilot-DOOOFSdL`. No agents/renderers running now;
  sidekick idle, latest code handoff reviewed/accepted. No agent-browser sessions
  were started. Root still owns Ego space2/p1, currently on the all-walkout review
  in the old DOOO build. Do not create another task space to recover.
- Root real-input checks completed on DOOO:
  title→Continue→Serve→Call→judge; three stations plating at once; click the actual
  trolley plate at(482,361) to collect Wellington; click(721,327) and(1074,326)
  to smother Dimitri/Anwar fires; pause/resume; V camera; click “Bring sauce
  together”, observe WHISKING then its disappearance and inspection observations.
  No game state was injected. **Petra's own fire target remains untested.**
- Evidence in `docs/devlog/media/kitchen-production/`:
  `petra-live-normal-service.png`, `petra-ready-trolley.png`,
  `petra-collected-recovery.png`, `petra-first-person.png`,
  `petra-first-person-corrected.png`. Root viewed all except corrected FP still.
  Initial FP still was during camera transition; capture a settled FP frame.
- Root reviewed `pilot-motion-20.png` and `pilot-motion-sheet-4fps.png`.
  Real torso, original portrait, upright cooker, held fillet and skillet read
  together. Sheets are **2/4fps samples, NOT every actual frame**. Actual video
  duration5.61s versus6.5s wall observation; not deterministic timing/performance
  proof. Silent captures cannot establish audio quality. Head backing clipped
  at the top of close frame; candidate camera now raises eye/target by.25m.
- Additional fixes already built and reviewed:
  - `petraReady` callback (`useLayoutEffect` in PetraKitchen) drives Plates:
    native ready trolley/cooking-food exclusion only when real kit committed.
    Legacy fallback keeps its old plate position and cooking food.
  - `ServiceTools` now keeps mouse-accessible Controls/Pause after introduction.
  - Ink edging on ticker/brigade/status/hint; opacity1; hint moved below rail.
    No dashboard panels or new explanations added.
  - Close camera eyeY2.1, targetY1.5. Original portrait geometry unchanged.
- **Real failure found and fixed:** charged Space input made DIMITRI quit, then
  ANWAR, then final PETRA triggered allOut→review. Both render controllers returned
  before their walkout branch in review, freezing Petra at the stove and Anwar
  mid-exit. Confirmed by source path AND `pilot-walkout-before-110.png` (root viewed).
  Last-cook departure now uses bounded UI time only during review/ending; active
  cooks still freeze. Petra's outElapsed drives food drop and absolute exit X,
  seeded from walkoutAt for late-loading models. Legacy controller uses its
  local visual clock through review. First sidekick pass missed the legacy guard;
  root caught it, consolidated correction returned, root verified it in source.
- Walkout recording: `petra-live-walkout-attempt.{webm,json}`,19.97s.
  The browser harness incorrectly waited for another TOO LONG charge after
  review and timed out; its recorder stopped and the artifact was retrieved.
  No recorder/RAF left running. Recorded DOM out transitions at2.09s DIMITRI,
  5.19s ANWAR, review at7.29s; status “WALKED” counts guests, not cook departures.
  `pilot-walkout-before-{60,80,110}.png` are actual6/8/11s frames.
- **Next concrete checks, then expand**:
  1. Reload D-6AaEwi, enter a fresh residency through the real Menu. Current save
     contains the QA failed service, backed up at
     `/tmp/miseenmosh-pilot-career-before-fresh.json` (`mem-career` only).
     `mem-legends` is the other game key; don't dump unrelated storage.
  2. Check new close framing, readable HUD and normal-service Pause/Resume.
  3. Re-run final-cook walkout. Space down→wait visible TOO LONG→Space up;
     stop charge loop when review appears, not only when `.cook.out` includes
     PETRA (last cook immediately removes that DOM). Record enough time after
     review to see exits complete. Do not rederive the frozen pre-fix video.
  4. Block `*runtime-hold*.glb*` via tab-scoped CDP Network.setBlockedURLs,
     disable cache and reload; real opening/normal ready collection must remain
     visible on legacy counter. Restore network settings afterwards. No hidden
     game-state mutation. Root owns browser QA, sidekick implementation/rendering.
  5. Verify native Petra fire/smother and settled FP. Pilot still in_progress.
     Then make Dimitri the second body pilot before the remaining brigade/crew.
- No new paid generations, commits or publishing. **70 Recraft /25 Meshy**
  unchanged; Meshy150 total approval stands, T2.5/N1 bodies and Motion Prime.
  Recraft existing balance authorized as needed. Use owner's Pro Meshy web
  session through Ego, not free MCP account. Original whole-room/FP Recraft
  paintovers were rejected; prefer actual 3D staging, not more blind i2i revisions.

## Latest continuation — real equipment pilot in the served build

- **Current served build:** `http://127.0.0.1:5174/`, `index-DOOOFSdL.js`.
  This is a **production preview, not HMR**. Reload after each build.
  Root verified the actual script URL and title→Continue→Serve→Call path.
- Current runtime body is `assets/meshy/petra-pilot/runtime-hold.glb`,
  SHA `fb0e0229cd01b8b808741ea72a0446f4132d3cdcfeccfd6a2db93db800c90b90`.
  `hold-rig.mjs` is lead-owned: curls fingers, pronates forearms, fits grips
  between thumb/finger pads, keeps the frozen equipment trajectory, shifts
  stance back55mm to clear the cabinet. Tool socket/default grasp also works
  on Walking/Running. Original source assets remain unchanged.
- Root accepted `hold-review-sheet.png`, `hold-closeup-sheet.png`,
  `hold-palm-sheet.png` for live testing. These studio sheets precede the
  final55mm stance shift. They establish grip readability, not final runtime
  acceptance. Earlier palm-average fits put metal through the hands and
  were rejected despite small anchor errors.
- Lead-owned `pilot-contact-check.mjs/json` found14.347mm sampled cabinet
  clearance at60Hz; reversing the55mm shift catches40.653mm penetration.
  Jaw half-angle now **.115 held, .14 open**. .07 and .095 penetrated food
  too deeply. At.115, minimum silicone-vertex distance to the conservative
  capsule is−1.655mm upper/+0.849mm lower; this is not a full triangle audit.
- New scene files: `PetraKitchen.tsx` loads body/equipment together, with
  legacy cook+station fallback; `SearingFillet.tsx` uses a graded owned
  Recraft texture and frozen `FILLET_IN_TOOL`. Root authored grade-beef.py.
  Prepared props retain source geometry/materials. Cooker/pan use frozen
  actor-local placements under world `[−3.6,0,−4.03]`.
- Latest reviewed implementation: work clip speed fits ticket duration;
  active-action guard fixes unplayed action weight1; food follows the socket
  from a world portal and returns to the pan on walkout; prep trolley,
  supported cloth, correct plate position and smaller fire footprint;
  boot-only PMREM; first called order gets a close camera, then returns to
  pass. Both implementation passes built successfully.
- **Browser owned by root:** Ego space2, `p1`, goal “Mise en Mosh kitchen
  pilot”. Old68 no longer exists. Current page at introductory judgment
  with Serve / Send Back / Smash. No agent-browser session was launched.
  Finish this Ego space appropriately at task completion, not now.
- Live evidence: `petra-live-opening.png` (previous CLTW build, wide view);
  `petra-live-first-order.{webm,json,png}` (DOOO build). Video is silent,
  unstepped live observation, with163 rAF observations over6.5s, not a
  performance or deterministic timing proof. The normal build exposes no
  diagnostics and `/src/game/state.ts` is unavailable; a failed import
  created no recorder. Subsequent capture uses DOM/read-only observations.
- **Current handoff:** sidekick extracting every video frame into labelled
  `pilot-motion-sheet-*.png`, plus full stills at1.2/2.0/2.8s. No edits,
  builds, browser or asset-pipeline work authorized in that handoff.
  Review its returned images/code changes before continuing.
- **Next:** inspect motion/close framing, then real UI checks for normal
  ready-trolley collection (intro auto-transfers to pass), both cameras,
  pause, fire/smother recovery and walkout. Pilot remains open; do not
  expand the paid brigade yet. The broad room still has legacy bodies and
  oversized block stations; the whole-kitchen milestone is not achieved.
- Spend remains **70 Recraft /25 Meshy**, Meshy total cap150. Recraft
  existing balance authorized as needed; recheck availability before calls.
  Fal $1 body pilot unused. Use signed-in Meshy Pro web account via Ego,
  not the separate free MCP account. No commits or publishing performed.

Older checkpoint below is retained as history and is superseded above.

- Preview: http://127.0.0.1:5174/ — `index-D3KNq5xy.js`, diagnostics enabled.
- Petra's real body is integrated; `PetraCook.tsx` was reviewed twice. Latest
  lifecycle fixes accepted: Ready initialized before render, raw head pose
  captured correctly, StrictMode bindings recreated, owned skeletons disposed,
  backwards-clock reset, unwarped crossfades and time-based exit yaw.
- Sidekick idle, last handoff complete. Its Ego spaces 87/90 closed. Server
  5174 remains up. Root owns Ego space 68: p2 Meshy pricing; p4 Innerscene cooker
  source page. p3 (Meshy rendering page) was closed. No agent-browser sessions
  were launched. Close only owned pages/task when browser work is done.
- No commits/publishing. Existing working tree includes earlier game changes.

## Frozen evidence

- Runtime GLB: `assets/meshy/petra-pilot/runtime.glb`, SHA
  `7329741a236e7df359b76bfdf04089beb63aba9c44fff3d509344e9fea46fc18`,
  3,861,112 bytes, 5,698 vertices, 7,231 triangles, 67 bones.
- Clips: PetraReady, PetraWork, Running, Walking. PortraitSocket bind-world
  (0,1.58,.02). Ready holds Work's first pose; Work's loop is eased over
  .25s in/.45s out. Rejected library motions are excluded.
- Root-owned scripts/reports: cook-rig.mjs, runtime-audit.json,
  runtime-manifest.json, work-contacts.json. Do not rederive frozen results
  for presentation. `cook-rig.mjs --contacts` captures joint positions;
  `--runtime` writes cooked + compact runtime derivatives.
- Final cloth selection is 644 vertices, six isolated shells. Earlier
  766-vertex colour selection wrongly included hidden gold-textured trousers.
  Current mask hash is hardcoded into cook-rig.mjs as an approval guard.
- Body/cloth sheets reviewed: cooked-work-sheet.png, cooked-cloth-sheet.png
  in docs/devlog/media/kitchen-production. Three-view sampled locomotion clears
  the legs. Full locomotion in game and walkout remain open.
- Latest game captures: /tmp/mise-petra-check2/{opening,working,working-zoom,first-person}.png.
  Fresh localhost storage → Take the pass → Serve → Call → Serve → v checked.
  No console/prop errors. Pause checked in earlier run. Night/backwards-clock
  reset is code-reviewed, not exercised live.

## Spend and scope

Owner selected **Prime kitchen — 150 cap** via question tool: T2.5/N1 bodies
15 credits each; Motion Prime actions10 each.125 planned including Petra,
25 revision reserve. Spent25: body15 + first custom motion10. The website
receipt confirms all three debits; rigging/preset/apply were included.
Recraft's existing balance is authorized as needed (60 spent so far).
Fal's separate $1 body pilot remains unused. Do not use the wrong free Meshy MCP
account. Continue through owner's signed-in web account in Ego.

Finish Petra's physical tool contact before the remaining Meshy body batch,
as promised. The whole-kitchen milestone is still pending: three cooks,
runner, porter, physical plates, problem/intervention/recovery, sound,
both cameras and performance.

## Next concrete work: real equipment and contact

CC0 sources downloaded to assets/props/{tongs,skillet,cooker}/source.glb.
Licence and reference photo links are in assets/props/README.md.

- Tongs:11,328,332bytes;6440tri;7 meshes (upper/lower arms and heads, hinge,
  ring, tab);8 embedded2048 maps. Long axis+X; hinge centre approximately
  (-.1372816,.0279769,0). Jaw ends near x+.167. Opening is XY plane, hinge Z.
  Proposed grip origin(-.075,.024,0), transform source+X to tool+Z by Y=-π/2.
  Keep upper/lower groups separate with hinge pivots; do not redraw as boxes.
- Skillet:5,631,796bytes;6870tri;body,main/helper handles,two spouts;3 maps.
  Bowl centre x=-.0285237,z=0;radius~.1324;bottomY0;rimY.05345.
  Main handle end x+.19290,y up to.05784; grip around x+.16.
- Cooker:743,232bytes;8512tri;127 meshes,6 materials,6 nearly uniform2048 maps.
  SHA80fed45092ac0625bebb430d3942ef58551118d907a1601431a285dc6efef58e.
  Real size .6×.6×.9m. Many grate/knob/rack pieces; merge static geometry
  by material, preserve door and controls as named moving groups.
  Source normals/geometry and material grading still need review.

Root inspected map ranges (linear data channels):

- Tongs brushed rough G44–68, polished21–39, silicone96–133; R/B255.
- Skillet rough G82–132; R/B255; metal factor.6 and normal scale.9 supplied.
- Cooker materials: gasket rough.82/metal0; iron.65/.6; inox.31/.78;
  enamel.24/0; dark.25/.08; optical transmission.88, IOR1.47,rough.08.

Proposed conversion decisions, not yet implemented: tool maps512; cooker
maps256 (almost uniform); preserve packed RGB channels; normalize resized
normal vectors. Grade brushed steel roughness .55–.67, polished .45–.55,
silicone .75–.9, cast iron .65–.8 with metal.15, normal scale.35. Enamel
should join the green/cream kitchen palette. Avoid expensive transmission
for the oven window; preserve a separate door for later action. Metallic tools
need a small shared indoor reflection map to avoid black steel without IBL.
Root owns exact pipeline configuration/measurements; implementation and
studio rendering go to sidekick once the recipe is authored.

The current station0 is the old3.2m-wide counter scaledY.8 (top.92); actor is
z=-4.17. This is temporary. A real .6m range lets the lowered rest tongs hang
beside it rather than intersect a huge counter. Candidate placement to test:
actor z~-4.03; range centre x=actorX+.20,z~-3.53, .9m high. Add preparation
surfaces/trolley within the old station footprint; do not silently change
interaction semantics. Final fit must be measured with the actual assets.
work-contacts.json has sampled wrist/knuckle/forearm transforms. Left wrist
y.983–1.036, right wrist1.036–1.219; actor needs equipment at human height,
not a large arm IK correction. Right hand reaches/lifts/returns; left hand
may move the pan, with only small contact corrections.

Photographs inspected privately (not licensed for game redistribution):
/tmp/miseenmosh-sear-grip-reference.png (Serious Eats/Diana Chistruga, beef
turned with tongs in cast iron) and /tmp/miseenmosh-tongs-grip-reference.png
(Serious Eats/Ashlee Redger, palm/thumb/fingers holding stainless tongs).

Visual note for next consolidated review: the unchanged thick portrait
backing is conspicuous above Petra's bun in downward views. Preserve the
face raster/outline identity; consider a thinner physical backing rather
than replacing the face. No change to that geometry has been made yet.

## Subsequent equipment/contact checkpoint

Equipment prep is implemented by sidekick in assets/props/prepare.py and
render-review.py. Root reviewed both passes. Fixed double-transformed tongs
hinge/ring, under-floor studio clipping, pre-resize linear uint8 quantization,
inverse-transpose column normalization and MR sRGB fallback. Current nine-frame
equipment-review-sheet.png is accepted for geometry/material direction.
Root's independent Three loader audit assets/props/audit.mjs passes:
6440/6870/8512 triangles preserved;6/1/18 draw primitives; position errors
<=3e-8m, UVs unchanged. Frozen results geometry-audit.json. Current hashes:
tongs83ba5465a28769ffd695b3b3cc558e67541d232d21f7f32d50afece11c9d0d21;
skillet3fdaa13e32c3e6135516c6f6cc74d6eee8d25f21b3cbbdccc250092f1606d83c;
cooker14130c890c0add093b08ddfba299917296698795061157654ece527942cff0be.
Sidekick idle, last equipment correction report reviewed; no app integration.
Cycles CPU4threads24samples rendered it; no Blender job remains.

Root's contact-study.mjs found work wrists held38–56deg from forearm/palm
axis (bind3–4deg). Added a PRIVATE candidate to cook-rig.mjs:
--runtime --contact-grip writes runtime-grip.glb, retaining captured body
motion but limiting hand swing15deg relative bind, twist85deg. Axis proxy now
11.5–16.1deg, no new torn edges in Ready/Work (runtime-grip-audit.json).
This is not yet visually accepted or installed; live build still uses original
runtime.glb. Only hand rotations changed, source GLBs remain untouched.

Tool fitting data: contact-study-grip.json (61 sampled frames), tool-fit-study.json.
Palm offset= .45*Middle1.localPosition + .1*Thumb1.localPosition:
Left[-.005378064513206483,.07308866791427135,.003978515416383744],
Right[.005507173296064139,.07546300664544106,.0037768586073070767].
Proposed tongs grip source[-.105,.024,0] and contact[.155,.009,0] (config
STILL uses old-.075/.14; update only after fit chosen). Right tool quaternion
relative to hand:
[.35044971223293764,-.16289807253775473,-.922293017451233,-.004985244121610527].
It was calibrated at original source20%; retain this quaternion, don't
recalibrate against a different phase when retiming. Grip looks diagonal to
the forearm; actual Cuisipro reference also shows this diagonal grasp.
Pan static target relative actor: grip[.18,.947,.16], yawπ/4,
centre[.04669360387553681,.9,.2933063961244632].
Place cooker rear-left burner under that centre: root x=actorX+.1966936,
z=actorZ+.4553064, y0. Proposed actorZ=-4.03.

Full source clip makes tool penetrate the range during entry/exit. Root added
--runtime --contact-loop => PRIVATE runtime-contact.glb with a4s loop:
hold source20% until.45s, eased source20%→50% over.45–2.75s,
blend to start over2.75–3.35s, hold to4s. Same natural wrist correction.
IMPORTANT: last generated runtime-contact still used20%→53.333%, which
dips into pan at end. Code was JUST corrected to20%→50%; regenerate and
recheck before any integration:
node assets/meshy/petra-pilot/cook-rig.mjs --runtime --contact-loop
node assets/meshy/petra-pilot/contact-study.mjs --contact
node assets/meshy/petra-pilot/fit-tool.mjs --loop
Then audit runtime-contact with audit-rig.mjs. fit-tool --loop reuses frozen
tool quaternion from tool-fit-study.json, outputs tool-fit-loop.json.

Next planned critical work (root authors): bake a SMALL left-arm contact
correction into this loop, NOT a whole new solver performance. Static pan
target above needs~5–7cm palm correction in retained segment. Use captured
elbow pole, two-bone solve on LeftArm/LeftForeArm, keep captured natural
Hand.localQuaternion; iterate wrist target=panGrip−handWorldQ*palmOffset
to converge palm contact. Reach limited to.98*(upper+lower); fail/report
unreachable rather than distort. Keep wrist anatomy via local rotation.
Sample clip tracks DIRECTLY onto bones per frame (not mixer cache, which may
skip unchanged values after procedural edits), solve, append only corrected
LeftArm/LeftForeArm rotation tracks. Source rest of body/clothing unchanged.
This bake is NOT implemented yet. Need actual pose + tool visual review.

Runtime integration design still to implement after this proof:
PetraCook uses candidate contact GLB, mounts real tongs to RightHand offset/q;
static skillet at fixed pan position, move jaws around their real pivots.
Cooker + prep surface replace oversized station0 block. Ready/plating Plate
positions are currently hardcoded[STATION_X,1.2,-3.0] in KitchenScene; they
FLOAT above lowered station0 today. Fix placement alongside new prep surface
(e.g. side board x=stationX+1,y~.95,z=-3.0), retain ticket-id click actions.
Do not pretend the food/hand contact is done. Food should physically lift,
turn and settle; choose release while tool still clears the pan.

Ego guide v2.2.1 now explicitly requires ONE space per goal. Future delegated
browser QA must use a dedicated page inside shared68, not create another
space. Root closes68 after browser work. No agent-browser sessions launched.

### Latest hand-contact proof state (supersedes the checkpoint above)

- `runtime-contact.glb` HAS now been regenerated with source20%→50%.
  Root implemented the left contact bake in cook-rig.mjs. It samples tracks
  directly, uses captured elbow pole, iterates8times with captured bounded
  Hand.localQuaternion intact, and appends only LeftArm/LeftForeArm rotations.
  Reach limited to.98×arm length and palm convergence must be<1mm.
- Final palm target is[.18,.957,.16], pan centre
  [.04669360387553681,.91,.2933063961244632], yawπ/4. Cooker root is
  [.1966936038755368,.01,.4553063961244632], on a .62×.01×.62 support pad.
  Raising range1cm gives natural reach. Actor proposed z=-4.03 in runtime.
- Root's `contact-study.mjs --contact --dense` writes a SEPARATE frozen
  `contact-study-loop-dense.json` (241frames,60Hz); original61-frame
  `contact-study-loop.json` stays frozen for the renderer. Max palm deviation
  at60Hz=1.719320202359388e-5m. Palm/forearm proxy Left11.695–12.014deg,
  Right12.930–13.982deg. Bake max correction.0762932m, keyframe convergence
  5.08673e-6m. Ready/Work have zero torn-edge share in runtime-contact-audit.
  Do NOT rederive these just to present them; use frozen files.
- preparation.json now uses final tongs grip_source[-.105,.024,0],
  jaw_contact_source[.155,.009,0]. Sidekick regenerated prep.
  Root reran geometry audit: tongs hash now
  184accb3b5b7f4c479b75db3674e585ad1ae39c15c0e8a8299cc0dca9462a2e1;
  other two hashes unchanged; all triangles/attributes preserved.
- New `review-contact.py`/contact sheets were REJECTED. Sidekick changed the
  specified C*M*C^-1 to C*M. Pixels show cooker lying on its back and pan
  vertical, despite its report claiming correct staging. Root reviewed full
  script and both sheets and sent a consolidated correction handoff.
  SIDEKICK IS CURRENTLY RE-RENDERING (one CPU4thread24sample process).
  Exact fixes: to_blender returns C4@M@C4.T; pad.scale(.62,.62,.01) because
  cube(size1), not half sizes. Root-authored assertions verify pan grip at
  C*[.18,.957,.16], pan upZ, cooker boundsZ.01–.91 and tongs socket_tip
  at C*compose(grip,handQ*relativeQ)*[0,-.015,.26,1].
  If assertion fails it must stop, not loosen. Await report, REVIEW full diff
  and sheets before integrating. Existing bad sheets will be overwritten.
  No app changes/build/browser task in this handoff;5174 stays running.
- Food carry study `food-carry-study.json`: radius.035m, straight half
  length.055m (capsule total.18m), initial centre
  [.04669360387553681,.951,.2933063961244632]. Rigidly attached relative
  to tool using offset_in_tool in that file; rotation delta is
  currentToolWorldQ * inverse(firstToolWorldQ). It lifts/checks the sear and
  returns smoothly, not a full180deg flip. All held frames clear the
  conservative floorY.916 (min2.314e-6m). Direct inspection of prepared
  skillet vertices inside50mm radius found bottomY0 and interiorY.0046;
  ACTUAL pan floor worldY=.9146, so the study has1.4mm extra margin.
  Fine twine can fit that margin. Need inspect actual tong JAW geometry,
  not just centreline, before claiming no utensil/pan penetration.
- One Recraft texture generated on approved personal account:
  seared-beef-surface-01.webp,2048square,10credits; Recraft total70,Meshy25.
  Ledger updated. Raw looks too pale/white-fibred, NOT approved to ship.
  Intended grade: restrained chestnut/amber/burgundy surface; try on fillet
  before deciding. Source hash and provider ID in ledger. No further paid jobs.

### Settled next runtime integration design, after visual proof

Preserve current PetraCook's service clock/pause/reset/event-tail/resource
guards. Use runtime-contact (private candidate until actual route review).
Prefer a boot-gated `PetraKitchen` parent loading body,tongs,skillet,cooker
in parallel through useGLTF(array). Pass body/tool GLTFs into PetraCook;
PetraStation receives cooker/skillet. One PropBoundary+Suspense fallback
contains original IllustratedCook AND original Station0. `Stations` can
skip0 after boot; export legacy Station for fallback. Keep station1/2 and
back-wall shelving working. No title-screen GLB fetches.

Tongs portal to RightHand at frozen Right grip offset and relativeQ above.
Three pivots use local rotation.z ±halfAngle (Blender conversion is different).
Clone scene nodes, preserve shared geometry/maps, don't override graded PBR.
Half-open≈.14 idle,≈.095 when holding food. Actual finger wrapping still
needs visual judgment after the renderer axes are fixed.

Food can be a deliberately shaped/tapered capsule mesh (radius.035,
straight length.11, alongX) with subtle INWARD contour variation, painted
sear texture and4fine butcher-twine loops. Keep within measured capsule
envelope apart from<1mm twine. It can be rigid under the tool group:
localPosition=toolTip[0,-.015,.26]+foodOffsetInTool;
localQuaternion=inverse(initialToolWorldQ). At Ready this puts it on pan;
native work/ready crossfade then returns food without teleporting. It reads
as a lift-and-check, don't claim a full flip. Need avoid food snapping on
work end/walkout; let transform follow the actual mixer, not a boolean.

Replace station0's oversized block/pan with real range + separate prep
surface at x=stationX+~1,y~.92,z~-3.0. Actual ready Plate position must
move onto it (currently hardcoded[STATION_X,1.2,-3.0]). Exclude station0's
generic plating Plate and floating sear ring while actual beef cooks.
Preserve ready ticket-id click to collect, fire/smother hit target and
visible fire at the actual pan; neighbours unchanged.

PBR metals need a neutral reflection environment (currently scene has only
hemi +2directionals, no env). Proposed boot-only PMREM from Three's
RoomEnvironment at intensity~.35, one generation, dispose generator/scene,
retain/dispose owned render target on unmount; no remote HDRI/new real lights.
Preserve approved faces; thick portrait backing is known separate debt.
Also inspect apron/range clearance: real body's apron may project toward
the range rear; don't assume AABBs/centrelines alone prove no overlap.

Runtime implementation is NOT dispatched yet: finish proof first. Lead owns
critical measurements/configs and review; sidekick should implement/render
and run narrow tsc/build/browser verification after the brief is settled.
Full brigade/runner/porter/audio/whole-room sequence all remain open.

## Commis runner — integrated and live-verified (night-1 build)

The commis (our plate runner) now ships as a real rigged body instead of
floating mittens. Meshy T2.5+N1 body (25 credits: 15 mesh + 10 Motion Prime
tray-carry; running total 110/150) rigged with Walking/Running +
`Commis___tray_carry_and_present` → `Work`.

Runtime prep (`prepare-brigade.mjs commis`): head cut at 1.44 lands clean
(neck binds 1.384), PortraitSocket, hips X/Z root translation pinned —
the carry clip has baked root travel and the game drives the route.
Clips: Ready (Work frame 0), Carry (Work 0–54 frames looped), Lift
(Work 58–end, once at the pass), Walking.

`src/scene/CommisRunner.tsx` runs the service loop: standby at the pass'
right end (x 3.3, facing the dining room so the collage portrait reads),
walk left to the pickup on each `lastDelivery`, Lift at the pass, Carry
right angled toward the room, exit frame, return empty-handed to standby.
The copper tray + real delivery plates ride a spine2-local socket
(measured at Work frame 0: [0.007,-0.204,0.170]) — the same `TrayBoard`
the mitten fallback still renders while the GLB streams in or fails.

Commis portrait: masked head+toque crop `assets/recraft/playable/commis.webp`
with a new PORTRAITS spec (bounds [300,115,655,565]) — the inked-back
reads as silhouette while carrying, face reads at standby.

Live-verified on the prod preview: lift at the pass with the real
Wellington plate, carry out, exit, return to standby facing camera.
No prop errors; pause freezes the route; fallback preserved.

## Fix found while integrating — brigadeReady render loop

`KitchenScene.brigadeReady(i)` produced a fresh `onReady` callback each
render while `setBrigadeIdx` always returned a new array → the
BrigadeKitchen layout effect re-ran forever → React #185 → PropBoundary
silently fell back to illustrated cooks. Both stations were affected in
the shipped build (Dimitri/Anwar real bodies were NOT actually rendering
live). Fixed: memoized per-station callbacks + updater returns `cur`
unchanged. Verified: zero `__propErrors`, real bodies and work poses
visible at SAUCE and PASTRY again.

### Watch items
- Commis carry yaw is angled toward the room (π/2−0.55) — check apron
  doesn't clip the pass counter on close camera.
- BEEFCAKES thief runner remains the illustrated silhouette — separate
  character, not the commis.
- Porter body still open: return-cart/clearing motion next candidate.

## Porter — integrated and QA-verified (night-1 build)

The porter (pot wash) ships as a real rigged body, completing the named
brigade of five visible workers. Meshy T2.5+N1 body (15 credits mesh+texture;
running Meshy total 135/150) from `porter-body-reference-01.webp` (Recraft
V4.1 Pro maquette, 10 credits): wiry older build, mustard work shirt rolled
to forearms, long petrol rubber bib apron to the shins, knotted neckerchief,
tan boots — silhouette distinct from all four cooks/runners.

Rigged humanoid; Motion Prime clip `Porter___bus_tub_haul_and_set_down`
(10 credits): hunched trudge with arms wrapped under a tub, then a
bend-and-set-down that reads as the pick-up dip when played forward.
Studio review (porter-work/walking/running sheets): clean carry, apron
holds as a front panel with no thigh split, boots grounded.

Runtime prep (`prepare-brigade.mjs porter`): head cut at 1.44 (neck binds
1.389 — same family as commis), PortraitSocket, root X/Z pinned (haul clip
travels ~1.8m baked). Clips: Ready (Walking frame 0), Carry (Work 0–46),
Grab (Work 48–84, once at the pass), Walking.

`src/scene/PorterRunner.tsx` mirrors the commis route on the left edge:
standby at x −3.3 facing the room; on `sentBack` increment he walks right
to the pass' end (x −1.0), bends into the Grab dip, then hauls LEFT with
a grey bus tub (spine2-local socket, measured mid-carry frame) holding the
actual sent-back dish (from the newest `verdict: "sendback"` plate event)
plus a stack of dirties; exits at x −9.6, returns empty to standby. Queues
a second run if send-backs overlap. `s.phase !== "service"` or reduced
motion parks him hidden; pause freezes the route.

Porter portrait: new cast-gilliam card `PORTER — POT WASH` (custom
band-biopic-grain style, 10 Recraft credits) → masked head+cap crop
`assets/recraft/playable/porter.webp`, PORTRAITS spec index 4
(bounds [620,270,1070,770], height .55).

QA on the prod preview: two send-backs triggered the full loop —
standby → walk to pass → grab dip → haul left with the tub visible →
exit → return empty → standby. Zero `__propErrors`.

### Watch items — resolved in whole-room pass
- Tub socket: close-up captures show the ivory plates reading INSIDE the
  grey tub under his wrapped arms — not floating on the rim. Resolved.
- Commis carry yaw + apron: close capture of the full carry shows the
  tray level at chest, apron panels clean against the legs, no
  pass-counter clipping on route z 3.05. Resolved.
- Porter standby at −3.3 edge-crops like the commis at +3.3 — confirmed
  intentional symmetry; both remain readable at frame edges.
- Real-body walkouts exercised in the wild: a collapse run walked all
  three cooks; Dimitri's station FIRE renders flame cones while he
  works; no apron tearing observed on the un-reweighted rigs.
- Performance: 60fps (vsync) during full service with all five bodies,
  porter+commis audio calls live. Zero `__propErrors` across all runs.

## Audio — runner spatial pass (night-1 build)

The synth SFX engine (`src/game/sound.ts`, zero assets) gains three cues
and the runners now speak while they move:

- `step` — soft sole-on-tile tap, fired per stride inside each runner's
  `useFrame` route state. Pan rides the body's live x (`x/8` clamped), so
  the stereo field sweeps with the walk: commis right side, porter left.
- `clatter` — crockery grabbed in a hurry. Commis: tray lift at the pass
  (pan +0.125). Porter: mid-bend at grab t≈0.45 when the tub leaves the
  ground, plus a quiet tub-shift clink every third haul stride.
- `splash` — the porter's wash-up dump as he exits frame left (pan −0.85).

Verdict/handoff coverage already existed and stays: plate-on-pass `bell`,
send-back `rip`, re-call `print`, smash `shatter`, walkout and critic
stings. Service beds (three panned sizzles, murmur, drone) unchanged.

NOT LISTENED TO BY A PERSON — levels are meter-conservative (steps ≤ 0.85,
clatter ≤ 0.8) but nobody has heard the mix yet. If steps grate, drop
vol first, then lengthen stride intervals.

Verified: `tsc` clean, 59 tests, prod build boots; send-back ran the
porter loop with the new cues live and zero `__propErrors` — audio calls
fire inside the proven phase machines only (no new re-render paths).

## Next phase — living kitchen plan

Owner feedback of 23 Nov: bodies and movement improved, but the room still
reads static — needs constant Hell's Kitchen bustle, a visible emotional
gauge, and narrative investment (marquee introductions, unfolding
relationships). Plan written as `docs/living-kitchen-plan.md`, now v4.1
(owner's v4 added a three-developer Phase A split, reviewed and
folded back the same day): re-grounded in the verified state — all five
rigged bodies live, Meshy cap extended for the 30-cr prep-motion job,
grill already real equipment, dining guests already have idle life.
Staged A–C: (A) idle content + living equipment + mood system
(Cook.mood field, station-top glyph, whole-brigade scream spike) +
no-empty pacing floor + audio floor — no spend; (B) true prep motions
(approved), Recraft scene stills, beat voice lines — each a separate
approved job; (C) nine-night beat script + kitchen-book confessional
cards — free, fact-gated. Lanes: Dev 1 bodies/motion, Dev 2
room/equipment/dining (mounts the glyph), Dev 3 state/mood/sound
(day-one contracts). Staged per-lane frame-budget gates. Open
decisions: mood words, floor count, confessionals-first. Awaiting
owner's go on Phase A.

## Dev 3 (state / mood / sound lane) — 23 Nov, landing pending merge

Per the living-kitchen plan v4.1 three-dev split. Committed on `main`:

- **Mood system live in the tick.** `deriveMood(cook, spikes)` runs per
  cook per tick → transient `Cook.mood` (CALM/FOCUSED/STRAINED/ANGRY/EDGE).
  Spikes are timestamps on `Cook.spikes` — smash→anger (the cook's plate),
  fire→panic, praise/keepsake saves→relief, scream→strain on the whole
  brigade — decaying over 45 s service time, reset nightly, stripped
  from the career save.
- **One language everywhere.** HUD words now read `Cook.mood`
  (sharp→focused, tired→strained, dangerous→angry, feral→edge,
  "walked out" kept as status). `MoodGlyph.tsx` shipped for Dev 2 to
  mount at each station top (ink word via signTexture, colour-coded,
  fades on change, hidden for CALM). Barks gate on mood: ANGRY cooks
  get barked AT (grudge pool), EDGE get the fatigue pool.
- **Pacing floor** — a no-empty guard: work-bearing tickets
  (rail+plating only — ready/pass are already cooked) below 2 mid-
  service caps `nextTicketIn` at 1.2 s. Opening and last-40 s excluded;
  it spawns pending tickets only, calling stays the player's verb.
- **Audio floor** — new `simmer` bed: a low bubbling rumble under the
  whole service, swelling with rail load and sauce-station work. The
  idle-beat one-shots (knife/chop/boardTap) stay contracted to Dev 1's
  loop. NOT LISTENED TO by a person yet — level is conservative
  (0.09 × level through the master bus).
- **Tests: 78 passing** (+19) — all five moods, spike priority and
  45 s decay, grudge/trauma inputs, scream→brigade strain, fire→EDGE,
  floor counting (ready/pass excluded), opening/finale exclusion,
  pause/resume.
- **Frame gate:** production bundle held 60 fps through boot and
  service-open with the mood tick and simmer bed live.

Not Dev 3's: MoodGlyph stays unmounted until Dev 2 places it; the
kitchen-book badge is still pending; bark-gating uses last-tick mood
(barks compute before the cooks map — one frame stale, irrelevant at
a 16–30 s cadence).

## Dev 1 (bodies / motion lane) — 23 Nov, on `main`

Per the living-kitchen plan v4.1. The guns no longer freeze the room.

- **Idle prep loops, cut from the pilot's own Work clip.** The pilots ship
  no idle clip, so each cook's idle is a *neutral window* of the clip they
  already own, played at 0.72–0.82 tempo, staggered per body and phase
  (0.94–1.06 tempo jitter per loop) and **seam-blended**: the window's
  opening is slerped onto its own ending, so the pose at t=0 is the pose at
  t=duration and the wrap cannot pop. Which window is not a guess —
  `assets/meshy/probe-idle-windows.mjs` measures every candidate on the
  shipped GLB (seam distance, motion inside, distance from the mean pose,
  and forward hand reach via forward kinematics) and rejects any window that
  contains the work clip's presenting reach. Chosen: Petra 3.8+2.0 s and
  1.2+2.0 s of `PetraWork`; Dimitri 1.3+1.4 s and 0.8+1.2 s of `Work`;
  Anwar 0.7+1.2 s and 0.2+1.6 s. Variants alternate per loop, a straining
  cook drifts to the slower window.
- **The room moves while the clock waits on the player.** The service clock
  stops dead in the opening hold (it only advances while something cooks) —
  which is exactly the "no-one is doing anything whilst we decide" complaint.
  Animation now falls back to frame time whenever the service clock is
  stalled. Presentation only: nothing in the simulation reads it.
- **Idle beats fire from the loop.** Petra's knife/board taps and the
  sauce/pastry board taps land on loop fractions, panned by station, on ~3
  loops in 4 (a metronome is the same failure as a frozen pose), at 0.4–0.6
  of Dev 3's published levels — meter-conservative, nobody has listened yet.
- **Food follows the work.** The fillet rides the tongs only while she is
  plating; between tickets it settles into the pan (0.16 s blend, a short
  arc, never a float or a detach) and comes back up on the next ticket.
- **The body carries the mood.** `Cook.mood` sets additive Spine1/Spine2
  offsets (slump / brace / tremble), breathing rate and depth, idle and
  work tempo, and EDGE's hand-on-hip. Measured on the real skeleton
  (`assets/meshy/probe-mood-pose.mjs`, which imports the game's own pose
  table): STRAINED puts the head 5.5–7.5 cm lower and 6.6–7.1 cm forward,
  ANGRY 5.0–7.4 cm higher and back, and ANGRY vs EDGE differ by 5.8–6.8 cm
  at the chest with EDGE adding a 6.5 Hz tremble. Reduced motion drops every
  offset.
- **Runners.** Commis and porter get procedural standby sway (weight shift,
  shoulder settle) plus one *event-driven* job: every third delivery the
  commis comes back carrying a clean-plate stack from the wash-up instead of
  returning empty. No time-based second loop.
- **Fallback parity.** The illustrated bodies run a low-amplitude prep read
  of their station gesture when nothing is plating, keep the same idle
  beats, and take the same slump/brace offsets — a failed GLB no longer
  freezes a station into silence.

Tests: **97 passing** (+19 in `src/scene/idleLoops.test.ts`) — two variants
per station, windows inside their source clip, tempo never above 1, beats
in order and conservative, the wrap is continuous and quaternions stay unit
length through the blend, deterministic phase/tempo/variant, the straining
cook drifts to the slower window, beats never fire on a paused or backwards
step, ANGRY and EDGE never share a silhouette, the wrap is no larger than an
ordinary frame inside the loop, and work tempo bounded so a ticket's
performance always completes. `tsc --noEmit` clean, `npm run build`
clean.

Frame gate (Dev 1 slice), same camera, 120-frame captures through
`__miseReadOnly.capture`, Apple M3 / ANGLE Metal:

| idle loops | p50 | p95 | max | submit CPU | calls | tris |
| --- | --- | --- | --- | --- | --- | --- |
| OFF (reduced motion) | 16.7 ms | 17.7 ms | 17.8 ms | 2.15 ms | 422 | 130.6 k |
| ON | 16.7 ms | 17.6 ms | 17.9 ms | 2.44 ms | 436 | 161.4 k |

Both hold 60 Hz. Honest caveat: the OFF run also hides the two runners
(reduced motion returns null for them), so ~14 calls and ~31 k triangles of
that delta are the runners, not the loops; the loops' own marginal cost is
below the noise of this measurement. Zero `__propErrors` in every run.

### Loop seam, measured over 30 s

The plan asked for a 30 s loop with no pop. Eyeballing a screencast is not
an instrument — a VP8 capture drops and duplicates frames, so its per-frame
pixel diffs show catch-up spikes that are the encoder, not the body (0.00
diff frames sit directly next to doubled ones). The seam is therefore
measured on the clips themselves, in `assets/meshy/probe-loop-seam.mjs`:
each window is rebuilt from the shipped GLB at 30 fps, cut with the real
`AnimationUtils.subclip` and the game's own `wrapBlend`, then played 30 s at
60 Hz. The step across the wrap is compared to the distribution of steps
inside the loop, and the untouched source clip is measured the same way as a
control.

| cook | window | loop | median step | p99 | max inside | seam step | seam/max | source max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Petra | `Idle0a` | 1.933 s | 0.035 | 0.071 | 0.071 | 0.0025 | 0.035 | 0.069 |
| Petra | `Idle0b` | 1.967 s | 0.018 | 0.052 | 0.052 | 0.0024 | 0.045 | 0.069 |
| Dimitri | `Idle1a` | 1.367 s | 0.076 | 0.209 | 0.209 | 0.0028 | 0.013 | 0.406 |
| Dimitri | `Idle1b` | 1.167 s | 0.094 | 0.209 | 0.209 | 0.0025 | 0.012 | 0.406 |
| Anwar | `Idle2a` | 1.167 s | 0.096 | 0.311 | 0.311 | 0.0024 | 0.008 | 1.157 |
| Anwar | `Idle2b` | 1.567 s | 0.120 | 0.311 | 0.311 | 0.0024 | 0.008 | 1.157 |

6/6 windows: the wrap step is 0.8–4.5% of the largest ordinary step inside the
loop, so the wrap is quieter than the loop's own fastest gesture, not an
event. The largest in-loop steps are the same bones the source clip spikes on
(`RightForeArm` / `RightHand`) and are smaller than the source's own maximum,
i.e. the windows avoid the actor's fastest beats rather than manufacturing
them. The switch between the two windows is not a pop surface either: it is a
0.28 s crossfade that resumes the loop where it actually is. A vitest case now
holds the property (`makes the wrap an ordinary frame, not an event`), so it
cannot regress quietly. A 30 s capture and its contact sheet are kept as the
human-viewable pair (`dev1-idle-loop-30s.webm`,
`dev1-idle-loop-contact-sheet.png`) — all three bodies change pose across the
30 s and nobody freezes — but the numbers above, not the video, are the proof.

### Idle vs plating, read blind

One paused frame with Petra on a live plating ticket and Dimitri and Anwar on
tickets still at the rail; both crops at the same camera, 4×, unlabelled in
`dev1-idle-vs-plating-ab.png` and keyed in `dev1-idle-vs-plating-key.png`.

**Result: not distinguishable.** Petra idling and Petra plating both read as
"working at the board" — hands on the pan, head down, same silhouette; only
the ticket card separates them. That is the direct consequence of cutting the
idle from a neutral stretch of each cook's own work performance, and it is the
right side of the plan's own reframe: the floor's job is non-emptiness, and
nothing on the floor looks idle. What it does mean is that posture cannot be
the glanceable "who is busy" signal — that read comes from the ticket, the
carried plate and Dev 2's mood glyph. If the owner wants posture to carry it
too, the change is a distinct resting shape (stand taller, hand off the pan,
an occasional head-up scan of the rail) — a follow-up, not a fix.

## Dev 2 (room / equipment / dining lane) — 23 Nov, landed `ba847fd`

Per the living-kitchen plan v4.1. Committed on `main`:

- **Equipment is live and state-aware.** Grill: extraction hood +
  chimney, gas pilot under the skillet, static painted shimmer (zero
  per-frame material writes, hidden outside service). Sauce: bain-marie
  with two sauce wells + ladle + second pot, steam level driven by
  cheap boolean selectors (plating / overloadT>4 / walkedOut). Pastry:
  tart rack, working scale, bench flour; the oven stands in the right
  gap and its door glow lerps up while a soufflé is actually plating.
- **Flanks dressed.** Stockpot in the left gap — its lid rattles on
  fresh plating tickets (real fire calls, `rattle` sfx, Set-mutation
  scan: no per-frame alloc). Wash-up corner at (-6, -4.3) with WASH-UP
  sign — placed there, not at the porter's literal exit x -9.6, because
  the menu camera's lateral cut at that depth is ~±8 m and the exit is
  off-frame. Crates on the right flank, floor flour trailing from
  Anwar's bench.
- **Steam budget: 10 of 12 sprites** — *corrected: the counts are right, the
  unit was wrong. A sprite is one draw each, and the pass-side plume carried
  its 15 puffs in one merged mesh, so the room was 25 puffs and 11 draws
  against a cap written as 12 sprites. The cap is now in draws and enforced by
  `src/scene/steamBudget.ts` + its test; the room is 1 draw. See "Steam,
  consolidated" below.* Pooled fixed counts per field
  (bain-marie 4 · stockpot 4 · oven vent 2), unmounts outside service
  and under reduced motion. All ambient glow is emissive-only — zero
  dynamic lights added.
- **MoodGlyph mounted** once per cook at `[STATION_X[i], 2.35, -2.9]` —
  at Stations level, never inside Station, so Petra's two render paths
  (skipPetra / Suspense fallback) can't double-mount and squashed
  stations don't take the gauge down with the bench. Verified live:
  STRAINED·EDGE·STRAINED observed over all three stations in service.
- **Pair tables got their second body.** Couple and regulars guests
  render a companion figure with its own idle drift; beats ride the
  guest's real `tellAt` clock. The couple beat is classified from the
  freshest `Table {T}` line in the feed (fighting/crying → turn away,
  "made up" → lean in) — `tells % 2` was wrong because COUPLE_FIGHT
  picks randomly. Mara & June lean together on their kindness beat.
  Salt pass: the companion's reach arm extends across the table on a
  slow per-table cycle, shaker in hand. Delivery lean-in rides
  `lastDelivery` — hardest at the table it lands on (0.24 vs 0.09 rad).
- **Verification:** tsc clean, 96 tests green, production build 26 MB.
  Frame capture on dev (600 frames mid-service, everything live):
  p50 16.7 ms, p90 17.6 ms, p99 19.2 ms, one 30 ms spike, zero long
  tasks, 562 draw calls. `__propErrors` empty. Reduced-motion emulation
  keeps the room still and the glyphs readable.

Not Dev 2's: the porter's off-frame exit is a camera-framing note for
whoever next touches the room edges; the oven glow writes one uniform
per frame (deliberate — it lerps); the couple's suppressed-finale
beats still gesture (tellAt updates even when the line is culled —
accepted, reads as silent tension).

## Phase A landing — 23 Nov

All three lanes are committed on `main` and pushed, and the day-one contract
held: the mood type, `Cook.mood` and the idle SFX names landed before any lane
wrote a line, and nothing was rewritten underneath. Order on `main`:
contract `932c45d` → Dev 3 `5c6f1b0` → Dev 2 `ba847fd` + devlog `3ced55d`
→ Dev 1 `c03dafe` → cross-lane review fixes `72805bb` (pause-gated ambient
equipment, fresh-cook barks, and the seam probe) → QA media `7ff77ca`.

- **Dev 3** — mood derived per tick into `Cook.mood`, spike bookkeeping with
  45 s decay, mood-gated barks, the no-empty pacing floor, the simmer bed.
- **Dev 2** — state-aware equipment (grill/sauce/pastry), flanks dressed,
  10 of 12 steam sprites, emissive-only glow, MoodGlyph mounted once per
  station, pair tables given second bodies.
- **Dev 1** — idle prep loops that loop silently (measured above), fillet
  parked while not plating, the room moving while the clock waits on the
  player, mood carried by the skeleton, standby sway for the runners.

Suites: `tsc --noEmit` clean, 97 tests green across the repo, `npm run
build` clean (10.8 s, 1.45 MB app chunk), 60 Hz held on the Dev 1 and Dev 2
frame gates.

Two notes on that tail, because the order there matters more than the labels:
the review pass carried Dev 1's seam probe in with it, so the instrument
landed before its numbers did (they are above); and the QA-media commit
captured the idle film from a capture that was still being written, so the
file in it is 2.3 s and cut short — the full 30 s capture replaces it here.

Still waiting on a person: the audio floor and the idle-beat levels have
never been listened to (both are meter-conservative on purpose), the
idle-vs-plating read above was run by one reader, and the scream→strain
offset has not been reproduced through the real input path.

## Phase A deploy — 23 Nov

One batched deploy, the day's last slot (1 of 5 remaining before it).
Deployed from the repo root with `opengame deploy . --wait`; state `ready`,
done. Release `08a46d2d-7544-470e-9f0c-c8ebb513b3a8` on game `9i7mjkmdx4`.

- Preview: https://opengame.io/g/9i7mjkmdx4?preview=08a46d2d-7544-470e-9f0c-c8ebb513b3a8
- Deploy page: https://opengame.io/settings/deployments/55d9b5b5-80b5-4721-bd0e-fc15ca128752

Findings: one heuristic `missing-ref` for three draco decoder files —
verified a false positive before shipping it: the decoder path is registered
unconditionally but no shipped GLB requires draco (checked
`extensionsRequired`/`extensionsUsed` on all eight), and the registered path
is the gstatic CDN, which is also why `www.gstatic.com` appears in the
external-hosts notice. Nothing to fix.

Merged-scene frame gate before the deploy: 60.1 fps avg through live
service on the production build, worst frame 27.9 ms; canvas frozen under
pause (the review-pass gate held).

Review playtested it and it auto-published — `SUB-2072`, state `published`,
listed, Game Jam #1 entry under Simulation & management + the elevenlabs /
fal / meshy sponsor tracks. **Live: https://opengame.io/g/9i7mjkmdx4**

The person-checks above are now checkable *on the live build itself* — the
simmer bed, the beat levels, and the room's read are all up there.

## The watch — the resting silhouette the blind A/B asked for — 23 Nov

The blind read's own recommendation landed: every few idle loops a cook now
stands the **watch** — crossfades to the Ready pose (tall, hands off the
bench) with the runners' standby sway, a slow head-up scan of the rail and
normal breathing, then returns to the same window where it left it. It lives
inside the idle drive (`d.watching`, fires only on a loop wrap at
`WATCH_P = 0.22`, deterministic per cook+loop, pauses freeze it rather than
burn it down), so the bench windows and the plating read stay untouched.
The illustrated fallback gets parity via `watchAmt`: arms come off the
bench, torso straightens, same scan.

Verified on the production build: frame strip
(`watch-state-strip.png`) catches Petra tall-and-scanning two frames running
then back at the bench — the two silhouettes are unmistakable at the game
camera, which was the whole point. 23 tests cover the drive contract (wrap-
only entry, beat suppression, resume-in-place, pause-freeze, determinism).
**101 tests, tsc clean.** What still needs eyes: whether `WATCH_LEN` (3–4.6 s)
and the pitch of the scan feel right — a person watch, same as the rest.

## Phase B prep-motion job — DONE on the second account — 23 Nov

Earlier attempt blocked: the first account held 300 cr but the plan gated
task creation (402 "task creation on the free plan is no longer
supported"). The owner connected a different account in the Ego browser;
a `devin-mcp` API key was minted in its developer console, the user-level
MCP config was repointed, and the job ran over the REST API (the MCP stdio
bridge needed a session restart to see the new server — REST needed none).

- 3 tasks, prime mode, 6 s each — Petra brush-the-grill/inspect, Dimitri
  dip-and-taste, Anwar ramekin-tap/dough-roll. 30 cr total (1115 → 1085).
  Task ids + prompts in `assets/meshy/motion/provenance.json`.
- The motion FBX ships an **SMPLH** skeleton (Pelvis/L_Hip/... in cm, ~16
  duplicate hierarchies per file), not mixamorig. No rig task ids survive
  from the old account, so `meshy_animate` server-side retarget was not
  available; `assets/meshy/retarget-motion.mjs` does the transfer locally:
  world-rotation delta per mapped bone (both rigs share the same T-pose
  bind — verified in `rest-audit.mjs`), hips position scaled by standing
  hip ratio with the delta referenced to clip frame 0, because the FBX
  bind pelvis offset is broken. `SkeletonUtils.retargetClip` was tried
  first and produced wrong-space output on this skeleton set.
- `bake-prep-clip.mjs` writes each retargeted clip into its runtime GLB as
  a fifth animation (`PetraPrep`/`DimitriPrep`/`AnwarPrep`, +205 KB each).
- `idleLoops.ts`: each prep clip is a third idle variant (`Prep0/1/2`,
  ~1 loop in 3, one conservative beat each until ears tune them).
  `probe-loop-seam.mjs` measures the real GLBs: **9/9 windows loop
  without a pop**, Prep seams at 0.8–0.9% of the largest in-loop step.
- One `bake-prep-clip` bug mattered: accessor indices were written
  relative to the appended block, not the file — fixed by offsetting
  sampler refs by the accessor base. The seam probe caught it as NaN.

Balance afterwards: 1,085 cr. Tools left in `assets/meshy/`:
`inspect-motion.mjs`, `rest-audit.mjs`, `motion-audit.mjs`,
`retarget-motion.mjs`, `bake-prep-clip.mjs`, `verify-retarget.mjs`.


## Voice bake — fal Kokoro chorus (23 Nov)

ElevenLabs key never arrived; the approved fallback went through fal
(sponsor track doubles). `assets/voice/bake.mjs` generates the five
`BRIGADE_RESPONSES` chorus lines through `fal-ai/kokoro/american-english`
(Petra=af_bella, Dimitri=am_fenrir, Anwar=am_puck), mixes the ensemble
takes with staggered offsets via ffmpeg → `public/voice/chorus-*.mp3`
(~62 KB total, ~$0.01 spend). `speakChorus` now plays the baked take for
its line and falls back to the platform synth on any error — the review
read-out stays on synth since its text is dynamic. Verified: file plays
in-page post-gesture (autoplay policy), stems kept in
`assets/voice/stems/` for per-cook bark reuse.


## Dev 1 — the pass gap and the still room (23 Nov, feedback round)

Owner's note, in their words: the three cooks *"feel very far away
(unnecessary gap between the pass and us)"*, and *"all the chefs behind them
are completely static (sous chefs, cleaners, washers etc)"* — a hive expected
during service. Two separate faults; both were measured before anything moved.

### What the frame actually contained

FP service camera was eye `(0, 1.74, 3.6)`, `FOV_FP` 66, 900×520 frame. A
cook is 2.30–2.40 m tall on a 5.4 m-deep floor:

| | before | after |
|---|---|---|
| camera z | 3.60 | 3.00 |
| station line (counters / cooks) | −3.20 / −3.95 | −1.60 / −2.35 |
| pass counter z (top spans) | 2.20 (1.75…2.65) | 1.15 (0.60…1.70) |
| cook distance | 7.55 m | **5.35 m** |
| cook, full body on screen | 94 px (18% of frame) | **172 px (33%)** |
| cook visible above his counter | 48 px | **106 px** |
| bare floor between pass and line | 93 px | **0 px in the centre** |

The "sous chefs, cleaners, washers" were not kitchen staff at all: no such
entities existed. What sat behind the line was the **dining-room guest row** —
five seated bodies at x −4…+4, z −6.6…−7.3, heads projecting to y ≈ 231 against
the cooks' 233, i.e. a second brigade standing level with the first. Their idle
was ±0.12 rad of torso yaw: at 10.4 m the frame spends ~0.0023 rad/px, so the
*whole* gesture was **1.6 px**. A still row of bodies, 1.6 px of motion, level
heads — a staff.

### The restage (contract constants)

`artDirection.ts` now owns both numbers and everything on the line rides one
group, so this cannot be half-applied again:

- `LINE_SHIFT = 1.6` — `<group name="line" position={[0, 0, LINE_SHIFT]}>` in
  `KitchenScene` wraps stations, cooks, plates and line equipment. The room, the
  back bar, the pass window and the dining room stay put; that difference *is*
  the back-of-house strip the background crew lives in.
- `PASS_Z = 1.15` — the pass counter is its own edge of the room (it takes
  `position={[0,0,PASS_Z]}` internally), so the gap closes from both ends.
  `Cloche`, `RailDockets` (`HANG_Z`), the smashed-shard origin and the
  platestack prop all read `PASS_Z`.
- The pot-wash bay cancels the shift (`<group position={[0,0,-LINE_SHIFT]}>`) —
  it is the wash-up corner, not the line.
- `FirstPerson`: `STAND_Z` 3.6 → 3.0, inspect z 4.3 → 3.7, focus/lookAt read
  `-3.64 + LINE_SHIFT`.

**Bug caught while doing it, worth recording:** restructuring the scene dropped
`<PassCounter />` from the mount entirely. The build then had no pass counter at
all — the bottom third of the FP frame was bare floor, which reads as *more*
distance, not less. Fixed by mounting it outside the line group. The lesson is
the one this repo keeps re-learning: a staging change is not verified until
something raycasts the frame and names what is drawn there.

### The instruments (DEV only, `Telemetry.tsx`)

Eyeballing a 900-px frame is how the 93-px gap survived. Three read-only
diagnostics join `act()`:

- `__miseReadOnly.probe([[x,y,z], …])` → CSS pixel, depth and in-frustum flag for
  each world point through the **live** camera.
- `__miseReadOnly.pick(x, y)` → what is *actually drawn* at that pixel: up to six
  nearest hits, named by their scene path with world position and distance.
- `__miseReadOnly.eye()` → camera position and world direction.

`probe` answers "where is it", `pick` answers "is it visible or is that the
counter". Both are gone from production builds.

### The rest of the brigade (`BackgroundCrew.tsx`, new)

Four procedural bodies, no GLB, no spend. Where they stand was not chosen by
eye: for each candidate spot a 3×6 grid of points up the body (0.55–1.55 m) was
projected and raycast **through the live scene**, and only spots where nothing
sat between camera and body were kept. The three station centres score ~11%
(the cooks block them, correctly); the two gaps and two flanks score 83–100%.

| body | at | facing | cycle | work |
|---|---|---|---|---|
| pot-wash | (−6.0, −3.55) | back to room, hands in the basin | 2.6 s | scrub, torso pumping |
| porter | (−2.6, −4.2) | profile | 5.1 s | carrying a pan stack, weight shift, stack lagging a beat |
| stocker | (3.3, −3.55) | back to room | 3.4 s | reach to the back-bar shelf, set down, straighten |
| crate corner | (6.05, −3.25) | three-quarter | 7.3 s | stoop, lift, hold, set down |

Rules that are not style: amplitude 0.15–0.45 m (an 8-px floor at these
distances), **coprime periods** with a hashed start phase per body (a room
breathing in unison is more obviously fake than a still one), and their own
clock — they advance on frame delta, freeze with a pause and under reduced
motion, and never jump on resume. They read the game for nothing.

Runners were in the wrong place too: commis and porter ran at `ROUTE_Z = 3.05`,
behind the player and mostly out of frame. They now take a per-phase lane —
`idle/toPickup/back` −3.3, `lift|grab` −0.55, `out|through` −1.35 — with a
damped z transition (`1 − exp(−5·dt)`), so their traffic crosses the visible
middle ground between line and pass.

### Guests — motion only, and why the row still reads

Fixed only the part that is motion (this lane's), not the part that is
furniture: idle rotations ×2.5–3.3, the sip deepened (0.14 → 0.30 rad) and each
body given its own seat height (0, −0.30, +0.06, −0.34, −0.12) so five level
heads stop forming a line. At 10.4 m that is still only ~3–4 px of head travel
from an idle, and the honest verdict is that **the row still reads as a row**
from the pass. Making it read as a dining room needs tables in the window and
varied silhouettes (some standing at the bar, some leaning in), which is Dev 2's
`DiningRoom` furniture, not body motion. Flagged, not claimed.

### Verified / not verified

Machine-checked: `tsc --noEmit` clean; **101 tests** green; `npm run build`
clean; 180-frame capture with 0 long tasks, mean interval 17.56 ms, p95 33.3 ms,
637 draw calls, 169k triangles, `__propErrors` empty; the pass counter confirmed
by `pick` at (450, 450) hitting the counter top before the floor.

The crew's motion was measured off two real frames 1.2 s apart, as changed
pixels inside each body's box: pot-wash **23%**, porter **24%**, stocker **21%**,
centre cook 35% (control), crate corner 7% (its cycle is deliberately the
slowest). Against the guests' pre-fix 1.6 px per gesture, that is the difference
between "still" and "working".

An earlier draft of this section claimed the four bodies were proved visible by
`pick` returning their own geometry as the first hit at the head pixel. That is
**not** what the instrument shows, and the claim was wrong: at several of those
pixels a raycast returns six hits with `NaN` distance and `NaN` intersection
points, from objects whose world matrices are broken (below). The raycast cannot
be trusted on this scene until they are fixed; the honest evidence for the crew
is the frame crops and the 1.2 s pixel diff, not the pick.

### Found while measuring: six objects with NaN world matrices

`__miseReadOnly.bad()` walks the live scene for non-finite matrix elements:

```
Scene/line/Group/Group/Group/Mesh (CylinderGeometry)          x4
Scene/line/PetraWorkspace/Group/Group/Mesh (CylinderGeometry) x2
```

Six cylinders on the line — station pans or their contents — carry a NaN in
their transform. They do not visibly draw (which is why nobody has caught them),
but they poison every raycast through those pixels and they are the kind of
thing that becomes a black artefact on someone else's GPU. Not diagnosed at the
time of writing: it is station/cook geometry (Dev 2/3), the trace is in `bad()`,
and the tool is committed so whoever owns it can find it in one call.

**Resolved in `ed9cf7f`.** The source was not a shipped-play bug: the falling
pans' transform is written from `serviceTime - walkoutAt`, and a staging patch
that fed back the trimmed object `snapshot()` prints had stripped `walkoutAt`,
so `serviceTime - undefined` was `NaN` and failed both the `p < 0` and the
`p > 4.5` guards on its way into six matrices. The fix is a finite guard on the
write (`!(c.walkoutAt >= 0)` and `!Number.isFinite(p)`) *and* a staging
instrument that cannot strip a field again — `act()` now merges entity arrays
per index rather than replacing them. `bad()` and `badRoots()` are empty on the
live frame.

Not machine-checkable and **not yet done**: nobody has stood at the screen and
said "this feels like a hive". The crew is four bodies, not a dozen; the pass
counter now fills the bottom third of the FP frame, which is a real change to the
player's read of "where I am"; and the dining row is still a row.

## Dev 1 — the hive, measured (23 Nov, second feedback round)

The note: the three cooks still feel far away, and *everyone behind them is
completely static* — sous chefs, cleaners, washers — while one expects a hive
during service. Two complaints, and the second one is the one with teeth,
because a still room is not a tuning problem.

### What the frame actually contains, measured

`pick` reports the frontmost hit at any pixel with its distance and its
ancestor chain, so the frame can be *read* rather than eyeballed. Walking
x = 640 down the whole height of the live first-person service frame:

| screen y | distance | what |
| --- | --- | --- |
| 0–48 | — | **nothing at all** (scene clear colour) |
| 56–152 | 8.4–8.9 | pale tiled wall above the arch |
| 168–296 | **2.0** | the feed card, a 1.2 m plane floating 2 m from the eye |
| 312–344 | 5.2 | centre cook |
| 360–376 | 4.2–4.9 | station counter / line |
| 392–440 | 0.8–0.9 | pass counter top and face |
| 456–568 | 1.5–1.6 | HUD |

Three facts fall out of that table, and all three are design, not code:

1. **The top quarter of the frame carries no information.** y 46–200 is a flat,
   evenly lit tile wall. 27% of the picture is doing nothing, and that single
   fact does more to make the room feel like a set than the distance to the
   cooks ever did.
2. **The middle of the arch is covered by a UI plane.** The feed card sits
   2.0 m from the eye, 1.19 m wide, spanning screen x 510–775 and y 165–300 —
   exactly the band where the pass, the arch and the room beyond all live. Any
   hive built in the centre of this frame is drawn *behind a piece of HUD*.
   It is `SpeechBubble`'s marquee (Dev 3's). Not moved here — flagged, with the
   numbers, because it is the largest single block on the composition and it is
   one anchor decision away from being fixed.
3. **The strip where the crew stands is ~62 px tall.** The counters hide the
   lane below y ≈ 0.70 (ray from the eye over the counter's back edge), so a
   figure at 8 m is a head and shoulders over a counter. Any gesture down there
   is confined to 62 px of screen.

### The rule that came out of it

At 8 m, 1 m is 66 px and 0.0022 rad is one pixel. So:

* an arm swing of 0.15 m is **under 8 px** and reads as nothing;
* a head tilt of 0.3 rad on a 0.125 m head is **~2 px**;
* one body crossing the strip is **500+ px** of change.

So the answer to "it is static" is not more amplitude on small joints. It is
**transit** — bodies that arrive on one side of the frame and leave on the
other — plus **shape that changes** (steam, plates stacking) plus **filling the
empty band** so there is somewhere for the eye to go. Amplitudes were raised
anyway where they were free, but they are the small part of the fix.

### Built

*`BackgroundCrew.tsx` — six people, two of them moving.* Two walkers sweep the
back-strip lane at z −4.58 in opposite directions on 28.3 s and 38.5 s periods
(x is a sine, so they slow, pivot and come back; step phase comes from distance
covered so the gait does not slide). The lane was picked by raycast sampling,
not by eye: at head height **24 of 33 points across the strip have nothing in
front of them**, so a walker surfaces in the gaps between the three cooks and
disappears behind the counters — the occlusions are the reason it reads as a
room and not a sticker. Feet are omitted because the counters hide the lane
below y 0.70. Each standing body got its own `Look` (height, build, four
colours, cap/bun/crop/bandana, rolled sleeves): shape reads as people, colour
reads as a palette. Every body's static mass is one merged vertex-coloured
geometry; nothing in the crew casts a shadow.

*`Steam.tsx` — the room is hot.* Four emitters (range, sauce, pastry, pot-wash),
15 puffs, **one draw call**: every puff is a quad in one merged geometry whose
positions and per-vertex alpha are rewritten per frame on the CPU (60 vertices
— less work than one collider). Alpha rides the fourth component of the colour
attribute, so one `MeshBasicMaterial` fades each puff individually with no
material clone and no shader. Heat is read per station from the same numbers the
sound bed sizzles on, so plume and noise are one event; a burning station turns
its plume dusty grey.

Two measurements shaped it and both killed a first draft:

* A photographic radial gradient was **invisible**. Two frames 1.2 s apart
  changed the plume band by a mean of 6/255 while a control patch of bare wall
  changed by 0.56 — real motion, no read. Pale flat-lit rooms eat soft white
  fog. The puff is now drawn the way this room is drawn: cream lobes with a
  defined rim.
* Burnt steam at a 168,162,154 grey over the cream rail reads as a **coffee
  stain**. The burn tint is capped at 200,193,181-ish and stops at 0.8.

*`HangingPans.tsx` — the empty band.* Seven copper and steel pans on a rail
above the arch, three sizes, unevenly spaced, hung slightly out of level; one
merged geometry each plus one for the rail and its brackets: **eight draws**.
A rock travels down the bar when a plate leaves the pass — one number off the
store, and the room flinches with you.

*`KitchenScene.tsx` — pass plates were behind the camera.* At-pass plates were
still positioned at the counter's old z (2.2) while the counter moved to
`PASS_Z` (1.15), and they ride the line group, which adds `LINE_SHIFT` (+1.6):
a plate waiting on the pass sat at z 3.8, 0.8 m *behind* the eye at z 3.
`pick` on the pass top now finds a plate where the eye says it is.

### Motion, measured rather than asserted

Six frames 0.55 s apart, diffed band by band. In the back-strip band
(y 282–356, the six bodies) the changed-pixel count is **30,404 / 36,645 /
39,596 / 39,816 / 40,272** — 32–42% of the band in every half second, spread
across its whole width. Whole-frame change over 1.2 s: **10.7%** of 738,560 px,
against a control patch of bare wall that changes by 0.56/255.

### Steam, consolidated: a budget that is checked

There were two steam systems. Dev 2's `equipment/Steam.tsx` pooled ten
`THREE.Sprite`s on the bain-marie, stockpot and oven vent — **ten draws, one
each, because a sprite is one draw**. The pass-side plume carried fifteen puffs
in one merged quad mesh — **one draw for fifteen**. The documented cap said
"≤ 12 sprites on screen total across ALL equipment", so in the written unit the
room was at 25 against a cap of 12, and in the unit the frame pays it was 11
draws for the same 25. Both numbers were wrong, and the reason is the same in
both cases: the cap was prose in a doc comment and `STEAM_TOTAL` was computed
and then read by nothing. **A budget nothing checks is a wish.**

Now:

* one renderer — every puff in the room, the line's and the equipment's, is a
  quad in one merged geometry, so steam is **1 draw for 25 puffs**;
* one registry — `equipment/Steam.tsx` no longer draws, it *publishes a source*
  and resolves its own world position from its parent's matrix at mount. The
  three station files were not touched at all: their call sites, props and puff
  counts are unchanged, which is what let this cross into another lane's
  furniture without a conflict;
* one gate — `src/scene/steamBudget.ts` is pure JavaScript (no three, no React,
  no DOM), so `steamBudget.test.ts` can assert the caps and the registry
  instead of hoping: **13 tests** over draw cost, the puff cap, slot
  allocation, per-source sanity, world bounds, register/unregister ordering,
  level clamping and the rule that a registry write never mutates the room's
  shared sources.

Measured after: **628 → 618 draw calls** — the ten sprites, exactly — with the
room still carrying 25 puffs in 7 sources (4 line plumes + 3 equipment fields,
verified in the live page by importing the module and reading the registry).

### The bark card was sitting on the room

The feed card in first person hung at y 2.02, 1.08 × 0.54 m, 2 m from the eye —
which put it across **screen x 510–775, y 165–300** of a 1280×577 frame. That is
the pass, the arch and the room beyond, i.e. the three things the player is
looking at and the three things every other lane has been filling. It is
`SpeechBubble`'s marquee.

It now hangs at **y 2.66**, 1.0 × 0.44 m. The vertical FOV is fixed at 66°, so
the top of the frustum at 2 m is y ≈ 3.03 whatever the aspect ratio; the card's
top edge lands at 2.88 and cannot leave frame on a tall window. It occupies the
pale band above the arch instead — the part of the picture with the least in it,
used by the thing that is itself transient.

Verified with `pick` down x = 640 afterwards: the card is the frontmost object
only from y 60 to 140, and from y 180 to 340 the frontmost object at the centre
of the frame is now the range's own steam plume at 4.4 m.

### Ownership taken, recorded

Two mount lines in `KitchenScene.tsx` (Dev 2's file) are mine: `<Steam />` and
`<HangingPans />`. Taken while Dev 2 was mid-pass, because the frame read said
the top quarter of the pass view had nothing in it. Recorded in the plan's
shared-airspace rule as an exception, and both components are self-contained —
moving or deleting the mount lines opens neither file.

### Perf

| | before | after |
| --- | --- | --- |
| draw calls | 637 | **625** |
| triangles | 173.7k | 181.6k |
| mean interval (180 frames) | 16.78 ms | **16.62 ms** |
| p95 | 33.3 ms | **18.1 ms** |
| CPU submission | 3.46 ms | 4.74 ms |
| long tasks | 0 | 0 |

Draw calls *fell* while a steam system, a pan rail and two walkers were added,
because the crew's merge banked more than the new geometry spent.

**Correction, re-measured at `d70715b`:** 628 calls, mean 16.67 ms, p95 17.4,
CPU 3.27 ms. The +1.3 ms I attributed to my eight new `useFrame` callbacks was
mostly not that — it does not reproduce. A single 180-frame sample on a shared
machine is not evidence of a cause, and the number I put in a table an hour
earlier was already wrong.

So the instrument was fixed rather than the sentence. `__miseReadOnly.bench()`
now runs **three capture windows with a gap between them** and reports every
metric as min/median/p95/max plus `spreadMs`, and sets `unstable: true` when the
windows disagree by more than a millisecond — a figure from an unstable run is a
rumour, and the tool says so out loud.

Final numbers, three windows × 90 frames, first-person service, `bench(3, 90)`:

| | value |
| --- | --- |
| interval | min 15.1 · **median 16.6** · p95 17.3 · max 18.2 ms |
| CPU submission | min 2.3 · **median 2.8** · p95 3.2 · max 3.9 ms |
| draw calls | 614–627 (varies with what is plated) |
| window means | 16.65 / 16.66 / 16.67 ms — **spread 0.02 ms, stable** |
| long tasks | 0 |

A 0.02 ms spread across three windows is the first perf figure in this document
I would defend without a footnote.

### Verified / not verified

Machine-checked: `tsc --noEmit` clean, **126 tests** green (101 at this round,
+13 steam budget, +12 since), three-window `bench(3, 90)` with 0 long tasks, the
numbers above, and the lane/band visibility counts.

**Not verified: nobody has judged this at the screen.** The pixel diffs say the
room is now moving; they cannot say it reads as a hive to a person, and the note
that started this came from a person. The dining row is still the weakest thing
in the window: intervals and depths no longer form a grid, but five seated busts
behind barely visible tables still need furniture — a bar, a standing guest, a
booth divider — not more motion.

Both open items are now carried in the plan, under **"Open items from the
feedback rounds"**, with owners — because a finding that lives only in the round
that found it is a fact about the past, and nobody working from the plan reads
the round.

*Superseded since this round: the feed card at 2 m no longer sits on the arch
centre (`823de82`) — the busiest 60 pixels of that frame are clear.*

## Generated beats + morning confessionals (23 Nov, commits 4599526 / 051aa60 / c819e4e)

Two more prime Meshy clips on the second account (**50 cr ledger total**):
a 4.5 s apron-rip **Walkout** (hip travel pinned to frame 0 — the scripted
slide does the exit, Running takes over at 4.2 s) and a 2 s **Flinch**
fired on each new `spikes.strainAt` stamp while a cook idles. Both
retargeted SMPLH→mixamorig and baked into all three runtime GLBs.

Phase C opened: `src/game/beats.ts` renders morning confessionals —
one card per cook per morning, every line gated on a fact the career
log can prove, first matching rule wins. The book auto-opens on unread
mornings, carries a "new entry" badge, and `markBookSeen` persists the
read night. 12 tests pin the fact gates.

Verified: tsc clean, **113 tests** green. Not verified: neither clip has
been *watched* in play — the walkout's station hold and the flinch's
strain-spike trigger both need a human pass, same as the chorus takes
and the simmer bed.

## Motion QA pass — generated clips watched (23 Nov, dev build + `__miseReadOnly.act`)

Walkout and flinch seen live in play, not just baked:

- **Walkout** (`media/phasec/walkout-strip.png`): the clip holds ~2.3 s at
  the station — Petra throws both arms wide (the apron-rip reads), turns,
  hair flying, then strides left as the scripted slide takes over and
  Running blends in at 4.2 s. Reads as a storm-off, not a teleport.
- **Flinch** (`media/phasec/flinch-strip.png`): a `strainAt` stamp fires
  the LoopOnce during idle — Dimitri drops low, arms out, then settles
  back into his window. The idle loop keeps stepping underneath so the
  resume lands mid-gesture, not at frame 0.
- **Confessionals** (`media/phasec/confessionals.png`): three margin-note
  cards in the book — Petra's tongs rule (N1 gate), Dimitri's sauce
  creed, Anwar's appointment. Paper/ink sits right in the book.
- **Prep clips** (`media/phasec/prep-*.png`): station strips over ~16 s
  show clear pose variety — Dimitri's arm-to-mouth beat is plausibly the
  dip-and-taste clip; not semantically confirmed. Human eyes needed on
  one loop of each generated gesture.
- **Dining silhouettes**: five proportion sets + one hat + per-guest
  scale 0.86–1.1; the row no longer reads as five copies.

**Audio metering audit (numbers, not ears):** master 0.22; beds — sizzle
≤0.22 worst case (burning), murmur ≤0.15, drone ≤0.3, simmer ≤0.09
coefficient → ~0.02 effective peak. Beat SFX 0.4–0.6 vol through the pan
bus → ~0.03 peaks. Conservative throughout; the simmer floor may be
*sub-threshold on laptop speakers* — if a listen confirms, raise its
coefficient 0.09 → ~0.15. Still needs a human listen.

**Deploy:** blocked — 0/5 deploys in the rolling 24 h, next slot ~22:39
UTC. This batch (walkout/flinch/confessionals/silhouettes) ships in the
next one.

## Back-row motion — the crossing waiter (Nov 20 late)

Player feedback on the live build: the new backdrop reads, but "the people
right at the back are still motionless." The five guests do animate — but
their motion was tuned to ~3px at 8m (deliberately, to stay under the
candle flicker), which at game distance reads as frozen. The missing read
was a body that moves *through* space, not one that breathes in place.

Fix: `Waiter` in `DiningRoom.tsx` — a dark-vest/white-shirt body (staff,
not brigade whites) that walks the floor behind the seated row on a
ping-pong waypoint path over the five guest x-positions, ~45s loop:
walk legs eased smoothstep, ~20% dwell at each table with a tray-dip
serve pose, bob only while walking, facing into the walk direction.
Render clock, pause-gated, reduced-motion-safe (static pose).

QA: `media/phasec/waiter-a|b.png` — three-band sequence shows it at
centre-right, centre, and far-left across ~10s. 126 tests green, tsc clean.

## Player agency stack (Nov 20 late)

Playtester feedback: "the things the user is able to do are quite limited
e.g. when the game first loads." Honest read: the verb surface was already
wide (15+ keys) but every verb was reactive and half were undiscoverable.
Three fixes, all shipped:

- **Bread service (G)** — new proactive verb: the commis walks a basket to
  the most impatient table (+14 tellClock, 18s cooldown). Reuses the
  `lastDelivery` tray path so it visibly walks out. First *initiating*
  verb — the room answers to you, not only the other way.
- **Expedite (N)** — waves the next order onto the rail early
  (`nextTicketIn → 0`). The trade-off is organic: more rail pressure is
  its own cost, so it needs no artificial price.
- **Verb surfacing** — the hint bar was 3 states; now a priority ladder:
  runner > request > split sauce > plate up (F collects) > plating (F
  fires on the gold) > rail orders (1–9) > bread ready > quiet pass (N
  expedite) > spot the inspector. One hint at a time, always the live one.

QA (`media/phasec/verbs.png`): tutorial cleared → BREAD fed "Bread and
butter on table 10", cooldown countdown on the button; NEXT TICKET fed
"You wave the next order through" and the rail filled to six dockets.
`src/game/verbs.test.ts`: 5 tests — target pick, cooldown, phase gates,
printer pull, rail-cap guard. 131 tests green, tsc + build clean.

## Dining-room cast: the Rodin pipeline, end to end (Nov 25)

The fidelity complaint is closed for the dining room. All seven figures —
five guests, the waiter, the second-row diner — are now Rodin-pipeline
GLBs: generated (Gen-2.5-Low, text-to-3D from the cast prompt sheet),
rigged (52-bone human skeleton, core skinning), decimated to web budget
(0.95–3.2 MB each), and wired into `DiningRoom.tsx` through
`CharacterGLB.tsx`. The capsule bodies stay mounted but hidden, keeping
the hit proxies and per-guest state; only the visible body swapped.

**The pipeline bug worth writing down:** the rigging API's stock-clip
field is `animation_preset`, not `animations`. The wrong field name is
silently ignored — HTTP 201, a successful rig, zero clips. Three rigs
were lost to this before the docs check. `rig-character.mjs` is fixed,
and `batch-cast.mjs` now guards the output (fails loudly if the GLB
carries no animations).

**Motion identity, not a chorus line.** Each guest plays a distinct
base clip (restless jiggle, upright stillness, pointing gesture, slumped
read), and `GuestGLB` crossfades to a per-guest reaction clip while a
tell is live — the same `tellAt`/`tellKind` state the capsule bodies
used. The waiter's waypoint path is unchanged but his body now flips
between the walk clip and standing idle with an edge-detected crossfade
(twice per 45s loop, not per frame); the tray arm and serve-dip logic
are untouched.

**Foundation work that rode along:**
- `CharacterGLB` takes a runtime-switchable `clip` with proper
  crossfade — the primitive every state-driven character needs.
- `scripts/rodin/batch-cast.mjs`: generate → rig → clip-guard →
  optimize → install in one command.
- `scripts/rodin/animation-catalog-human.md`: the live 113-clip human
  catalog, so clip picks reference real IDs.

**Also landed (the C1–C8 critique-response work, committed from the
24 Nov tree):** serviceScore (food/hospitality/brigade stars split with
penalties), nightArc (nine-night contracts + recovery bonuses), ending
(won/broke/legend), the authored night-1 opening (two teaching plates,
inspect → turn → acknowledge before judging), and the score-breakdown
review card. The 8 tests that still asserted the old opening flow were
re-aligned — they now walk the inspect step and expect the authored
overdone second plate (58, the lesson). One real bug fell out:
`developWellington`'s same-night guard made revision impossible after
the first pick; dropped (the contract is revisable within the night,
blocked in service). Suite 182/182, build clean.

**Still open:** visual QA of the new cast (seat heights/rotations are
guest-A's numbers as defaults), then brigade re-rig through Rodin
(Phase 2 — accepts any mesh, contract preserved), then bespoke gestures
via text-to-motion for the moments the 113 stock clips can't cover.

## Compression and browser correction pass (25 Nov)

Payload was the first release risk after the critique corrections: the working
`dist/` was about 43 MB before final art/audio. The five imported brigade GLBs
and Petra's three hero props were rebuilt with `gltf-transform optimize` using
Meshopt compression, animation resampling, WebP textures capped at 512 px and
simplification disabled. Source animation names were checked after compression
(`PetraReady`, `PetraWork`, `DimitriPrep`, `AnwarPrep`, `Walkout`, `Flinch`,
`Running`, `Walking`, `Work` where authored). The first aggressive attempt also
flattened/joined skinned graphs; the browser frame was not accepted as proof,
so the skinned cook files were regenerated with flattening and joining disabled.

Measured after the pass:

- `npm test`: **186/186 passing**.
- `npm run build`: passing.
- `dist/`: **26 MB uncompressed / 16 MB zip / 50 files** (down from about
  43 MB uncompressed and the Nov 24 package's ~29 MB compressed upload).
- Imported runtime brigade/props: about **2.1 MB total** in the build, down
  from about **22.3 MB** for the same source files.
- Browser route exercised with real clicks: title → first serve → call →
  inspect → turn plate → acknowledge visible fault → send back → Petra's
  immediate correction response. The compressed GLBs loaded and the canvas
  booted (`window.__booted === true`).

This closes the payload emergency, not the performance or human gates. The
single meshopt/visual check was an agent-operated browser pass, not unfamiliar
player observation. Frame-time and draw-call targets still need a dedicated
measurement pass before deploy. Audio already has the bounded vertical slice
ingredients — baked brigade chorus MP3s, dynamic review read-out and synth
service beds — but it still needs a human listen/mix pass before release.

## Audio vertical-slice mix pass (25 Nov)

Bounded mix work only; no new spend and no new generated takes.

- The five shipped brigade chorus MP3s were re-measured after codec encoding and
  gain-normalised as a voice family to the -19 LUFS target. `npm run check:audio`
  now generates the measurement table from the files on disk and fails if a
  shipped MP3 is missing or outside the gate. Current table: all 5/5 pass at
  -18.9/-19.0 LUFS integrated, true peaks -1.4 to -4.9 dBTP, 11-13 KB each.
- `src/game/sound.ts` now has a real bus hierarchy (master → sfx / ambience /
  voice) instead of every cue and bed landing directly on master. The ambience
  bed levels were pulled back (sizzle 0.16→0.13, murmur 0.15 max→0.12,
  drone 0.30→0.22, simmer 0.09→0.07 before the bus) so the beds support the
  service rather than masking calls and voices.
- Baked brigade playback now routes through the WebAudio voice bus when the
  browser allows media-element routing. Host mute therefore applies to the
  baked chorus as well as synth cues; host mute also cancels active speech
  synthesis. Spoken lines duck ambience and restore it afterward.
- The critic/review read-out is deliberately separated from its sting: speech
  starts 430 ms later, lower and slower (`pitch 0.86`, `rate 0.96`), so the
  review is a room-owning moment rather than simultaneous arpeggio noise.
- Browser validation used a temporary same-origin harness (removed afterward)
  with a trusted click: `AudioContext` reached `running`, `chorus-0.mp3` was
  fetched, one baked element played (`paused:false`, currentTime 0.747 of
  1.555 s), speech synthesis stayed silent, and `voiceDiagnostics()` reported
  no baked failure. After host mute, a repeated chorus produced
  `lastBakedFailure:"master-muted"` with no replay and no synth fallback.

NOT LISTENED TO BY A PERSON. These are meter and playback-mechanism results,
not a taste pass. The remaining audio release gate is a human listen of one
scream/chorus, one review read-out, and one busy-service ambience stretch on
the deployed or locally served build.

Post-pass verification: `npm test` 186/186, `npm run check:audio` 5/5,
`npm run build` passing, `dist/` 26 MB uncompressed in 50 files. The remaining
large-chunk warning is unchanged (about 1.5 MB minified / 429 KB gzip).
Production preview smoke after the audio pass: the built `dist/` game booted in
Chrome (`window.__booted === true`) and a trusted TAKE THE PASS click reached the
first service prompt. The only reported prop warnings were the pre-existing
missing `PortraitSocket` nodes on the five runtime bodies; no new runtime fault
appeared. Browser and preview-server sessions were closed after the check.
