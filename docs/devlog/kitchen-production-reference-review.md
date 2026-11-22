# Kitchen production — reference review and body pilot

The owner approved proceeding with the whole-kitchen production plan, preserving
the existing faces and direct opening. The first spending caps are 80 Recraft
credits and 20 direct Meshy credits. The owner later broadened Recraft
authorization to the existing balance as needed. This pass has confirmed
**60 Recraft credits**, **0 confirmed Meshy credits** and **$0 on fal**.
A 15-credit Meshy web submission is unconfirmed pending the browser permission
prompt described below. Recraft's account decrease matches the six 10-credit
generation receipts.

These are construction references, not new gameplay captures. No new production
body, rig, action clip or sound has been integrated or verified in the game.

## Reference decisions

| Candidate | Decision |
| --- | --- |
| [Room 01](media/kitchen-production/room-target-01.webp) | Reject as the build target. Useful equipment detail, but changed identities, inconsistent staff scale, oversized food and implausible dining placement. |
| [Room 02](media/kitchen-production/room-target-02.webp) | Layout/palette guide only. Better composition, but flat forms, changed faces and missing working equipment prevent acceptance as finished art. |
| [Brigade body study](media/kitchen-production/brigade-body-canon-01.webp) | Petra's front/back cloth forms are useful. Only five figures were returned; Dimitri's back and stronger stature differentiation remain open. This is not a complete canon sheet. |
| [Petra modelling reference](media/kitchen-production/petra-body-reference-01.png) | Selected for the single body probe: shaped sleeves, waist, apron and separated limbs. It is an A-pose despite the T-pose prompt; the mesh request explicitly requests T-pose. The neutral head is a rigging guide. |
| [Petra with original face](media/kitchen-production/petra-body-with-original-face.png) | A mechanical 2D composite using the unchanged approved portrait. Demonstrates the intended identity/outfit combination; collar fit and proportions still need a 3D check. |
| [Close-up 01](media/kitchen-production/first-person-target-01.webp) | Useful food/material reference, but the camera views a chef from outside. Not a first-person target or a reliable source of cooking technique. |
| [Close-up 02](media/kitchen-production/first-person-target-02.webp) | Reject as the final target. Framing is closer, but HUD artifacts remain, food is flattened and hand/tool contact is wrong. |

Stop native Recraft image-to-image revisions for the room and first-person
targets. The attempts do not preserve identity, dimensional detail and physical
contact reliably enough. Keep their useful composition/material information;
stage the definitive views with the actual 3D assets and camera. Use real
cooking references for grips and technique, not generated poses.

The original face files are unchanged. The body probe uses the neutral-head
modelling reference; the original portrait will be attached during preparation.
No generated concept face replaces Petra, Dimitri or Anwar in the game.

## Tool readiness and blocker

Blender 4.5.16 LTS successfully imported and exported the existing cloche GLB.
The local Meshy MCP startup failure was a truncated `iconv-lite` dependency in
its npm cache; reinstalling that package environment restored tool discovery.

The approved image-to-3D request then returned HTTP 402: task creation on the
connected free plan is no longer supported. It returned no task ID. The credit
balance itself was sufficient; this is an account-plan restriction. No
subscription change, top-up or retry was made.

Fal's signed-in account offers the same [Meshy T2.5 image route](https://fal.ai/models/meshy/t2.5/image-to-3d)
with `meshy-n1` texturing. Its public schema supports the requested 8,000
triangles and T-pose. The model page is labelled **Commercial use**; the source
art was generated on the user's active paid Recraft plan. Retain provider terms
and final asset provenance when the actual model is downloaded.

## Approved fal pilot

