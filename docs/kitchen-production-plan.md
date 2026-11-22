# Next kitchen production milestone

Status: approved; Petra's body pilot is in the local playable build. Her own
rig drives a looped work motion and calm ready pose, with the approved portrait
attached to the head. The apron has a separate authored bone and corrected
weights; front, quarter and side pose reviews are recorded. A fresh title →
Take the pass → serve → call → serve route and both cameras were checked.
Tool contact is not yet finished, so the rest of the body batch remains held.

The owner approved a **150-credit Meshy cap** using T2.5/N1 bodies and Motion
Prime actions: 125 planned including Petra, plus 25 for revisions. **25 credits
have been spent** (15 body, 10 motion), through the owner's Pro website in Ego.
Rigging and library actions incurred no additional debits. Recraft remains
authorized against its existing balance as needed; 60 credits have been spent.
The separately approved $1 fal route remains unused.

Freely licensed tongs, skillet and cooker sources are being prepared for the
contact pass. Other cooks, the runner/porter, richer food, sound and the
whole-kitchen acceptance sequence are still open. Current preview:
http://127.0.0.1:5174/ (local diagnostics build, not published).

Current evidence: [reference review](devlog/kitchen-production-reference-review.md),
[generation brief](research/kitchen-generation-brief.md) and
[spend ledger](devlog/kitchen-production-ledger.json).

## Preserve what the owner accepted

The owner's latest response: **“the faces are much more cool”** and **“we have a
big job to make it feel like a busy immersive kitchen still.”** They also
confirmed that credits are available on services including Recraft and fal.

Keep the existing collage face identities, linework and colour treatment.
Build better bodies and performances around them; do not let a body-generation
pipeline silently replace the faces. Preserve the direct opening previously
praised by the owner.

Reference build: `index-DZL1QECZ.js`.
Reference frame: [current opening](devlog/media/flagship/production-opening.png).
This acceptance covers the faces, not the whole frame's bodies, food, room or
motion. The broader [design](design.md) and
[attachment tracker](player-attachment-plan.md) remain the governing scope.

## The next playable proof

A continuous, player-controlled quiet → rush → recovery sequence across the
whole kitchen: three cooks work differently, a runner carries actual orders,
a porter handles returns, and the chef rescues a dish and releases a table.
The action remains connected to the existing service/morning/recipe loop.

With the HUD hidden, the player should be able to see who is working, who needs
help, which plate is ready and where it goes. Faces, hands and food stay clear
of the ticket rail and dialogue. Review the scene in motion and with sound,
including both cameras; a beauty still cannot close this milestone.

## Production order

### 1. Establish the whole-room target from the real camera

Use Recraft or a suitable image-editing model on fal for a paint-over of the
current frame, preserving the faces, viewpoint, pass and essential sightlines.
Create a matching first-person plate close-up and character turnaround sheets.
These are construction references; the target still has to become playable.

Commit to a dimensional collage kitchen: shaped bodies and equipment,
illustrated surfaces, cream tile, green and vermilion enamel, copper and warm
food colours. Give the room depth, material variation and signs of actual work.
Compare each imported asset against this common target.

### 2. Build the brigade's bodies and working performances

Produce three distinct silhouettes, properly shaped sleeves/aprons, shoulders,
wrists and hands, while retaining the approved portrait heads. Use Meshy smart
topology for suitable body forms, then Blender for cleanup, rig preparation,
face attachment and animation. Export the actual prepared mesh and its clips.

Prove one body through the entire import/rig/action route before batching.
That is an internal production check: the delivered milestone includes the
whole brigade, runner and porter.

Each cook needs acknowledge, retrieve, prepare, cook/check, plate, present and
reset actions, plus correction, pressure and relief reactions. Choose usable
library/captured clips by watching them; author missing cooking actions in
Blender from real technique references. Procedural layers supply breathing,
gaze and contact corrections rather than inventing the whole performance.

The chef also needs a coherent arm/hand/tool rig. Replace the detached whisk
hand with a reaching, gripping and returning action whose contacts work in
both views.

### 3. Turn the room into a working kitchen

Give each station appropriate equipment and material treatment: grill/range,
oven and resting board; sauté burners, sauce containers and spoon bath;
pastry bench, ramekins and oven/fridge access. Add a clear supply area, dirty
return, wash-up and serving route, with dining space visible beyond the hatch.

Lay out reachable work surfaces and circulation before decorative dressing.
Use reusable authored modules, then selected props: folded towels, ingredient
trays, herbs, resting racks, delivery crates and personal traces.
Replace the visible background mannequins with illustrated guest figures at
dining-room distance. Let work leave temporary traces—flour, used pans and
return trays—which are visibly cleared as the kitchen recovers.

