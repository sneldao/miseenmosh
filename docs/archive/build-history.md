# Build history — Nov 18 (moved out of design.md)

Dated build notes from the first three nights. The systems they describe are specified
in [design.md](../design.md); this file exists so the spec stays a spec.

---

## Implemented (as of Nov 18, night 1 build)

Single-night vertical slice, browser-verified end to end:

- **Service loop**: seeded ticket rail → plate (skill-timed delay) →
  quality-tiered plate slides to the pass → SERVE / SEND BACK / SMASH
  with branching consequences and rubber-stamp verdicts.
- **Brigade**: three named cooks; morale drains under load, recovers
  idle, bottoms out into animated walkouts; chef covers dead stations
  at 1.8×. SCREAM buys a 6s adrenaline window at rising cost; the
  brigade answers with rotating chorus lines.
- **The room talks**: ambient chef barks, guest heckles on send-back,
  BEEFCAKES rival drama at 35s/75s/118s (the middle one steals a ticket
  off your rail).
- **Inspector**: faster tell clock (phone raise + screen flash),
  civilian decoys, flag-before-dessert deadline, always orders the
  signature Wellington; critic verdict lands on the review card.
- **Escalation**: dessert-course stampede at 100s + printer speed-up.
- **Scoring**: streaks (heal brigade every 5), ego, stars formula with
  theatre bonus for smashing without misses.
- **Feel**: full keyboard play, pause, WebAudio synth SFX placeholder
  bus (replaced by baked ElevenLabs later), smash shrapnel, camera
  shake, plate slide-in.
- **Share artifact**: receipt-style review card + COPY REVIEW block;
  SAME SERVICE, AGAIN replays the identical seeded night.

### Career layer (Nov 18, night 2)

The game is a residency now, not a night:

- **9-night arc**: title → office briefing → service → review →
  briefing → … → ending. Three endings: bankruptcy flame-out
  (cash < −£60), three-star win (≥10★ total), or "footnote in the guide."
- **The office**: ledger header (night, venue, cash, stars, services
  left), last-night take (covers × venue price − wages − breakage;
  walked-out cooks still draw half pay), brigade panel showing morale,
  skill and trauma scars (✕ per past walkout — they drain faster
  forever), a shop (drinks £40 / better pans £80 ×3 / comp the press
  £60), and the night's BEEFCAKES feud card.
- **Feud cards**: one per night from a 4-event deck — poach attempt on
  the weakest cook (match £90 or lose them to the protein people; a
  NEW_BLOOD replacement joins), press quote (trash-talk = +heat vs
  classy = +morale), stolen fish delivery, food-truck blockade. Heat
  (aggro) makes his runner steal a second ticket mid-service.
- **Persistence**: localStorage career save (career + brigade incl.
  trauma and feud resolution), title offers CONTINUE/NEW RESIDENCY,
  save-blocked browsers get told.
- **Venues**: STALL 86 → LE MOSH (≥5★) → MOSH & SON (≥10★), each
  repricing covers and raising pressure (faster printer, faster critic
  tells).

---

### Chaos & personality (Nov 18, night 3)

- **Station fires**: a station holding 3+ live tickets for 8s ignites —
  flickering cones + orange light, morale drains ×2, plates carry −8
  quality, brigade panel shows FIRE. Click the station: "You smother
  the fire with a hotel pan." Physics chaos v2 done: fires + falling
  pans (shelf pans clatter, bounce, spin and fade when a cook storms
  off) + fumbles (a cook under 30 morale bins 15% of plates — ticket
  back on the rail at 60% age).
- **BEEFCAKES has a body**: a hulking silhouette shoulder-checks into
  the pass window for ~4s at every rival event, red rim light,
  absurd delts, backward cap.
- **Scream heat-pulse**: the whole kitchen floods red for ~1.2s.
- **Vocabulary expanded**: 14 chef barks, station-directed insults
  ("PETRA — charred is a flavour. Cremated is not."), more heckles
  and rival lines.
- **First sponsor asset landed**: Meshy meshy-t2.5 cloche (5 credits,
  untextured preview → tinted tarnished silver in-scene) sits on the
  pass and hops/spins when a fresh plate lands. GLB pipeline proven:
  generation → download → `public/models/` → `useGLTF` → in-scene.

### Generated art pass (Nov 18, night 3, cont.)

First wave of baked art (Recraft, custom "band-biopic grain" style —
see assets/recraft/manifest.json for provenance):

- **Verdict stamps**: real rubber-stamp SVGs (SERVE / SENT BACK /
  SMASHED) replace the text stamps — still slam mid-screen.
- **Dish sprites**: generated plated-dish art on the pass plate by
  dish name (wellington / sea-bass / quenelle families); criminal
  plates keep the sad lump. Serviceable plates dim.
- **Title**: cover-art chef-in-ticket-storm backdrop + SVG lockup
  replaces the text H1.
- **Wall**: Chef Pistols gig poster replaces the procedural poster.
- `src/vite-env.d.ts` added for asset imports.

Provenance note for the judges: every raster/vector asset under
`assets/recraft/` was generated during the jam window via the Recraft
MCP (manifest holds style id + date) and is baked into the bundle.