Approved cap: **$1 from existing fal credits**, for one $0.60 textured body and
one optional $0.20 [standalone rig](https://fal.ai/models/meshy/rigging).
The owner separately selected **Approve $1 Fal pilot** after the direct Meshy
account restriction was identified. This adds a fal cap without changing the
existing Recraft or direct Meshy caps.

Source: `media/kitchen-production/petra-body-reference-01.png`.
Upload that local PNG, then use its returned URL as `image_url` with:

```json
{
  "target_polycount": 8000,
  "should_texture": true,
  "texture_model": "meshy-n1",
  "enable_pbr": false,
  "pose_mode": "t-pose",
  "enable_rigging": false,
  "enable_animation": false,
  "enable_safety_checker": true
}
```

Do not send a texture prompt with N1. Do not bundle rigging into mesh generation.
Download and inspect the mesh first: silhouette, limbs, apron separation,
normals, texture and material treatment, topology and suitability for the
approved portrait. Prepare the accepted mesh in Blender before buying its rig.
If the mesh fails the bar, stop that route instead of paying for its rig.

The optional standalone rig uses the prepared GLB, with additional animation
generation disabled. Walking/running are included by the provider; cooking
actions still require selection or authoring and inspection on this figure's
own rig. A successful provider job is not an in-game acceptance.

## Still open

The owner returned browser control. The existing Meshy submission completed
and was downloaded without resubmission. Its usage receipt is 5 model credits
plus 10 texture credits. The prepared 1.85 m mesh was reviewed from three sides
and with the unchanged Petra portrait before rigging.

`assets/meshy/petra-pilot/rigged.glb` is the prepared figure's own 66-joint rig,
with finger joints, Walking and Running. The original face follows the head
bone in the [sampled pose sheet](media/kitchen-production/rig-review-contact-sheet.png).
The [initial skin diagnostics](../../assets/meshy/petra-pilot/rig-audit.json)
sample every stored key and adjacent midpoint through Three.js skinning. They
are geometry diagnostics, not a verdict on the complete performance.

The owner's [Pro website plan](https://www.meshy.ai/pricing#compare) lists
unlimited animations and a commercial-ready private license. Rigging and the
added Idle, Agree Gesture, Checkout Gesture and Female Stand Pick Fruit Basket
candidates produced no extra usage debits. Their six-clip bundle (including
walk/run) is saved as `assets/meshy/petra-pilot/motions.glb`; candidates must
be judged from their actual movements before they become game actions.

The four candidate sheets have now been reviewed. **None is accepted as the
cooking performance.** Idle crouches and makes a large look-back; Checkout
Gesture reaches toward a pocket and offers an open palm; the fruit-basket
motion plucks fruit into a basket held on an elbow, rather than lifting a
plate. Agree Gesture is conversational; its neutral stance and shorter
segments may be useful.

The expanded `motions-audit.json` records a lower-spine-relative waist band,
connected clothing shells and the location of compressed edges. The isolated
apron/hem shell averages 0.8888 thigh influence, which must be corrected before
using it as loose cloth. The full Agree Gesture reaches a waist-width ratio
of 0.9328; the other clips remain above 0.97 in this band. These are targeted
diagnostics, not final motion acceptance.

The initial 766-vertex colour mask looked right from the front, but the
deformation test exposed hidden trouser vertices that also carried gold
texture beneath the real apron. Reweighting them stretched an edge 5.83×
while running. That prototype was rejected. The final diagnostic selects
only the six separate apron/tie shells: **644 vertices**. Its front and
quarter mask views were reviewed before conversion.

`cook-rig.mjs` preserves the immutable sources and adds an apron bone, with
a hinge at the separate panel's upper edge and a baked forward swing.
`cooked-work-sheet.png` and `cooked-cloth-sheet.png` were reviewed: the panel
clears the legs in the sampled walk/run poses instead of splitting between
the thighs. These are pose samples, not a full in-game locomotion verdict.

The owner approved the 150-credit Meshy production cap. Motion Prime's
six-second “Petra - sear and turn” request cost 10 credits, confirmed in
the website's usage history. `service-source.glb` contains the immutable
result, `Petra___sear_and_turn` (5.9667 seconds). The new work motion remains
conditional on meaningful tool/food contact.

The runtime derivative removes the neutral generated head, adds a portrait
socket, excludes rejected clips, creates a calm ready pose and closes the
work loop with eased endpoint blends. Its repacked file is 3,861,112 bytes,
5,698 vertices and 7,231 triangles. `runtime-audit.json` records minimum waist
ratios of 1.0160 (Ready), 1.0144 (Work), 0.9962 (Running) and 1.0159 (Walking).
Ready/Work have no measured edges outside 0.25–3× bind length; walk/run retain
the original small number of compressed knee edges, below the 1% limit.

`PetraCook.tsx` now uses the actual loader, her own cloned skeleton and
service-clock animation, with the unchanged portrait. Lifecycle review fixed
initial head-pose capture, first-frame readiness, reset handling and owned
skeleton cleanup. Typechecking and the fresh localhost title path passed;
the default opening, work transition and first-person toggle had no model
or console errors. Pause was visually checked. Backwards-clock reset and
walkout have not been exercised live.

Local served checkpoint: `index-D3KNq5xy.js` on port 5174 (diagnostics enabled).
The placeholder pan remains. Real CC0 equipment sources and photograph
references are recorded in `assets/props/README.md`; contact and material
review are next.

- Definitive whole-room and first-person targets.
- Full canon sheets and distinct working bodies for the whole brigade.
- Petra's final motion selection, deformation checks, contacts and in-game comparison.
- Runner/porter routes, station equipment, authored food, sound and recovery.
- Full playable sequence, human listening/play review and measured performance.