Review/reuse the existing cloche, fish, lamb, pan stack, plate stack and shaker
GLBs. The historical [Meshy prop pipeline](meshy-pipeline.md) uses untextured
models with uniform replacement materials. That remains useful for some small
props; new hero assets should retain reviewed texture/roughness/detail maps
where those improve the illustrated finish.

### 4. Give the food a specific preparation and physical character

Prioritize Wellington, scallops and soufflé, with purée included for the current
first-service route. Research the particular version this restaurant serves:
ingredients, equipment, sequence, cut surface, texture, success and failure
signs, and its connection to the cook or supplier.

Recraft/fal support the visual references and illustrated material work.
Use licensed or Blender-authored close-up food/tool assets where precision is
needed. Meshy can supply suitable large forms, but cut surfaces, crust,
interior, sauce and collapse need controllable components.

Keep rendered evidence driven by the existing authoritative dish condition.
Cooking is compressed for play while retaining recognizable technique:
oven/rest/carve for Wellington, pan contact/turn/rest for scallops, and
oven handling/fragile transfer for soufflé. Provenance appears through
ingredients, deliveries and brief exchanges grounded in researched backstories.

### 5. Connect movement, sound and events

Drive a cook's action sequence from its actual ticket and work progress.
Named animation beats trigger contact sounds, steam, tool placement and plate
handoffs. Interrupted actions cancel their pending beats. Tools do not appear
in a hand without a transition.

A runner's delivery and the guest's visible response must agree. A porter
collects returns rather than wandering on an unrelated loop. Use bounded
routes, work locations and actor counts; vary idle choices and rhythms.
The tutorial can hold pressure while the room's idle life continues.

Use ElevenLabs or an appropriate fal audio model for a small first collection:
knife/board variations, pan sizzle, oven/steam, whisk/bowl, ceramic/metal
contacts, footsteps, wash-up and room tone. Cast original character voices
for short acknowledgements and calls. Audition them in the actual game.

Mix by place and urgency: nearby action, station activity, then dining/room
ambience. Quiet, rush and recovery need different density. Every cue has an
event or animation caller, and human listening remains an explicit gate.

## Tool and spending approach

| Tool | Intended contribution |
| --- | --- |
| Recraft | Preserve the illustrated identity; paint-over targets, character sheets, labels and material artwork. |
| fal | Select an image/editing or audio endpoint for a specific gap after checking the model and account route. Generated clips may communicate an art idea but do not substitute for game animation. |
| Meshy | Suitable character/prop forms using smart topology and a deliberate face budget; inspect before rigging or batch generation. |
| Blender | Shape cleanup, topology/material work, UVs/bakes, separate food states, grips, rigs and authored action clips. |
| ElevenLabs | Candidate effects and original cast voices, followed by editing, synchronization and in-game listening. |

Recraft and Meshy integrations are configured in this environment. The local
Meshy startup issue is fixed, but its API rejects creation on the connected
free plan. The signed-in fal account exposes the same T2.5/N1 route at $0.60
for a textured mesh and $0.20 for a subsequent standalone rig. A proposed
$1 fal pilot cap is approved; no fal generation has run yet. ElevenLabs
access still needs checking before execution. Existing credit
availability does not establish an endpoint's price or a batch's quality.
Quote the first paid pilot and agree provider caps/model choices before
running it; log job IDs and keep downloaded results before any retry.
Spend primarily on assets/actions the player repeatedly sees or hears.

## Performance and acceptance

Profile the current simulation/React, rendering and GPU costs separately before
claiming why the existing measurements sit below target. Imported skinned
bodies and consolidated set pieces may reduce the many small draw submissions,
but that saving must be measured. Share materials, instance repeats and bake
static detail; keep food evidence, face quality and input responsiveness.
The performance target remains the one in the design, with fixed settings and
a defined laptop/browser profile.

The next checkpoint needs:

- Full-room and close-up comparisons with the approved target, at play size.
- All three cooks plus runner/porter visibly performing their jobs.
- Actual order, cooking, intervention, delivery and recovery actions observed
  as sequences, including contact/interruptions, rather than inferred from code.
- Readable good/defective food and a character response during real service.
- A human listening/play pass and a representative performance capture.
- The direct opening and existing recipe carryover still working.

## Resources reviewed

- [OpenGame creator guide](https://opengame.io/create): recommends Meshy paired
  with Blender, fal for generative media and ElevenLabs for audio, with iterative
  in-game review and performance measurement.
- [Chroma promotions](https://submit.chromaawards.com/pack): the public view in
  this session displayed the promotions headline and sign-in link, but no
  individual offers. Specific entitlements, validity and balances were not
  verified. No account changes or redemptions were performed.
