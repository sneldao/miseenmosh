# Seared beef surface — production texture

Recraft V4.1 Pro raster, one square image, quoted 10 credits from the owner's
already approved personal balance. A material swatch for the actual beef in
Petra's skillet; no copyrighted recipe photograph is uploaded.

Prompt:

Seamless albedo material swatch of freshly seared beef fillet crust. The material
fills the square edge to edge, a macro close-up viewed perpendicular to the
surface. Appetising caramel amber, honey brown, chestnut and restrained burgundy
roasted fibres; small irregular Maillard crust patches and fine meat fibres
running mainly horizontally. A hand-painted gouache surface with subtle carved
linocut marks for a dimensional illustrated restaurant game. Keep the marks
small and the colour varied, with no large black areas. This is an unlit colour
texture, not a photograph of a whole dish. No object outline, plate, utensils,
herbs, text, numbers, borders, shadows, lighting gradient, flames, oil highlights,
grill stripes or white marble-like fat veins.

# Kitchen production — first generation brief

Status: six Recraft candidates generated and reviewed, costing 60 credits.
The owner subsequently authorized using existing Recraft credits as needed.
The 20-credit Meshy pilot is now being submitted through the correct signed-in
web account in Ego. Its submission result is unconfirmed while a browser
notification permission prompt is under the owner's control. The MCP account
is a different account and cannot be used to check this web job.
See the [production review](../devlog/kitchen-production-reference-review.md)
and [spend ledger](../devlog/kitchen-production-ledger.json).
The owner approved proceeding with the kitchen production plan, including
preserving the existing faces and direct opening.

## Approved first batch

