# Player attachment implementation plan

Status: active. Original plan agreed 21 November 2026; expanded flagship scope approved for implementation. On 22 November the bounded service → morning → next-service route was verified locally. On 24 November the critical game-design review added an active correction contract for scoring, consequences, the nine-night arc and judgment-led onboarding. Visual, performance and human acceptance remain open.

## Outcome

Make the first service worth remembering: the player understands a dish, makes a
difficult call, remembers a cook's response, and wants to see what happens next.
Then extend those strengths through the nine-night residency.

The critique found seven barriers: judgment labels that supply the answer;
incentives that punish the advertised fantasy before teaching it; characters
presented primarily as statistics; contradictory clues and reviews; an opening
that demands knowledge before teaching controls; a gap between the illustrated
cast and the playable scene; and progression that may add commands without
changing the player's emotional stakes.

This is the execution tracker for that redesign. `design.md` separates baseline
behaviour from the proposed flagship scope. `roadmap.md` links here for this
work; its older checked items describe delivered features, not proof that the
new acceptance criteria are met. Archive completed plans after delivery.

## Delivery order and status

Use **pending**, **in progress**, **implemented / unverified**, **verified locally**,
and **shipped**. A passing build is not a human playtest or a deployment.

| Stage | Deliverable | Status | Depends on |
| --- | --- | --- | --- |
| 1 | Trustworthy reactions, critic clues and reviews | Verified locally | Existing service |
| 2 | Readable food and meaningful plate judgment | Implemented; human readability/choice gate open | 1 |
| 3 | First service and next morning with a character payoff | Partly implemented | 1–2; flagship integrates 4–5 |
| 4 | Independent stations and coordinated service | Verified locally; pressure tuning open | 1–2; explicit ticket lifecycle |
| 5 | Expressive cast, food and readable presentation | Playable foundation; visual/motion acceptance open | Whole-room target and character canon; integrate 2–4 |
| 6 | Residency with an emotional progression | Wellington memory verified; larger arc pending | 1–5 |

**First flagship milestone:** a complete service, the following morning and the
start of the next service. Combine stages 1–5 with one bounded recipe-development
and memory feature from stage 6. Human comprehension, pleasure and attachment
are gates; automated runs establish rules and reachability only.

## Flagship milestones and priorities (21 Nov)

Owner feedback, verbatim: *"update the docs with that plan, although i still
dont think its ambitious enough"*. The earlier complaint included *"ours looks
like bog standard 3d blocks"*. The direct opening remains approved. The higher
ambition is recorded and a bounded route now runs; its artistic and emotional
success has not been accepted.

