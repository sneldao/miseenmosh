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