Use **Recraft V4.1 Pro raster**, `recraftv4_1_pro_raster`, through the existing
personal Recraft connection. Recraft's current Studio model menu and
[credit documentation](https://www.recraft.ai/docs/plans-and-billing/credits)
show **10 credits per raster image**. Four initial outputs cost 40 credits.
The initial **80 Recraft credits** cap was subsequently superseded by the owner's
instruction to use existing Recraft credits as needed before they expire.
Keep logging costs and inspecting outputs; the broader approval is not a reason
to keep spending on routes that fail the quality bar.

Make the whole-room target first and inspect it before generating the remaining
references. Do not buy batches of near-identical alternatives. Log each request,
cost and returned asset before proceeding. No top-ups or subscription changes.

Prepare a private V4-compatible custom style from the owned Gilliam cast art
and existing linocut/cookery-paper references. Style creation is free. Use
`recraftv4_pro_raster` at style creation, which supports the matching V4.1 Pro
raster generation model. Do not use the retired band-biopic style.

The initially investigated Nano Banana Pro route displayed a Google Usage Policy
acceptance dialog. It was not accepted. The proposed native Recraft route
does not depend on that external model or consent.

Meshy discovery initially failed because of a corrupted local npm dependency;
that problem is repaired. A subsequent creation attempt returned HTTP 402:
the connected free plan no longer supports API task creation. No task ID was
returned and no model was generated.
The approved first body pilot uses smart topology `meshy-t2.5`,
8,000 target faces, `meshy-n1` 2K base-colour texture, GLB output: 15 credits.
An optional rig of the final cleaned textured humanoid adds 5 credits.
Approved Meshy pilot cap: 20 credits. An alternative using the same model
through fal has a separately approved $1 cap, but remains unused: the owner
then directed use of the correct Meshy web account through Ego.

## Frozen source references

Production preparation is complete: Blender 4.5.16 LTS is installed at
`~/tools/blender/Blender.app/Contents/MacOS/Blender`. The existing cloche GLB
successfully imported and exported through that CLI. The unchanged face crops
and current world frame are assembled in
`docs/devlog/media/kitchen-production/references.png`; this is a reference board,
not generated target art. The lead inspected the board.

- World frame: `docs/devlog/media/flagship/production-opening.png`.
- First-person plate: `docs/devlog/media/flagship/held-first-person-R6.png`.
- Approved face crops: `assets/recraft/playable/{petra,dimitri,anwar}.webp`.
- Original cast art: `assets/recraft/cast-gilliam/{petra,dimitri,anwar}.webp`.
- Food style: `assets/recraft/food-lino/wellington.webp`.
- Paper style: `assets/recraft/paper-cookery/market-sign.webp`.

The face crops remain unchanged in the game. Any face a concept model redraws
is provisional and must not replace those approved assets. A body reference's
neutral head is a rigging guide, never a proposed player-facing replacement.

## Request 1 — whole kitchen target

Method: `image_to_image`, source world frame, strength 0.65, n=1, new
V4-compatible style, explicit `recraftv4_1_pro_raster`.

Prompt:

> Repaint this exact gameplay view as a dimensional illustrated restaurant
> kitchen for MISE EN MOSH. Preserve the viewpoint, three cook positions and
> identities, left-to-right station order, foreground chef's pass and clear
> sightlines to faces, hands and food. Retain the engraved collage character
> of the faces. Build substantial shaped cloth bodies, expressive shoulders
> and believable sleeves, aprons and working hands around them.
>
> The left grill station has a range, oven, resting rack and carving board;
> the centre sauce station has burners, warm sauce containers, spoon bath
> and herb trays; the right pastry station has a cool stone bench, ramekins
> and oven access. Give the room depth: supply shelves, a dirty-return and
> wash-up area to one side, a clear staff lane around the stations, and an
> opening to a warm dining room with illustrated patrons. A runner carries
> a real tray along the serving route; a porter clears a return tray.
>
> The room is colourful, clean and well used. Cream glazed tiles, petrol-green
> and vermilion enamel, mustard fabric, copper, patterned tea towels, handwritten
> delivery labels and restrained paper/ink texture. Broad confident colour
> masses, curved and irregular authored shapes, soft contact shadows, tangible
> thickness and material variation. Show selective steam from hot work and
> the warmth of an oven, keeping the room bright and readable.
>
> The plate at the pass contains an appetizing Wellington with a substantial
> pink beef centre, thin mushroom layer, flaky golden pastry and glossy jus.
> This is a buildable game-art production target: keep plausible equipment,
> working space and hand contact. Leave the food and faces unobscured.
> Remove interface buttons from the concept image. Avoid plastic toy bodies,
> identical rectangular stalls, neon, heavy bloom, darkness and busy wallpaper.

### Room revision 02

First room image rejected for identity, scale and layout errors. Use the same
source and model with strength **0.30** and this revised prompt:

> Preserve this exact image's camera, perspective, three front-facing stations,
> counter heights, floor plane, foreground pass and the sizes and positions of
> all three cook heads. Keep Petra's engraved face and piled hair on the left,
> Dimitri's long moustache and tall striped toque at centre, and Anwar's round
> glasses and short dark hair on the right. Their existing portrait identities
> are essential. The result remains a view of the same playable kitchen.
>
> Add authored physical detail within that existing composition: sculpted
> mustard cloth and rolled sleeves for Petra, petrol-green cloth and apron
> for Dimitri, cream jacket and petrol apron for Anwar. Add believable wrists
> and gripping hands, substantial curved fabric and expressive shoulders.
> Retain the graphic ink/collage faces on these dimensional bodies.
>
> Turn the left workstation into a shaped enamel grill/range with an oven,
> resting board and a copper pan. Give the centre workstation sauce pots,
> a spoon bath, herb trays and a folded towel. Give the right workstation
> ramekins, a mixing bowl and a pastry board. Dress the rear wall with
> functional shelves, stored ingredients and a dining-room hatch. Keep
> all people consistently adult-sized on the same floor; background diners
> stay beyond the rear hatch. Leave the central circulation space open.
>
> Keep the Wellington plate at its original small foreground scale.
> Improve its flaky golden crust and pink cut centre, finely minced dark
> mushroom layer and shallow dark-brown jus. No whole mushroom rings.
> Warm cream tiles, petrol enamel, vermilion accents, mustard cloth,
> copper and restrained ink/paper texture. Real object thickness and
> softly shaped volume with contact shadows. Bright inviting light.
> No giant foreground objects, tiny people, replacement faces, dining
> tables under counters, extra camera perspective or flat diagram style.
> Remove interface buttons while retaining the wall's MISE EN MOSH sign.

## Request 2 — chef/plate close-up

Method: `image_to_image`, first-person reference, strength 0.45, n=1, same
model without the shared custom style. Preserve the camera relationship and
plate size from the source. The reference stages sauce correction in a small
pan beside the plate; this handling change is proposed, not yet implemented.

Prompt:

> Develop this first-person chef view in the same dimensional collage kitchen
> style: cream ceramic with a petrol-green rim, etched warm materials and
> a precisely rendered Wellington. The cut surface shows a generous pink
> beef centre, thin dark duxelles and flaky pastry. Give the pastry irregular
> laminated edges and a delicate scored top; place a shallow glossy pool of
> jus clearly in front of the food within the plate rim.
>
> Show one complete left forearm and hand supporting the rim from underneath,
> with the thumb resting securely at the edge. The right forearm and hand
> extend coherently from the chef's sleeve and grip a small balloon whisk
> whose wires contact the sauce in a small copper saucepan resting on the pass
> just to the right of the plate. The sauce is corrected in that pan before
> replating; the whisk does not scrape the serving plate or pastry.
> Sleeves, wrists and palms have natural
> proportions and believable contact. The tool and hands do not obscure
> the cut surface. Cloth is sculpted and softly folded rather than faceted.
>
> Background stations belong to the same bright, colourful illustrated kitchen.
> Keep the source framing and practical play distance. This is a tactile
> gameplay asset reference with clear forms, not a cinematic camera effect.
> Omit the HUD, lettering, floating cuff/hand pieces, extra fingers and glows.

### First-person revision 02

The first attempt depicted a chef from outside. Keep the source image and
model, lower strength to **0.20**, and use:

> This is a FIRST-PERSON video-game view through the chef's own eyes, looking
> down at a plate. Preserve the input camera, plate position and size, and
> the two forearms entering from the BOTTOM corners of the image. No chef
> torso or head is visible. No arm enters from above or from the far side
> of the counter. Keep the room's existing perspective and station colours.
>
> Improve the existing Wellington on the plate: thin flaky golden pastry,
> a generous pink beef cut surface facing the chef, finely minced dark
> duxelles and dark-brown glossy jus. Keep cream ceramic with its green rim.
> The left hand supports the near-left rim from underneath; its thumb
> rests securely at the edge. The right forearm comes from the bottom-right,
> with its wrist in the lower half of the frame. That hand grips a small
> balloon whisk, stirring jus in a small copper saucepan resting on the
> pass immediately to the right of the plate. The wires touch the liquid,
> not the plate or the pastry. Exactly two hands, with natural anatomy
> and connected wrists, softly folded chef cuffs and substantial volume.
>
> A tangible illustrated game world: warm cream, petrol-green, restrained
> vermilion, ochre, engraved surface detail and subtle paper/cloth texture.
> Preserve the actual gameplay framing rather than turning it into an
> external photograph of a chef. Remove HUD text and buttons. Keep hands,
> cut surface and tool contact clear, with no cinematic blur or glow.

## Request 3 — brigade body canon

Method: `generate_image`, 16:9, n=1, same model without the shared custom style.
The room tests showed that the style flattens the physical forms. This designs bodies;
the supplied approved face crops are composited into the review board separately.

Prompt:

> A studio render of six three-dimensional handmade costume maquettes for a
> dimensional collage cooking game, on a warm off-white seamless background.
> These are sculpted bodies with illustrated cloth surfaces, substantial
> curved volume and soft ambient/contact shadows, not flat drawings.
> Three columns, one character per column. Front
> view in the top row and matching back view beneath. Full bodies, entire
> feet visible, no equipment, no perspective room and no text.
>
> Left: PETRA, compact and strong, fitted waist, purposeful stance, ochre
> double-breasted chef jacket with expressive puffed shoulders and rolled
> sleeves, mustard apron with petrol-green trim, practical trousers and shoes.
> Centre: DIMITRI, broader through shoulders and waist, relaxed veteran posture,
> petrol-green jacket and apron with mustard details. Right: ANWAR, slim and
> upright, cream jacket, petrol-green apron, careful neat tailoring.
>
> Give them substantial shaped shoulders, elbows, forearms and wrists, sculpted
> fabric folds, apron ties, useful pockets and closed practical shoes. The
> silhouettes must differ without relying on colour. Use simple neutral head
> forms as technical attachment guides: the game will retain its existing
> engraved collage portrait heads, so do not invent replacement faces.
> The front and back clothing details must agree. Arms slightly away from
> the body, hands open, uncrossed legs, clean readable silhouettes.
> Warm illustrated textures and graphic shadow masses on sculpted matte fabric,
> clearly shaped three-dimensional volume, no block-shaped torsos, plastic limbs,
> glossy toy finish, flat diagram shading or decorative clutter.

## Request 4 — Petra single-body modelling reference

Method: `generate_image`, 3:4, n=1, same model without the shared custom style.
Refined against Petra's front/back body study:

Prompt:

> A studio render of one isolated three-dimensional handmade costume maquette,
> a full-body character modelling reference for PETRA, the compact,
> strong grill cook of MISE EN MOSH. Front view, neutral T-pose with arms held
> straight out from the shoulders, empty separated hands, uncrossed legs,
> entire shoes visible. Warm plain off-white background, even studio light,
> no cast vignette, no typography, no second figure and no equipment.
>
> A fitted ochre double-breasted chef jacket with sculpted puffed shoulders,
> three-quarter rolled sleeves, petrol-green collar and six petrol buttons.
> A mustard apron with petrol-green edging, a useful patch pocket, attached
> waist ties and restrained printed ochre/green geometric fabric patches.
> Practical dark trousers and closed black shoes. Tangible cloth folds at
> elbows, waist and knees, clear shoulder and wrist structure, continuous
> limbs and a readable human silhouette with controlled caricature.
> Include a complete smooth neutral head AND a short neck for humanoid rigging;
> do not omit the head. The final game
> replaces that guide with its approved engraved collage portrait, so do
> not add a new face, hat or hairstyle.
> Clearly three-dimensional curved fabric with soft ambient and contact shadows,
> not a flat drawing. Keep the clothing close enough to the body for reliable rigging; apron ties
> are attached and the hem leaves both legs clearly separate. Soft illustrated
> material detail, confident colour masses, no glossy toy plastic or box limbs.

## Review before importing or buying the next stage

The whole-room target must preserve playable framing and show meaningful work
areas, not just more clutter. Both views must retain bright readable colour.
Bodies must have usable anatomy and distinct silhouettes. Held hands and tools
must make sense at close range. Food must resemble the intended dish.
Concept images do not prove animation, performance or culinary technique:
those still require authored assets, real references and in-game validation.

## Request 5 — Dimitri single-body modelling reference

Method: `generate_image`, 3:4, n=1, same model without the shared custom style.
Same recipe as Request 4, character swapped.

Prompt:

> A studio render of one isolated three-dimensional handmade costume maquette,
> a full-body character modelling reference for DIMITRI, the broad veteran
> sauté and sauce cook of MISE EN MOSH. Front view, neutral T-pose with arms
> held straight out from the shoulders, empty separated hands, uncrossed legs,
> entire shoes visible. Warm plain off-white background, even studio light,
> no cast vignette, no typography, no second figure and no equipment.
>
> A relaxed, heavier-set build, broader through shoulders and waist than the
> other cooks. A petrol-green double-breasted chef jacket with substantial
> shaped shoulders, three-quarter rolled sleeves and ochre buttons. A
> petrol-green apron with mustard-ochre edging, a deep useful pocket,
> attached waist ties and a folded towel tucked at the hip. Practical dark
> trousers and closed black shoes. Tangible cloth folds at elbows, waist and
> knees, clear shoulder and wrist structure, continuous limbs and a readable
> human silhouette with controlled caricature.
> Include a complete smooth neutral head AND a short neck for humanoid
> rigging; do not omit the head. The final game replaces that guide with its
> approved engraved collage portrait, so do not add a new face, hat or
> hairstyle.
> Clearly three-dimensional curved fabric with soft ambient and contact
> shadows, not a flat drawing. Keep the clothing close enough to the body
> for reliable rigging; apron ties are attached and the hem leaves both legs
> clearly separate. Soft illustrated material detail, confident colour
> masses, no glossy toy plastic or box limbs.

Result `dimitri-body-reference-01.webp`: accepted for the body pilot with one
flag — the guide head carries an engraved face the prompt forbade; harmless
because the approved portrait replaces it, noted in case it bleeds into the
baked texture.

## Request 6 — Anwar single-body modelling reference

Method: `generate_image`, 3:4, n=1, same model without the shared custom style.

Prompt:

> A studio render of one isolated three-dimensional handmade costume
> maquette, a full-body character modelling reference for ANWAR, the slim
> careful pastry cook of MISE EN MOSH. Front view, neutral T-pose with arms
> held straight out from the shoulders, empty separated hands, uncrossed
> legs, entire shoes visible. Warm plain off-white background, even studio
> light, no cast vignette, no typography, no second figure and no equipment.
>
> A slim, upright build, noticeably narrower through shoulders and waist
> than the other cooks, with careful neat tailoring. A cream double-breasted
> chef jacket with a high collar, long unrolled sleeves and small ochre
> buttons. A petrol-green apron with mustard-ochre edging, attached waist
> ties and a clean front panel. Practical dark trousers and closed black
> shoes. Tangible cloth folds at elbows, waist and knees, clear shoulder
> and wrist structure, continuous limbs and a readable human silhouette
> with controlled caricature.
> Include a complete smooth neutral head AND a short neck for humanoid
> rigging; do not omit the head. The final game replaces that guide with its
> approved engraved collage portrait, so do not add a new face, hat or
> hairstyle.
> Clearly three-dimensional curved fabric with soft ambient and contact
> shadows, not a flat drawing. Keep the clothing close enough to the body
> for reliable rigging; apron ties are attached and the hem leaves both legs
> clearly separate. Soft illustrated material detail, confident colour
> masses, no glossy toy plastic or box limbs.

Result `anwar-body-reference-01.webp`: accepted with the same engraved-guide-
face flag as Dimitri.