The creative specification lives in
[design.md — flagship direction](design.md#flagship-direction--culinary-authorship-and-a-living-restaurant).
The visual and performance contract remains in
[playable art direction](design.md#playable-art-direction--expanded-target-21-nov).
These are the current priorities above the historical week-by-week roadmap.
The milestones are a sequence, not a new delivery-date estimate.

| Milestone | Deliverable and closing evidence | Status | Depends on |
| --- | --- | --- | --- |
| M0 — Whole-kitchen identity | An in-game whole-room art proof, recognisable cast, distinct food and a coherent motion/sound direction at player distance in both cameras | Foundation implemented; acceptance open | Existing art anchors; character and dish references |
| M1 — Flagship service and carryover | Complete service → morning → next service with physical judgment, real station coordination, a consequential intervention, a character response and one recipe revision visibly carried forward | Route verified locally; human/visual/performance gates open | M0; stages 1–5; bounded stage-6 memory |
| M2 — A restaurant with a history | Extend dish development, suppliers, regulars, physical memories and branching dilemmas through all nine nights; contrasting full playthroughs show different histories | Pending | M1 human playtest and stable persistence |
| M3 — Delivery proof | Performance, input, saves, audio, reduced-effects readability and published-frame checks on the intended build; human validation and publication tracked separately | Partial local checks; not release proof | M1/M2 integrated; relevant release authorization |

## Critique response implementation register (24 Nov)

This is the active correction plan from the critical design review. It takes
precedence over historical feature checkboxes and contradictory scoring prose.
The governing acceptance contract is in
[design.md](design.md#critique-response--active-acceptance-contract-24-nov).

| ID | Correction | Closing evidence | Status |
| --- | --- | --- | --- |
| C1 | Stars start at zero and primarily reward culinary quality; food, hospitality and brigade axes are visible | Scoring tests prove identical food with different detection/noise produces identical culinary stars; review shows the axes | In progress |
| C2 | Nine authored nights change a dilemma, condition and relationship payoff | Pure arc tests plus complete seeded playthroughs prove distinct conditions and reachable payoffs | Pending |
| C3 | Send-back, table run, 86, bread and expedite have explicit costs | Action tests prove age/workload/selection/miss/cash/pressure consequences and guard rails | Pending |
| C4 | Culinary condition and hospitality are independently recorded and reviewed | Critic and review tests distinguish good food/poor service from poor food/good service | Pending |
| C5 | Opening requires reading a visible defect before judgment and discloses controls contextually | State tests block premature verdicts; browser observation shows inspection, consequence and reduced utility clutter | Pending |
| C6 | New systems are frozen; retained systems must create a core decision, relationship memory or ending payoff | Every active service verb maps to a decision and consequence in `design.md`; no scope expansion in this pass | In progress |
| C7 | Walkout facts survive until the morning character response | Service → morning test proves a walked-out cook speaks before the next-service reset | Pending |
| C8 | Ending remembers authorship and relationships, not only stars and cash | Alternate seeded endings differ in signature contributor, honors, grudges, losses and cost | Pending |

### Scoring acceptance

- A service starts at 0 stars; the maximum is 5.
- Culinary quality gives 0–3 stars at average condition quality thresholds of
  58 / 72 / 85. Hospitality gives 1 star at an average of 75. A completed,
  well-held service gives 1 brigade star. Misses plus walkouts remove at most
  two stars, with the total clamped to 0–5.
- Coursing, requests, refusals, comps, featured-dish context and critic attention
  are hospitality/context, never mutations of plate condition or `qualitySum`.
- Detection, silence and smashing cannot directly add stars. Ego, accolades and
  review prose can still acknowledge them.
- The review card exposes food / hospitality / brigade stars and the reason for
  a lost brigade point. The copied and spoken review use the same facts.

### Service-consequence acceptance

| Action | Required consequence |
| --- | --- |
| SEND BACK | Preserves order age; the table continues waiting; the cook remembers justified correction versus rejection; a remake remains subject to normal cooking and condition rules |
| RUN TABLE | Serves the held plate by default; ready peers require a separate explicit commitment and their exact count is shown |
| 86 | Resolves only affected orders; displaced covers count as misses; a held plate cannot disappear through an unrelated table's 86 |
| BREAD | Costs £3, fails closed without cash, buys patience only, retains its 18-second cooldown |
| EXPEDITE | Advances the next ticket immediately as a deliberate pressure choice, but cannot bypass an active printer or a full rail |

### Critique-response night-arc contract

Each entry must produce a different playable service condition and a fact-gated
morning response. A text-only hook does not pass.

| Night | Central dilemma | Changed condition and relationship payoff |
| --- | --- | --- |
| 1 — Earn the pass | Trust the evidence, or protect Petra from a truthful correction? | Inspection-led Wellington judgment; Petra's response and the first sauce-help memory shape tomorrow |
| 2 — Standard under pace | Correct the sauce, or save the table's remaining patience? | Sauce correction has a real time/work cost; Dimitri's response distinguishes help from humiliation |
| 3 — Own the signature | Share credit for the Wellington, or make the house voice entirely yours? | Menu/recipe revision changes the next service; contributor credit and grudge/honor persist |
| 4 — The room outside | Spend attention on regulars, the critic or the failing brigade? | Table requests and coursing now affect hospitality independently of food quality |
| 5 — Rival terms | Buy peace with Beefcakes, or buy momentum and accept the runners? | Existing détente/rivalry choice changes tonight's theft pressure and later morning memory |
| 6 — Recovery | Push an exhausted cook, or protect the person needed tomorrow? | Trauma, morale and available help govern correction/cover capacity; Madame V judges food and care separately |
| 7 — A place at the table | Keep Table 101's ritual, or make the room easier to run? | Wobble/seating/move choice changes patience and regular memory; Anwar's family story can inform the menu |
| 8 — Who stays | Keep a trusted cook or take the rival's offer and the safer numbers? | Vow, honors, grudges and defections determine the final brigade and who can cover a station |
| 9 — Open the doors | Protect the signature, the people, or the room's reputation? | The final service combines actual recipe lineage, regulars and brigade state; ending names contributors and costs |

Nights 1–3 are standards/trust; 4–6 are outside pressure; 7–9 are accumulated
relationships and cost. Reaching ten stars remains a venue milestone, not an
automatic victory.



### M0: visible identity and production proof

- [ ] Establish the full kitchen's composition, colour/material treatment and
      authored forms against the active collage/linocut art; primitive stand-ins
      cannot pass as finished hero assets.
- [ ] Create canon references and expressive forms for all three cooks; inspect
      work, presentation and reaction clips with real tools and contact.
- [ ] Give every dish the milestone can serve its own representation and
      research sheet: recipe/version, sources, technique, cues and context.
- [ ] Prove quiet work, a busy overlap and recovery in motion, with spatial
      sound; review the whole room rather than a polished isolated corner.
- [ ] Select and record the baseline device/browser and capture initial frame,
      startup and memory measurements before claiming a performance improvement.

### M1: a playable signature, not only a new image

- [ ] Introduce authoritative dish condition shared by inspection, sound,
      presentation, scoring and review; retain assistance until evidence reads.
- [x] Implement independent station/ready/held lifecycles and consistent command
      targeting; exercise simultaneous completion, full capacity and recovery.
- [ ] Make physical inspection and one expert intervention informative and
      satisfying without forcing every plate through compulsory gestures.
- [ ] Stage a real choice between immediate service, correction and remake;
      its timing, food and relationship consequences must differ coherently.
- [ ] Connect cooks, runner and guests to actual service events, including
      assistance that can legitimately be unavailable or refused.
- [x] Preserve the direct opening, then demonstrate one bounded recipe revision
      with a contributor the next morning and its visible effect next service.
- [ ] Migrate saves for recipe/memory state; preserve existing careers and
      newer-save blocking, and test interrupted transitions.
- [ ] Verify both cameras, keyboard/mouse, pause/resume and laptop layouts;
      reduced effects must preserve dish evidence and character/critic tells.
- [ ] Measure the design doc's performance target through the opening and a
      representative rush; conduct a human listening and play session.

M0 is a production checkpoint. M1 is the first complete player-experience
checkpoint. Neither closes the full nine-night ambition or promotes existing
feature checks into proof of visual quality or fun.

## 1. Make reactions trustworthy

### Work

- [x] Record a bounded, structured history of service events at the actions that
  resolve them: plate judgments, screams, interventions, walkouts, inspector
  observations and responses.
- [x] Use recorded facts for the defining incident and next-morning consequence.
  Preserve aggregate service results when old events fall out of the history.
- [x] Give each critic one definition for their identity, introduction, observable
  tells, preferences and fact-dependent assessment.
- [x] Select the intended critic for each night explicitly. A saved critic from a
  previous night must not prevent the rotation.
- [x] Align visual and audio tells with the written clues. Gilliam uses a notebook;
  he must not emit camera flashes while claiming never to take photos.
- [x] Select review language from actual outcomes. No silent-service “mid-shout”
  cover, “no theatrics” after smashing, or claim that an unanswered test was passed.
- [x] Make the results hierarchy: one headline, one defining incident, one
  consequence for tomorrow; put supporting facts and statistics in details.
- [x] Carry the same facts into the copied review, spoken review and next morning.
- [x] Add targeted regression tests and inspect the player-facing review flow.

### Acceptance

- A quiet service, a destructive service, an unidentified inspector, an identified
  but unfed inspector and a staff walkout produce distinct, consistent reviews.
- A high star rating cannot erase a walkout or invent an action.
- Critics rotate at the intended night boundaries, including after loading an old
  save. Instructions, physical tells and text agree.
- Service history resets at a new service and remains bounded. Recording events
  does not consume the gameplay random stream.
- Review details remain reachable by keyboard and fit ordinary laptop heights.

### Implementation surface

`src/game/state.ts`, `src/game/barks.ts`, small pure modules for events/critics/review
selection, `src/scene/DiningRoom.tsx`, `src/hud/HUD.tsx`, `src/ui.css`.

Stage 1 keeps the existing scoring and economy. The scream incentive redesign is
stage 3. Record the current outcomes honestly before changing their balance.

## 2. Make plate judgment learnable

### Work

- [x] Give plates authoritative attributes for doneness, temperature, sauce and
  presentation; derive their assessment from those attributes.
- [ ] Let randomness influence cooking, with visible consequences, rather than
  secretly overturning the evidence available at judgment.
- [ ] Start with Wellington, scallops and soufflé, each with readable successful
  and defective states.
- [ ] Make inspection show useful evidence: cut surface, sauce separation,
  collapse or cooling.
- [ ] Replace answer labels with observations only after the corresponding visual
  evidence exists. Keep an optional explanatory assistance mode.
- [x] Give send-back a correction request. Distinguish justified correction from
  arbitrary rejection in the cook's response.
- [ ] Introduce an early tradeoff between serving an imperfect dish promptly and
  remaking it at a cost to the queue and cook.

### Acceptance

A new player can explain a plate decision without quoting a quality label. Serve
and remake each have reasonable uses. Evidence is legible in both camera modes
and never relies on colour alone.

### Implementation surface

`culinary.ts`, `finishPlating()` and `judge()` in `state.ts`; `FoodModel.tsx`,
`PlateCorrection.tsx`, `FirstPerson.tsx`, the plate-action HUD and dish assets.

## 3. Build an opening with confidence and attachment

### Sequence

1. Petra presents a readable plate; the guest response establishes success.
2. A visible defect introduces a consequential judgment.
3. A second station creates a small rush; controlled shouting has a visible use.
4. Petra intervenes in a developing problem and responds to the player's conduct.
5. The review recalls that incident and gives tomorrow a concrete concern.

### Work

- [x] Advance teaching beats through player actions. Start ordinary pressure
  after the first successful interaction.
- [x] Replace the already-aged opening pile with the introductory sequence.
- [ ] Move permanent residency modifiers to repeat-run setup.
- [x] Place the first consequential family meal on the following morning, once
  the player has met the cooks.
- [ ] Extend existing praise, grudges and keepsakes with a small relationship state
  and specific memories; avoid adding another mandatory management meter.
- [ ] Branch the character beat for acceptance, justified correction and humiliation.
- [ ] Replace the blanket two-scream cap with an observable critic reaction that
  contributes to the assessment. Teach speed benefit and accumulating morale cost.
- [ ] Keep the start CTA and essential controls visible at normal laptop and
  embedded viewport sizes.

### Acceptance

An unfamiliar player starts unaided, explains a consequential choice, remembers
Petra's response and has a concrete intention for tomorrow. Branches resolve
coherently without forcing a predetermined emotional outcome.

### Human first-service gate

Recruit unfamiliar players for the service, next morning and following service. Observe:
first action, first meaningful decision, misunderstood cues, remembered character
moment, intended next action and voluntary continuation. Record observations;
do not turn automated success rates into claims about fun or attachment.

## 4. Let the player conduct the brigade

### Work

- [x] Allow one active order per station, with one ready position per station and
  one plate held by the chef.
- [x] Make the lifecycle explicit:
  `rail → cooking → ready → held → resolved`.
- [x] Target start/fire/collect actions by ticket identity and judge the held plate.
- [ ] Replace every implicit “first matching plate” assumption in rules, HUD,
  audio cues and both camera modes.
- [ ] Share eligibility and selection logic between keyboard, pointer and
  first-person controls.
- [x] Show ready plates cooling so collection and coursing matter.
- [ ] Retune arrivals, cooking durations, overload, fires and patience together.

### Acceptance

The player can coordinate multiple cooks and serve a table together. Every
command's target is visible. Capacity, simultaneous completion, full ready
positions, held plates, walkouts, send-backs, expiry and pause/resume have explicit
behaviour. No plate disappears or is acted on by an unrelated control.

### Implementation surface

`state.ts`, `FirstPerson.tsx`, `RailDockets.tsx`, `KitchenScene.tsx`, `Cloche.tsx`,
`HUD.tsx`, and plating/sauce/audio cues. This is the largest gameplay refactor.

## 5. Match the illustrated promise in play

### Work

- [ ] Prove one cook and one dish treatment in the real player view before a batch.
- [ ] Carry the established illustrated palette and shapes into the cast and food.
- [ ] Give each cook a distinct silhouette, posture and working rhythm.
- [ ] Add readable order acknowledgment, plate presentation, correction, recovery,
  helping and departure actions.
- [ ] Stage keepsakes visibly, with enough room for the player to notice them.
- [ ] Improve hands and plate presentation at inspection distance.
- [ ] Move ordinary dialogue outside the central inspection area; anchor urgent
  cues to the relevant dish, station or guest.
- [ ] Extend distinct food representations to the whole menu.
- [ ] Reinforce actions with sound and perform a human listening pass.

### Acceptance

Cooks are distinguishable without labels, food defects read at play distance,
character payoffs survive busy service, and important action is not obscured by
dialogue. Verify in both camera modes and the embedded game.

### Production constraints

Use the existing art direction. Asset sourcing and any paid generation require a
concrete proposal and the applicable cost approval before spending. Character
asset/animation production is the largest remaining production uncertainty.

## 6. Give the residency an emotional progression

### Arc

- Nights 1–3: establish standards and earn the brigade's trust.
- Nights 4–6: success creates competing demands from rivals, press and guests.
- Nights 7–9: earlier choices determine who supports the chef and what success costs.

### Work

- [ ] Define one central dilemma and expected payoff for each night.
- [ ] Make coaching and meals answer recent incidents, with exact effects available
  in secondary explanations.
- [ ] Turn market/menu choices into different service plans using the revised
  station and food systems.
- [ ] Recombine existing feuds, regulars, vows and keepsakes around those dilemmas.
- [ ] End each night with a hook grounded in an unresolved event.
- [ ] Let endings acknowledge the brigade and relationships alongside the accounts.
- [x] Prove a bounded Wellington classic/herb revision, contributor credit and
  next-service memory. The morning also recalls helping Petra with its sauce.
- [ ] Extend supported recipe variations with observable preparation, food and
  timing consequences; credit contributors and preserve dish lineage.
- [ ] Give suppliers and regulars event-grounded continuity and selected physical
  traces in the restaurant; distinguish factual memory from decorative dressing.
- [ ] Research culinary versions and cultural context, with human review of claims
  before treating the content as validated.

### Acceptance

Different play styles produce recognisably different stories. A player can explain
why the next night matters beyond earning an upgrade. Verify the full residency
and its alternate outcomes after M1 has passed its human playtest.

## Engineering and verification

- Keep React, Three.js and Zustand. Extract pure rules where they need isolated
  tests; avoid a wholesale framework or store rewrite.
- Introduce versioned save migration when adding persistent fields. Old careers
  retain their progress; service-only event history need not become a saved replay.
- Target regression tests at actual risks: critic rotation, clues, review facts,
  plate evidence, relationship outcomes and station capacity.
- Run the production build after each completed implementation stage.
- Inspect the changed route in the browser, including keyboard input, pause/resume,
  camera fallback and laptop-height layout.
- Check the actual published iframe before calling an approved release shipped.
- Capture evidence from the exact code under review. Mark late-game, audio or human
  checks unverified when they have not been exercised.
- Keep implementation, local verification, human validation and publication as
  separate statuses. No automatic public deployment is part of this tracker.

## Priority follow-up: first-service entry (onboarding slice of stage 3)

User complaint (verbatim): *"the first two interfaces feel so verbose that i
immediately switching off - we need to think through the game design more
carefully and make things more intuitive so we dont need to do so much
explaining"*.

**Why this precedes stage 2.** The stage-1 review now tells a true story, but
the opening risks losing players before they reach it: the title card and the
night-1 briefing asked for a page of reading before the first action.
Intuition, not more explanation, is the fix — so the opening was rebuilt
around the actual pass before deeper work on plate judgment. Stage 2 stays
pending; this is the onboarding slice of stage 3 only.

### Checklist

- [x] Title = hero art + one action (TAKE THE PASS / CONTINUE) + a small Menu
  disclosure (controls, voice, PREP FIRST, NEW RESIDENCY, brigade bios, records).
  No splash carousel, cast bios, rules, stats or control paragraph by default.
- [x] `enterResidency` is the single entry for mouse and keyboard; it refuses a
  duplicate start while playing and keeps newer-save blocking.
- [x] Night 1 goes straight into the kitchen. The action-led entry remains:
  serve an honest Wellington, call a fresh ticket, and judge Petra's second
  plate before ordinary pressure resumes.
- [ ] Replace button sequencing with inspection-led judgment: the second plate's
  verdict controls unlock only after the player turns it, reads an observed
  defect and sees the house standard.
- [ ] Give each second-plate verdict an immediate, factual Petra response and a
  consequence that can be recalled the next morning.
- [ ] Keep the permanent utility rail off the first judgment; disclose service
  controls with the relevant object or event while retaining the on-demand
  Controls book.
- [x] While `openingStep` is non-null, waiting costs nothing: no service time,
  ticket aging, morale drain, misses, spawns, hazards or tells, and no
  unsolicited events — the player's own actions still record real events.
  Scream, flag, fire, comp, camera and the Space charge are inert.
- [x] Mouse stays free: night 1 begins `firstPerson: false` and stays cinematic;
  V still toggles first person after the opening.
- [x] Returning nights get a compact brigade card (cash/stars, names + one-word
  mood, optional family meal) with OPEN THE DOORS + KITCHEN BOOK. The old full
  prep (market, coaching, accounts, feud, vows, house rule, last-night story)
  is intact inside the book — optional, never compulsory.
- [x] The Controls glossary is a real modal everywhere: it pauses service while
  open, owns all keyboard input (Escape/? or its button close it, Tab stays
  inside), and restores pause state on close.

### Status

**Historical verification (21 Nov)** — the direct-entry slice passed 44
`service-review.test.ts` cases and a production build; the rebuilt preview was
exercised with real mouse/keyboard input at 1280×720 and 1024×600. This proves
the earlier route, not the inspection-led correction now in progress. Evidence
from that build remains in `docs/devlog/media/opening/`.

### Limitations

- The earlier opening plates were deliberately consistent (80 → 76) and taught
  verbs. The active correction replaces that sequence with an observable defect
  and an inspection gate.
- Meal timing/onboarding is in; character branching payoff and the scream
  incentive redesign in stage 3 are still pending.
- No claim of emotional attachment solved; no human playtest yet; no deployment.

## Evidence and handoff log

| Date | Stage | Result | Evidence / limitations |
| --- | --- | --- | --- |
| 2026-11-21 | Plan | Agreed and recorded | Based on published opening, assisted local first service, both camera views and source review. Full residency and human audio judgment remain unverified. |
| 2026-11-21 | 1 | In progress | Initial focus: event history, critic consistency and factual review presentation. |
| 2026-11-21 | 1 | Verified locally | Implemented: `src/game/serviceEvents.ts` (bounded event history, 128 cap, no RNG), `src/game/critics.ts` (one persona definition, N1–5 Gilliam / N6–8 Madame V / N9 Kid), `src/game/serviceReview.ts` (factual story + `nightAccounts`); save envelope versioned v1 with v0 migration; `lastReview` drives the next-morning LAST NIGHT panel; persona-specific tells in `DiningRoom.tsx` (notebook / inspect-lean / phone+flash); review card rebuilt around headline → incident → consequence with details disclosure. QA pass fixed: scream chorus text restored; newer-version saves now show a title alert, disable start/reset and are never deleted (re-read on next start so a corrected save recovers); closing tick commits all per-tick fields and folklore criticQ into the review; zero-star walkouts use their own headline; expired-order stats renamed; chef-covered plates credit THE CHEF. Evidence: `npm run test -- src/game/service-review.test.ts` 27/27 pass; `npm run build` clean; assisted browser run on preview (title → briefing → service → review → morning) with screenshots; keyboard details expansion does not advance; buttons inside 1280×720 and 1024×600; notebook (Gilliam) and phone (Kid, staged night-9 save) tell lines confirmed in feed; staged newer-save title warning captured as a fixed banner inside the viewport at both sizes (an earlier capture had it hidden inside the overflowing title panel — corrected). Evidence receipt and captures in `docs/devlog/media/stage1/`. Limitations: physical tell-mesh readability at preview zoom unverified; human playtest, full-residency run and audio judgment remain unverified; no public deploy performed. |

| 2026-11-21 | 3 (slice) | Verified locally | Opening redesign implemented and browser-verified: lean title (hero + one CTA + Menu disclosure), `enterResidency` single entry, night 1 drops straight into service with a two-action taught-by-doing opening (`openingStep` serve → call → judge; wait-freeze, guards on scream/flag/fire/comp/camera, cinematic camera kept), returning-night compact briefing with optional KITCHEN BOOK holding all prior prep, modal Controls glossary that pauses and owns input. Tests 44/44; build clean; captures + receipt in `docs/devlog/media/opening/`. Limitations: opening plates use fixed qualities (not a judgment model — stage 2 pending); stage-3 character payoff and scream incentives pending; no human playtest; no deploy. |

## 22 November implementation checkpoint

The first connected route is recorded in
[the local proof receipt](devlog/flagship-local-proof.md): concurrent stations,
cooling/collection, condition-based judgment, timed sauce correction, table
delivery, a factual review, Petra's morning callback, and a credited herb-finish
Wellington in the following service. The rules suite reached 59 passing tests.
Scene/UI follow-ups fixed sauce occlusion, overlapping actions, unreadable
disabled tickets, plate/hand pose timing and owned food-geometry disposal.

This closes implementation/reachability items, not M0/M1 acceptance. The
performance captures remain below target; the first-person whisk's full arm,
cast/material richness and motion need more work. The independent source review
could not judge images. No public deployment was performed.

## Next action

**Active correction (24 Nov):** implement C1–C8 from the
[critique-response register](#critique-response-implementation-register-24-nov)
before expanding scope. Work in this order: scoring/hospitality and tests;
service consequences; walkout continuity; inspection-led opening and contextual
controls; nine-night conditions and relationship-aware ending; full regression,
build and browser verification. No new verbs, generation jobs or deployments
are authorized by this plan.

The owner has now praised the collage faces and reiterated the need for a busy,
immersive kitchen, with generation credits available. Preserve those faces and
the accepted opening. Follow the
[kitchen production plan](kitchen-production-plan.md) for the next whole-room
milestone: authored bodies/actions, functional station equipment, food detail,
runner/porter traffic and synchronized spatial sound. This is proposed work;
no new generation jobs have been started.

The connected route now works locally. Review it against the artwork and observe
unfamiliar players before calling M0/M1 accepted. The largest open areas are the
cast's authored motion and materials, food readability without explanatory text,
cultural research, service pressure, physical embodiment, audio judgment and the
60 Hz performance proof. Pointer-lock interaction, mobile, extended memory soak
and the published iframe still need their own evidence.

Local verification is recorded in
[the flagship receipt](devlog/flagship-local-proof.md). Its governing specification is the
[flagship direction](design.md#flagship-direction--culinary-authorship-and-a-living-restaurant).

The [Codrops study](research/codrops-kitchen-experience.md) remains a reference
library; its single-station proposal is superseded. The clean opening stays.
The larger nine-night authorship, supplier/guest continuity and final-night
culmination remain planned work; this first implementation does not close them.
